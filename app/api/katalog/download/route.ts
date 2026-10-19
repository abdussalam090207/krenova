// app/api/katalog/download/route.ts — GET: redirect ke signed URL unduhan
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loadOrder } from "@/lib/server/orders";
import { signedDownload } from "@/lib/server/delivery";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code    = searchParams.get("code") ?? "";
  const token   = searchParams.get("t") ?? "";
  const assetId = searchParams.get("asset") ?? "";

  if (!code || !token || !assetId) return json({ error: "not_found" }, 404);

  const order = await loadOrder(code, token);
  if (!order) return json({ error: "not_found" }, 404);

  const result = await signedDownload(order, assetId);

  if ("error" in result) {
    return json({ error: result.error }, result.status);
  }

  // 302 ke signed URL (60 detik); browser tidak menyimpan redirect
  return NextResponse.redirect(result.url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() { return json({ error: "Method not allowed" }, 405); }
