// lib/server/email.ts — Kirim email notifikasi ganda via Resend (Atomic Claim & Anti-Spam)
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

// In-memory lock per order ID untuk mencegah konkurensi di runtime yang sama
const activeOrderLocks = new Set<string>();

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
 * Menggunakan mekanisme ATOMIC CLAIM (Compare-and-Swap di PostgreSQL) + Mutex Lock:
 * Dijamin 100% IDEMPOTEN & BEBAS SPAM meskipun webhook dan polling tiba bersamaan.
 */
export async function onOrderPaid(order: OrderRow): Promise<void> {
  const orderId = order.id;

  // 1. Guard in-memory: cegah eksekusi paralel pada proses/instance yang sama
  if (activeOrderLocks.has(orderId)) {
    console.log(`[onOrderPaid] Skip order ${order.order_code}: proses email sedang berjalan di memori.`);
    return;
  }

  activeOrderLocks.add(orderId);

  try {
    const paidAt = formatWaktu(order.paid_at ?? new Date().toISOString());
    const token = orderToken(order.order_code, order.token_version);
    const link = orderLink(order.order_code, order.token_version);

    const nowIso = new Date().toISOString();

    // ── 1. Task Email ke Pembeli (Atomic Claim) ──────────────────────────
    const sendBuyer = async () => {
      // ATOMIC CLAIM: Update database HANYA jika email_buyer_sent_at masih NULL.
      // Database PostgreSQL menjamin hanya 1 request yang berhasil mendapatkan row ini!
      const { data: claimedBuyer, error: claimBuyerErr } = await supabaseAdmin
        .from("catalog_orders")
        .update({
          email_buyer_sent_at: nowIso,
          email_error: null,
        })
        .eq("id", orderId)
        .is("email_buyer_sent_at", null)
        .select("id")
        .maybeSingle();

      if (claimBuyerErr) {
        console.error(`[onOrderPaid] Gagal atomic claim buyer email (${order.order_code}):`, claimBuyerErr);
        return;
      }

      // Jika null, berarti proses/request lain sudah mengklaim atau sudah mengirim email ini
      if (!claimedBuyer) {
        console.log(`[onOrderPaid] Buyer email sudah pernah diklaim/terkirim untuk pesanan ${order.order_code}. Skip.`);
        return;
      }

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

        if (!result.ok) {
          // Jika pengiriman gagal, lepas atomic claim agar bisa dicoba ulang (reconcile / manual)
          await supabaseAdmin
            .from("catalog_orders")
            .update({
              email_buyer_sent_at: null,
              email_error: `[Buyer Email] ${String(result.error ?? "").slice(0, 250)}`,
            })
            .eq("id", orderId);

          try {
            await supabaseAdmin.from("catalog_notifications").insert({
              type: "email_failed",
              order_id: orderId,
              title: "Email pembeli gagal dikirim",
              body: `Pesanan #${order.order_code} (${order.buyer_email}): ${String(result.error ?? "").slice(0, 200)}`,
              meta: { order_code: order.order_code, buyer_email: order.buyer_email, error: result.error },
            });
          } catch {}
        }
      } catch (err) {
        // Lepas claim jika terjadi exception fatal
        await supabaseAdmin
          .from("catalog_orders")
          .update({
            email_buyer_sent_at: null,
            email_error: `[Buyer Email Exception] ${err instanceof Error ? err.message : String(err)}`,
          })
          .eq("id", orderId);

        console.error(`[onOrderPaid Buyer Exception] Pesanan #${order.order_code}:`, err);
      }
    };

    // ── 2. Task Email ke Admin (Atomic Claim) ─────────────────────────────
    const sendAdmin = async () => {
      // ATOMIC CLAIM: Update database HANYA jika email_admin_sent_at masih NULL.
      const { data: claimedAdmin, error: claimAdminErr } = await supabaseAdmin
        .from("catalog_orders")
        .update({
          email_admin_sent_at: nowIso,
        })
        .eq("id", orderId)
        .is("email_admin_sent_at", null)
        .select("id")
        .maybeSingle();

      if (claimAdminErr) {
        console.error(`[onOrderPaid] Gagal atomic claim admin email (${order.order_code}):`, claimAdminErr);
        return;
      }

      if (!claimedAdmin) {
        console.log(`[onOrderPaid] Admin email sudah pernah diklaim/terkirim untuk pesanan ${order.order_code}. Skip.`);
        return;
      }

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

        if (!result.ok) {
          // Lepas claim agar bisa retry bila gagal kirim
          await supabaseAdmin
            .from("catalog_orders")
            .update({ email_admin_sent_at: null })
            .eq("id", orderId);

          console.error(`[Email Admin Failed] Pesanan #${order.order_code}: ${result.error}`);
        }
      } catch (err) {
        await supabaseAdmin
          .from("catalog_orders")
          .update({ email_admin_sent_at: null })
          .eq("id", orderId);

        console.error(`[onOrderPaid Admin Exception] Pesanan #${order.order_code}:`, err);
      }
    };

    // Jalankan kedua pengiriman
    await Promise.allSettled([sendBuyer(), sendAdmin()]);
  } catch (outerErr) {
    console.error(`[onOrderPaid General Exception] Pesanan #${order.order_code}:`, outerErr);
  } finally {
    // Selalu hapus lock in-memory saat selesai
    activeOrderLocks.delete(orderId);
  }
}
