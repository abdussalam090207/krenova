import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleCorsOptions, getCorsHeaders } from "@/lib/server/admin-auth";
import { deleteKeys, assertSafeKey } from "@/lib/server/r2";

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
  let body: { bucket?: string; keys?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format request body tidak valid (harus JSON)." },
      { status: 400, headers: corsHeaders },
    );
  }

  const { bucket, keys } = body;

  if (!bucket || (bucket !== "public" && bucket !== "private")) {
    return NextResponse.json(
      { error: "Parameter 'bucket' harus bernilai 'public' atau 'private'." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json(
      { error: "Parameter 'keys' harus berupa array string tidak kosong." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (keys.length > 200) {
    return NextResponse.json(
      { error: "Maksimal 200 objek per permintaan penghapusan." },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const normalizedKeys = keys.map((raw) => {
      let k = (raw || "").trim().replace(/^\/+/, "");
      // Jika public bucket dan belum diawali projects/ atau products/
      if (bucket === "public" && !k.startsWith("projects/") && !k.startsWith("products/")) {
        k = `projects/${k}`;
      }
      return k;
    });

    for (const key of normalizedKeys) {
      assertSafeKey(key);
      if (bucket === "public" && !key.startsWith("projects/") && !key.startsWith("products/")) {
        return NextResponse.json(
          { error: `Key '${key}' tidak diizinkan di bucket public.` },
          { status: 400, headers: corsHeaders },
        );
      }
      if (bucket === "private" && !key.startsWith("products/")) {
        return NextResponse.json(
          { error: `Key '${key}' tidak diizinkan di bucket private.` },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const deleted = await deleteKeys(bucket, normalizedKeys);

    return NextResponse.json({ deleted }, { headers: corsHeaders });
  } catch (err: unknown) {
    console.error("[delete storage error]", err);
    return NextResponse.json(
      { error: "Gagal menghapus objek di penyimpanan." },
      { status: 500, headers: corsHeaders },
    );
  }
}
