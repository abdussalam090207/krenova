// app/api/katalog/reconcile/route.ts — POST: rekonsiliasi status langsung ke DOKU
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loadOrder, applyGatewayStatus, getDokuStatus } from "@/lib/server/orders";
import { onOrderPaid } from "@/lib/server/email";
import { allow } from "@/lib/server/rate-limit";
import { catalogConfig } from "@/config/catalog";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return json({ error: "Bad request" }, 400);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { code, t: token } = body as { code?: unknown; t?: unknown };
  if (typeof code !== "string" || !code) return json({ error: "not_found" }, 404);
  if (typeof token !== "string" || !token) return json({ error: "not_found" }, 404);

  const order = await loadOrder(code, token);
  if (!order) return json({ error: "not_found" }, 404);

  // Batas laju: 1 kali per 15 detik per pesanan
  const ok = await allow("reconcile", order.id, ...catalogConfig.limits.reconcilePerOrder);
  if (!ok) return json({ error: "rate_limited" }, 429);

  // Jika pesanan bukan pending lagi
  if (order.status !== "pending") {
    // Jika sudah lunas tetapi ada email yang belum terkirim, coba kirim ulang
    if (order.status === "paid" && (!order.email_buyer_sent_at || !order.email_admin_sent_at)) {
      try {
        await onOrderPaid(order);
      } catch (err) {
        console.error("[Katalog Reconcile Email Error]", err);
      }
    }
    return json({ status: order.status });
  }

  // Jika waktu pembayaran sudah habis (expired):
  if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
    const { expireOrder } = await import("@/lib/server/orders");
    await expireOrder(order);
    return json({ status: "expired" });
  }

  try {
    // Gunakan invoice_number aktif (bisa ada suffix metode pembayaran)
    const targetInvoice =
      order.gateway_payment_type && order.gateway_payment_type !== "qris"
        ? `${order.order_code}-${order.gateway_payment_type}`
        : order.order_code;

    const statusResult = await getDokuStatus(targetInvoice);
    const result       = await applyGatewayStatus(order, statusResult);

    // Kirim email HANYA jika baru saja terjadi transisi ke paid (idempoten via DB claim)
    if (result.transitioned && result.newStatus === "paid") {
      const updated = { ...order, status: "paid" as const };
      try {
        await onOrderPaid(updated);
      } catch (err) {
        console.error("[Katalog Reconcile Email Error]", err);
      }
    }

    return json({ status: result.newStatus, paid: result.newStatus === "paid" });
  } catch (err) {
    console.error("[reconcile error]", err);
    return json({ error: "gateway_error", status: order.status }, 502);
  }
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
