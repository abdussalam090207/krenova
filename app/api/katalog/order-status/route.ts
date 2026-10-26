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

  // Kembalikan hanya status dan expiresAt — tanpa trigger email.
  // Pengiriman email ditangani ATOMIK oleh: webhook DOKU atau orders/check saat transisi terjadi.
  return json({ status: order.status, expiresAt: order.expires_at });
}

export async function POST() { return json({ error: "Method not allowed" }, 405); }
