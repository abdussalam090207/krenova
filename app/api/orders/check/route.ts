// app/api/orders/check/route.ts — Handler pengecekan status pesanan manual / rekonsiliasi
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { applyGatewayStatus, loadOrder, getDokuStatus, type OrderRow } from "@/lib/server/orders";
import { onOrderPaid } from "@/lib/server/email";
import { maskEmail } from "@/lib/catalog/format";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

async function checkAndReconcileOrder(orderCode: string, token?: string | null) {
  let order: OrderRow | null = null;

  if (token) {
    order = await loadOrder(orderCode, token);
  } else {
    const { data } = await supabaseAdmin
      .from("catalog_orders")
      .select("*")
      .eq("order_code", orderCode)
      .single<OrderRow>();
    order = data ?? null;
  }

  if (!order) {
    return { error: "Pesanan tidak ditemukan.", httpStatus: 404 };
  }

  let currentStatus = order.status;

  // Jika pesanan masih pending, verifikasi langsung ke DOKU API
  if (order.status === "pending") {
    // Jika waktu pembayaran sudah habis
    if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
      const { expireOrder } = await import("@/lib/server/orders");
      await expireOrder(order);
      return {
        ok: true,
        order_code:    order.order_code,
        product_title: order.product_title,
        status:        "expired",
        paid:          false,
        amount_idr:    order.amount_idr,
        buyer_email:   order.buyer_email ? maskEmail(order.buyer_email) : undefined,
        message:       "Waktu pembayaran telah habis (expired).",
      };
    }

    try {
      // Gunakan invoice number yang aktif (bisa ada suffix metode pembayaran)
      const targetInvoice =
        order.gateway_payment_type && order.gateway_payment_type !== "qris"
          ? `${order.order_code}-${order.gateway_payment_type}`
          : order.order_code;

      let statusResult: Awaited<ReturnType<typeof getDokuStatus>> | null = null;
      try {
        statusResult = await getDokuStatus(targetInvoice);
      } catch {
        // Fallback ke base invoice_number
        statusResult = await getDokuStatus(order.order_code).catch(() => null);
      }

      if (statusResult) {
        const result = await applyGatewayStatus(order, statusResult);
        currentStatus = (result.newStatus as OrderRow["status"]) ?? order.status;

        // Jika berpindah status ke paid, kirim email notifikasi
        if (
          result.transitioned ||
          (result.newStatus === "paid" && (!order.email_buyer_sent_at || !order.email_admin_sent_at))
        ) {
          const updated = { ...order, status: "paid" as const };
          try {
            await onOrderPaid(updated);
          } catch (emailErr) {
            console.error("[orders/check] Gagal mengirim notifikasi email:", emailErr);
          }
        }
      }
    } catch (dokuErr) {
      console.error("[orders/check] Gagal mengambil status DOKU:", dokuErr);
    }
  } else if (order.status === "paid") {
    // Jika sudah paid tetapi email notifikasi belum terkirim
    if (!order.email_buyer_sent_at || !order.email_admin_sent_at) {
      try {
        await onOrderPaid(order);
      } catch (emailErr) {
        console.error("[orders/check] Gagal mengirim ulang email:", emailErr);
      }
    }
  }

  return {
    ok: true,
    order_code:    order.order_code,
    product_title: order.product_title,
    status:        currentStatus,
    paid:          currentStatus === "paid",
    amount_idr:    order.amount_idr,
    buyer_email:   order.buyer_email ? maskEmail(order.buyer_email) : undefined,
    message:
      currentStatus === "paid"
        ? "Pesanan berhasil diverifikasi lunas dan email notifikasi telah diproses."
        : `Status transaksi saat ini: ${currentStatus}`,
  };
}


export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code") || searchParams.get("order_id");
  const token = searchParams.get("t");

  if (!code) {
    return json({ ok: false, error: "Parameter 'code' atau 'order_id' wajib disertakan." }, 400);
  }

  try {
    const result = await checkAndReconcileOrder(code.trim(), token?.trim());
    if ("error" in result) {
      return json({ ok: false, error: result.error }, result.httpStatus);
    }
    return json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders/check GET Error]", err);
    return json({ ok: false, error: "Terjadi kesalahan server saat memeriksa pesanan.", details: msg }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const code = (body.code || body.order_id || req.nextUrl.searchParams.get("code") || req.nextUrl.searchParams.get("order_id")) as string | undefined;
    const token = (body.t || body.token || req.nextUrl.searchParams.get("t")) as string | undefined;

    if (!code || typeof code !== "string") {
      return json({ ok: false, error: "Field 'code' atau 'order_id' wajib diisi." }, 400);
    }

    const result = await checkAndReconcileOrder(code.trim(), token?.trim());
    if ("error" in result) {
      return json({ ok: false, error: result.error }, result.httpStatus);
    }
    return json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders/check POST Error]", err);
    return json({ ok: false, error: "Terjadi kesalahan server saat memeriksa pesanan.", details: msg }, 500);
  }
}
