// lib/server/email.ts — Kirim email notifikasi ganda via Resend
import "server-only";
import { Resend } from "resend";
import { env } from "./env";
import { supabaseAdmin } from "./supabase-admin";
import { orderLink, orderToken } from "./tokens";
import { getDeliverables } from "./delivery";
import {
  buyerEmailHtml,
  buyerEmailText,
  adminEmailHtml,
  adminEmailText,
  type EmailDeliverableFile,
} from "./email-templates";
import { formatWaktu } from "@/lib/catalog/format";
import type { OrderRow } from "./orders";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Kirim email tunggal via Resend dengan penanganan try-catch lengkap.
 * Tidak pernah melempar exception agar proses pemanggil tidak crash.
 */
export async function sendEmail(p: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      ...p,
    });

    if (error) {
      console.error(`[Resend Error] Gagal mengirim email ke ${p.to}:`, error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Resend Exception] Terjadi kendala saat mengirim email ke ${p.to}:`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Kirim email notifikasi ganda (ke Pembeli dan Admin) setelah pesanan lunas.
 * Idempoten: lewati bila email_buyer_sent_at / email_admin_sent_at sudah terisi.
 * Kegagalan email tidak akan membatalkan status lunas transaksi.
 */
export async function onOrderPaid(order: OrderRow): Promise<void> {
  try {
    const paidAt = formatWaktu(order.paid_at ?? new Date().toISOString());
    const token = orderToken(order.order_code, order.token_version);
    const link = orderLink(order.order_code, order.token_version);

    // Ambil data status terbaru dari DB untuk mengantisipasi concurrent webhook calls
    const { data: freshOrder } = await supabaseAdmin
      .from("catalog_orders")
      .select("email_buyer_sent_at, email_admin_sent_at")
      .eq("id", order.id)
      .single();

    const buyerAlreadySent = Boolean(freshOrder?.email_buyer_sent_at || order.email_buyer_sent_at);
    const adminAlreadySent = Boolean(freshOrder?.email_admin_sent_at || order.email_admin_sent_at);

    if (buyerAlreadySent && adminAlreadySent) return;

    // ── 1. Task Email ke Pembeli ─────────────────────────────────────
    const sendBuyer = async () => {
      if (buyerAlreadySent) return;
      try {
        const deliverables = await getDeliverables(order);

        const files: EmailDeliverableFile[] = deliverables.files.map((f) => ({
          ...f,
          downloadUrl: `${env.SITE_URL}/api/katalog/download?code=${encodeURIComponent(order.order_code)}&t=${encodeURIComponent(token)}&asset=${encodeURIComponent(f.id)}`,
        }));

        const primaryDownloadUrl = files.length > 0 ? files[0].downloadUrl : link;
        const customerSubject = `Pesanan Berhasil #${order.order_code} - KRENOVA Studio`;

        const result = await sendEmail({
          to: order.buyer_email,
          subject: customerSubject,
          html: buyerEmailHtml({
            name: order.buyer_name,
            title: order.product_title,
            orderCode: order.order_code,
            amountIdr: order.amount_idr,
            orderLink: link,
            downloadUrl: primaryDownloadUrl,
            files,
            links: deliverables.links,
            paidAt,
          }),
          text: buyerEmailText({
            name: order.buyer_name,
            title: order.product_title,
            orderCode: order.order_code,
            amountIdr: order.amount_idr,
            orderLink: link,
            downloadUrl: primaryDownloadUrl,
            files,
            links: deliverables.links,
            paidAt,
          }),
        });

        await supabaseAdmin
          .from("catalog_orders")
          .update(
            result.ok
              ? { email_buyer_sent_at: new Date().toISOString(), email_error: null }
              : { email_error: `[Buyer Email] ${String(result.error ?? "").slice(0, 250)}` },
          )
          .eq("id", order.id);

        if (!result.ok) {
          try {
            await supabaseAdmin.from("catalog_notifications").insert({
              type: "email_failed",
              order_id: order.id,
              title: "Email pembeli gagal dikirim",
              body: `Pesanan #${order.order_code} (${order.buyer_email}): ${String(result.error ?? "").slice(0, 200)}`,
              meta: { order_code: order.order_code, buyer_email: order.buyer_email, error: result.error },
            });
          } catch {
            // fire-and-forget
          }
        }
      } catch (err) {
        console.error(`[onOrderPaid Buyer Exception] Pesanan #${order.order_code}:`, err);
      }
    };

    // ── 2. Task Email ke Admin (krenovastudio26@gmail.com) ────────────
    const sendAdmin = async () => {
      if (adminAlreadySent) return;
      try {
        const adminSubject = `[NEW ORDER] #${order.order_code} Lunas!`;

        const result = await sendEmail({
          to: env.ADMIN_NOTIFY_EMAIL,
          subject: adminSubject,
          html: adminEmailHtml({
            title: order.product_title,
            orderCode: order.order_code,
            orderType: order.order_type,
            amountIdr: order.amount_idr,
            buyerName: order.buyer_name,
            buyerEmail: order.buyer_email,
            paidAt,
          }),
          text: adminEmailText({
            title: order.product_title,
            orderCode: order.order_code,
            orderType: order.order_type,
            amountIdr: order.amount_idr,
            buyerName: order.buyer_name,
            buyerEmail: order.buyer_email,
            paidAt,
          }),
        });

        if (result.ok) {
          await supabaseAdmin
            .from("catalog_orders")
            .update({ email_admin_sent_at: new Date().toISOString() })
            .eq("id", order.id);
        } else {
          console.error(`[Email Admin Failed] Pesanan #${order.order_code}: ${result.error}`);
        }
      } catch (err) {
        console.error(`[onOrderPaid Admin Exception] Pesanan #${order.order_code}:`, err);
      }
    };

    // Eksekusi kedua email secara paralel agar admin email tidak tertunda atau terputus
    await Promise.allSettled([sendBuyer(), sendAdmin()]);
  } catch (outerErr) {
    console.error(`[onOrderPaid General Exception] Pesanan #${order.order_code}:`, outerErr);
  }
}

