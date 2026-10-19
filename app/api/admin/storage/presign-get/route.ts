import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleCorsOptions, getCorsHeaders } from "@/lib/server/admin-auth";
import { presignGetPrivate, assertSafeKey } from "@/lib/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  const res = handleCorsOptions(req);
  return res || new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  // 1. Verifikasi Admin
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.corsHeaders },
    );
  }

  // 2. Baca Body
  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format request body tidak valid (harus JSON)." },
      { status: 400, headers: corsHeaders },
    );
  }

  const { key } = body;
  if (!key || typeof key !== "string") {
    return NextResponse.json(
      { error: "Parameter 'key' wajib diisi." },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    assertSafeKey(key);
    if (!key.startsWith("products/")) {
      return NextResponse.json(
        { error: "Akses hanya diizinkan untuk file produk privat (prefix products/)." },
        { status: 400, headers: corsHeaders },
      );
    }

    const fileName = key.split("/").pop() || "file";
    const url = await presignGetPrivate(key, fileName, 60);

    return NextResponse.json({ url }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error("[presign-get error]", err);
    return NextResponse.json(
      { error: "Gagal membuat URL pratinjau file privat." },
      { status: 500, headers: corsHeaders },
    );
  }
}
