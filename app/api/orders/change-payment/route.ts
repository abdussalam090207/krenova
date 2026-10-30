// app/api/orders/change-payment/route.ts — Ganti metode pembayaran di halaman pembayaran
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { switchOrderPaymentMethod } from "@/lib/server/orders";
import type { PaymentMethod } from "@/lib/catalog/types";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

const VALID_METHODS = new Set<string>([
  "qris",
  "bri_va",
  "mandiri_bill",
  "bni_va",
  "indomaret",
  "alfamart",
]);

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const code = (body.code || body.order_id || req.nextUrl.searchParams.get("code")) as string | undefined;
    const token = (body.t || body.token || req.nextUrl.searchParams.get("t")) as string | undefined;
    const method = (body.paymentMethod || body.method || req.nextUrl.searchParams.get("method")) as string | undefined;

    if (!code || typeof code !== "string") {
      return json({ ok: false, error: "Field 'code' wajib diisi." }, 400);
    }
    if (!token || typeof token !== "string") {
      return json({ ok: false, error: "Token akses tidak valid." }, 403);
    }
    if (!method || !VALID_METHODS.has(method)) {
      return json({ ok: false, error: "Metode pembayaran tidak valid." }, 400);
    }

    const result = await switchOrderPaymentMethod(code.trim(), token.trim(), method as PaymentMethod);

    return json(result, result.ok ? 200 : 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders/change-payment POST Error]", err);
    return json({ ok: false, error: "Terjadi kesalahan server saat mengganti metode pembayaran.", details: msg }, 500);
  }
}
