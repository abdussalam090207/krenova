import { NextRequest, NextResponse } from "next/server";
import { getR2, BUCKET, assertSafeKey } from "@/lib/server/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint penyaji media publik Cloudflare R2:
 * /api/media/projects/... atau /api/media/products/...
 *
 * Mengambil langsung dari Cloudflare R2 via endpoint S3 resmi
 * (tidak terkena blokir DNS r2.dev di Indonesia).
 * Dilengkapi dukungan Range Requests (streaming video) dan browser cache panjang.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const key = pathSegments.join("/");

  try {
    assertSafeKey(key);
  } catch {
    return new NextResponse("Invalid Key", { status: 400 });
  }

  const range = req.headers.get("range");

  try {
    const cmd = new GetObjectCommand({
      Bucket: BUCKET.public,
      Key: key,
      Range: range || undefined,
    });

    const res = await getR2().send(cmd);

    const headers = new Headers();
    if (res.ContentType) headers.set("Content-Type", res.ContentType);
    if (res.ContentLength !== undefined) headers.set("Content-Length", String(res.ContentLength));
    if (res.ContentRange) headers.set("Content-Range", res.ContentRange);
    if (res.ETag) headers.set("ETag", res.ETag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const status = res.ContentRange ? 206 : 200;

    // Stream body ke respons browser
    // @ts-expect-error res.Body is ReadableStream in Node runtime
    return new NextResponse(res.Body, {
      status,
      headers,
    });
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (error.name === "NotFound" || error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return new NextResponse("File Not Found in Storage", { status: 404 });
    }
    console.error("[api/media error]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
