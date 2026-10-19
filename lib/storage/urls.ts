// lib/storage/urls.ts — Helper URL media publik (aman untuk client dan server)

export type StorageBackend = "supabase" | "r2";
export type PublicBucket = "project-media" | "catalog-media";

/**
 * Membentuk URL publik media berdasarkan backend penyimpanan.
 * Jika path sudah berupa URL absolut (http/https), langsung dikembalikan.
 */
export function publicMediaUrl(
  backend: StorageBackend | null | undefined,
  bucket: PublicBucket,
  path: string | null | undefined,
): string | null {
  if (!path) return null;

  // Jika sudah berupa URL lengkap
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const safe = path.split("/").map(encodeURIComponent).join("/");
  const actualBackend = backend || "supabase";

  if (actualBackend === "r2") {
    const rawR2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/+$/, "");
    // Di Indonesia, domain *.r2.dev diblokir ISP / Internet Positif.
    // Jika masih memakai r2.dev atau kosong, fallback otomatis ke endpoint streaming lokal /api/media
    const r2Base = (!rawR2 || rawR2.includes(".r2.dev")) ? "/api/media" : rawR2;
    const prefix = bucket === "project-media" ? "projects/" : "";
    return `${r2Base}/${prefix}${safe}`;
  }

  const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  return `${supabaseBase}/storage/v1/object/public/${bucket}/${safe}`;
}
