import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const BUCKET = {
  public: process.env.R2_PUBLIC_BUCKET_NAME || "catalog-media",
  private: process.env.R2_PRIVATE_BUCKET_NAME || "catalog-private",
} as const;

let _r2: S3Client | null = null;

export function getR2(): S3Client {
  if (!_r2) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "[KRENOVA] Kredensial R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) wajib diisi tetapi belum ada di .env.local atau Vercel.",
      );
    }

    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return _r2;
}

/** Proxy r2 instance agar aman saat import dan divalidasi saat dipanggil */
export const r2 = new Proxy({} as S3Client, {
  get(_target, prop, receiver) {
    const client = getR2();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === "function" ? val.bind(client) : val;
  },
});

/**
 * Validasi key R2 agar aman dari path traversal dan format liar.
 * Karakter yang boleh: a-z 0-9 / _ - .
 * Harus diawali 'projects/' atau 'products/'.
 * Tanpa '..', tanpa '//', tanpa spasi.
 */
export function assertSafeKey(key: string): void {
  if (!key || typeof key !== "string") {
    throw new Error("Key objek tidak valid.");
  }
  if (key.includes("..") || key.includes("//") || /\s/.test(key)) {
    throw new Error("Key objek mengandung karakter berbahaya (.. // spasi).");
  }
  const keyRegex = /^(projects|products)\/[a-zA-Z0-9/_.\-]+$/;
  if (!keyRegex.test(key)) {
    throw new Error("Key objek tidak sesuai pola aman: " + key);
  }
}

/**
 * Buat presigned PUT URL untuk unggah langsung dari browser ke R2.
 */
export async function presignPut(
  bucket: "public" | "private",
  key: string,
  contentType: string,
  size: number,
): Promise<{ url: string; headers: Record<string, string> }> {
  assertSafeKey(key);

  const bucketName = BUCKET[bucket];
  const cacheControl =
    bucket === "public" ? "public, max-age=31536000, immutable" : undefined;

  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: cacheControl,
  });

  // Hanya tandatangani content-type agar browser tidak ditolak jika CORS R2 belum menyetel cache-control
  const signableHeaders = new Set(["content-type"]);

  const url = await getSignedUrl(getR2(), cmd, {
    expiresIn: 300, // 5 menit
    signableHeaders,
  });

  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };

  return { url, headers };
}

/**
 * Buat presigned GET URL untuk unduh file privat, umur 60 detik.
 */
export async function presignGetPrivate(
  key: string,
  fileName: string,
  seconds = 60,
): Promise<string> {
  assertSafeKey(key);

  const cleanFileName = fileName.replace(/[\r\n"]/g, "_");
  const cmd = new GetObjectCommand({
    Bucket: BUCKET.private,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(cleanFileName)}`,
  });

  return getSignedUrl(getR2(), cmd, { expiresIn: seconds });
}

/**
 * Hapus daftar key di R2 (batch per 1000 key).
 */
export async function deleteKeys(
  bucket: "public" | "private",
  keys: string[],
): Promise<number> {
  if (!keys || keys.length === 0) return 0;

  const bucketName = BUCKET[bucket];
  let totalDeleted = 0;

  for (const k of keys) {
    assertSafeKey(k);
    if (bucket === "public" && !k.startsWith("projects/") && !k.startsWith("products/")) {
      throw new Error(`Key ${k} tidak diizinkan di bucket public`);
    }
    if (bucket === "private" && !k.startsWith("products/")) {
      throw new Error(`Key ${k} tidak diizinkan di bucket private`);
    }
  }

  // Batch per 1000 objek
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const cmd = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: chunk.map((Key) => ({ Key })),
        Quiet: true,
      },
    });

    const res = await getR2().send(cmd);
    const deletedCount = chunk.length - (res.Errors?.length || 0);
    totalDeleted += Math.max(0, deletedCount);
  }

  return totalDeleted;
}

/**
 * Cek metadata objek di R2. Mengembalikan size & contentType atau null bila 404.
 */
export async function headKey(
  bucket: "public" | "private",
  key: string,
): Promise<{ size: number; contentType?: string } | null> {
  assertSafeKey(key);
  try {
    const cmd = new HeadObjectCommand({
      Bucket: BUCKET[bucket],
      Key: key,
    });
    const res = await getR2().send(cmd);
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType,
    };
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}
