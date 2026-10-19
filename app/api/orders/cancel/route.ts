// app/api/orders/cancel/route.ts — Handler pembatalan pesanan eksplisit / navigasi keluar
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/lib/server/orders";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

export async function POST(req: NextRequest) {
  try {
    let code: string | null = null;
    let token: string | null = null;

    const ct = req.headers.get("content-type") ?? "";

    if (ct.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      code = (body.code || body.order_id) as string | null;
      token = (body.t || body.token) as string | null;
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        code = (formData.get("code") || formData.get("order_id")) as string | null;
        token = (formData.get("t") || formData.get("token")) as string | null;
      }
    } else {
      // Menangani raw text dari navigator.sendBeacon
      const text = await req.text().catch(() => "");
      if (text) {
        try {
          const parsed = JSON.parse(text);
          code = (parsed.code || parsed.order_id) as string | null;
          token = (parsed.t || parsed.token) as string | null;
        } catch {
          // Mungkin berupa query string "code=xxx&t=yyy"
          const params = new URLSearchParams(text);
          code = params.get("code") || params.get("order_id");
          token = params.get("t") || params.get("token");
        }
      }
    }

    // Fallback jika dikirim via query string URL
    if (!code) {
      code = req.nextUrl.searchParams.get("code") || req.nextUrl.searchParams.get("order_id");
    }
    if (!token) {
      token = req.nextUrl.searchParams.get("t") || req.nextUrl.searchParams.get("token");
    }

    if (!code || typeof code !== "string") {
      return json({ ok: false, error: "Parameter 'code' atau 'order_id' wajib disertakan." }, 400);
    }

    const result = await cancelOrder(code.trim(), token ? token.trim() : null);

    return json(result, result.ok ? 200 : 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders/cancel POST Error]", err);
    return json({ ok: false, error: "Terjadi kesalahan server saat membatalkan pesanan.", details: msg }, 500);
  }
}
