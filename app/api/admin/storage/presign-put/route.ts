import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleCorsOptions, getCorsHeaders } from "@/lib/server/admin-auth";
import { presignPut } from "@/lib/server/r2";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const ALLOWED_VIDEOS = new Set([
  "video/mp4",
  "video/webm",
]);

const DANGEROUS_MIMES = new Set([
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
]);

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

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
  let body: {
    kind?: string;
    ownerId?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format request body tidak valid (harus JSON)." },
      { status: 400, headers: corsHeaders },
    );
  }

  const { kind, ownerId, fileName, contentType, size } = body;

  if (!kind || !["project-media", "catalog-media", "catalog-private"].includes(kind)) {
    return NextResponse.json(
      { error: "Parameter 'kind' tidak valid. Pilih: project-media, catalog-media, catalog-private." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!fileName || typeof fileName !== "string" || fileName.includes("..")) {
    return NextResponse.json(
      { error: "Nama file tidak valid atau mengandung path traversal." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!contentType || typeof contentType !== "string") {
    return NextResponse.json(
      { error: "Content-Type wajib diisi." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!size || typeof size !== "number" || size <= 0 || !Number.isInteger(size)) {
    return NextResponse.json(
      { error: "Ukuran file harus berupa bilangan bulat positif." },
      { status: 400, headers: corsHeaders },
    );
  }

  const uuid = crypto.randomUUID().replace(/-/g, "");

  // 3. Validasi & Penentuan Key berdasarkan kind
  let key = "";
  let dbPath = "";
  let bucket: "public" | "private" = "public";
  let publicUrl: string | undefined = undefined;

  const publicBaseUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/+$/, "");

  if (kind === "project-media") {
    bucket = "public";
    const isImage = ALLOWED_IMAGES.has(contentType);
    const isVideo = ALLOWED_VIDEOS.has(contentType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan: ${contentType}. Hanya format gambar & video (MP4/WebM) yang diterima.` },
        { status: 400, headers: corsHeaders },
      );
    }

    if (isImage && size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 8 MB." },
        { status: 400, headers: corsHeaders },
      );
    }
    if (isVideo && size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran video melebihi batas maksimal 100 MB." },
        { status: 400, headers: corsHeaders },
      );
    }

    const ext = MIME_EXT_MAP[contentType] || (isImage ? "webp" : "mp4");
    const subFolder = isImage ? "images" : "videos";

    key = `projects/${subFolder}/${uuid}.${ext}`;
    dbPath = `${subFolder}/${uuid}.${ext}`;
    publicUrl = `${publicBaseUrl}/${key}`;
  } else if (kind === "catalog-media") {
    bucket = "public";

    if (!ownerId || !/^[0-9a-fA-F-]{36}$/.test(ownerId)) {
      return NextResponse.json(
        { error: "ownerId wajib berupa UUID produk yang valid." },
        { status: 400, headers: corsHeaders },
      );
    }

    const isImage = ALLOWED_IMAGES.has(contentType);
    const isVideo = ALLOWED_VIDEOS.has(contentType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Tipe file media promosi tidak diizinkan: ${contentType}.` },
        { status: 400, headers: corsHeaders },
      );
    }

    if (isImage && size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran media promosi melebihi 8 MB." },
        { status: 400, headers: corsHeaders },
      );
    }
    if (isVideo && size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran video promosi melebihi 100 MB." },
        { status: 400, headers: corsHeaders },
      );
    }

    const ext = MIME_EXT_MAP[contentType] || (isImage ? "webp" : "mp4");
    key = `products/${ownerId}/${uuid}.${ext}`;
    dbPath = key;
    publicUrl = `${publicBaseUrl}/${key}`;
  } else if (kind === "catalog-private") {
    bucket = "private";

    if (!ownerId || !/^[0-9a-fA-F-]{36}$/.test(ownerId)) {
      return NextResponse.json(
        { error: "ownerId wajib berupa UUID produk yang valid." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (DANGEROUS_MIMES.has(contentType.toLowerCase())) {
      return NextResponse.json(
        { error: "Tipe file aktif berbahaya (HTML, SVG, JavaScript) dilarang untuk alasan keamanan." },
        { status: 400, headers: corsHeaders },
      );
    }

    if (size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file produk privat melebihi batas 500 MB." },
        { status: 400, headers: corsHeaders },
      );
    }

    const safeName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 80);

    key = `products/${ownerId}/${uuid}-${safeName}`;
    dbPath = key;
  }

  try {
    const { url: uploadUrl, headers } = await presignPut(
      bucket,
      key,
      contentType,
      size,
    );

    return NextResponse.json(
      {
        key,
        dbPath,
        bucket,
        uploadUrl,
        headers,
        publicUrl,
      },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error("[presign-put error]", err);
    return NextResponse.json(
      { error: "Gagal membuat URL unggah penyimpanan." },
      { status: 500, headers: corsHeaders },
    );
  }
}
