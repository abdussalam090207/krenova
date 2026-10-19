// app/api/katalog/order-status/route.ts — GET: status pesanan (hanya untuk polling)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loadOrder } from "@/lib/server/orders";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code") ?? "";
  const token = searchParams.get("t") ?? "";

  if (!code || !token) return json({ error: "not_found" }, 404);

  const order = await loadOrder(code, token);
  if (!order) return json({ error: "not_found" }, 404);

  // Jika pesanan sudah paid namun email belum terkirim, picu pengiriman
  if (order.status === "paid" && (!order.email_buyer_sent_at || !order.email_admin_sent_at)) {
    import("@/lib/server/email")
      .then(({ onOrderPaid }) => onOrderPaid(order))
      .catch((err) => console.error("[order-status] Email dispatch error:", err));
  }

  // Hanya kembalikan status dan expiresAt — tidak ada data produk/pembeli
  return json({ status: order.status, expiresAt: order.expires_at });
}

export async function POST() { return json({ error: "Method not allowed" }, 405); }
