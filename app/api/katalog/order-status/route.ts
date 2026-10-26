// app/api/katalog/order-status/route.ts — GET: status pesanan (hanya untuk polling)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loadOrder } from "@/lib/server/orders";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

// Guard in-memory: cegah dispatch email ganda saat polling cepat (tiap 3 dtk)
// onOrderPaid() sudah punya atomic-claim di DB, tapi guard ini mencegah
// banyak Promise menumpuk sebelum claim DB sempat selesai.
const emailDispatchingOrders = new Set<string>();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code") ?? "";
  const token = searchParams.get("t") ?? "";

  if (!code || !token) return json({ error: "not_found" }, 404);

  const order = await loadOrder(code, token);
  if (!order) return json({ error: "not_found" }, 404);

  // Jika pesanan sudah paid namun email belum terkirim, picu pengiriman SEKALI saja
  if (
    order.status === "paid" &&
    (!order.email_buyer_sent_at || !order.email_admin_sent_at) &&
    !emailDispatchingOrders.has(order.id)
  ) {
    emailDispatchingOrders.add(order.id);
    import("@/lib/server/email")
      .then(({ onOrderPaid }) => onOrderPaid(order))
      .catch((err) => console.error("[order-status] Email dispatch error:", err))
      .finally(() => emailDispatchingOrders.delete(order.id));
  }

  // Hanya kembalikan status dan expiresAt — tidak ada data produk/pembeli
  return json({ status: order.status, expiresAt: order.expires_at });
}

export async function POST() { return json({ error: "Method not allowed" }, 405); }
