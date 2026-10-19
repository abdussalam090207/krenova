import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleCorsOptions, getCorsHeaders } from "@/lib/server/admin-auth";
import { getR2, assertSafeKey, BUCKET } from "@/lib/server/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
  "video/quicktime",
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
  "video/quicktime": "mp4",
};

function normalizeContentType(rawMime: string, fileName: string): string {
  let m = (rawMime || "").toLowerCase().trim();
  if (m === "image/jpg" || m === "image/pjpeg") return "image/jpeg";
  if (!m || m === "application/octet-stream") {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "avif") return "image/avif";
    if (ext === "gif") return "image/gif";
    if (ext === "mp4") return "video/mp4";
    if (ext === "webm") return "video/webm";
    if (ext === "mov") return "video/quicktime";
  }
  return m;
}

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

  // 2. Baca FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Format request body tidak valid (harus multipart/form-data)." },
      { status: 400, headers: corsHeaders },
    );
  }

  const kind = formData.get("kind") as string | null;
  const ownerId = (formData.get("ownerId") as string | null) || undefined;
  const file = formData.get("file") as File | null;

  if (!kind || !["project-media", "catalog-media", "catalog-private"].includes(kind)) {
    return NextResponse.json(
      { error: "Parameter 'kind' tidak valid. Pilih: project-media, catalog-media, catalog-private." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "File tidak ditemukan dalam request." },
      { status: 400, headers: corsHeaders },
    );
  }

  const fileName = file.name || "file.bin";
  const size = file.size;
  const contentType = normalizeContentType(file.type, fileName);

  if (!fileName || fileName.includes("..")) {
    return NextResponse.json(
      { error: "Nama file tidak valid atau mengandung path traversal." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (size <= 0) {
    return NextResponse.json(
      { error: "Ukuran file tidak valid (file kosong)." },
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
        { error: `Tipe file tidak diizinkan: ${contentType}. Hanya format gambar & video (MP4/WebM/MOV) yang diterima.` },
        { status: 400, headers: corsHeaders },
      );
    }

    if (isImage && size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran gambar melebihi batas maksimal 15 MB." },
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

    if (isImage && size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran media promosi melebihi 15 MB." },
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

  assertSafeKey(key);

  try {
    const fileBytes = Buffer.from(await file.arrayBuffer());
    const bucketName = BUCKET[bucket];

    await getR2().send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBytes,
        ContentType: contentType,
        ContentLength: fileBytes.length,
        CacheControl: bucket === "public" ? "public, max-age=31536000, immutable" : undefined,
      }),
    );

    return NextResponse.json(
      {
        key,
        dbPath,
        bucket,
        publicUrl,
      },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error("[upload error to R2]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan file ke storage R2 via server." },
      { status: 500, headers: corsHeaders },
    );
  }
}
