// lib/server/env.ts — Validasi env vars wajib saat startup
// Server menolak berjalan bila variabel kosong
import "server-only";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.trim() === "") {
    throw new Error(
      `[KRENOVA] Environment variable "${name}" wajib diisi tetapi kosong atau tidak ada. ` +
      `Tambahkan ke .env.local (dev) atau Vercel Environment Variables (prod).`,
    );
  }
  return val.trim();
}

export const env = {
  SUPABASE_URL:          requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY:     requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  // Midtrans (dipertahankan untuk backward compatibility / webhook lama)
  MIDTRANS_SERVER_KEY:   process.env.MIDTRANS_SERVER_KEY ?? "",
  MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === "true",
  // DOKU Direct API
  DOKU_CLIENT_ID:        process.env.DOKU_CLIENT_ID ?? "",
  DOKU_SECRET_KEY:       process.env.DOKU_SECRET_KEY ?? "",
  DOKU_BASE_URL:         process.env.DOKU_BASE_URL ?? "https://api-sandbox.doku.com",
  DOKU_IS_PRODUCTION:    process.env.DOKU_IS_PRODUCTION === "true",
  RESEND_API_KEY:        requireEnv("RESEND_API_KEY"),
  EMAIL_FROM:            requireEnv("EMAIL_FROM"),
  ADMIN_EMAIL:           requireEnv("ADMIN_NOTIFY_EMAIL"),
  ADMIN_NOTIFY_EMAIL:    requireEnv("ADMIN_NOTIFY_EMAIL"),
  SITE_URL: (() => {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
    if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1")) {
      return "https://www.krenovas.my.id";
    }
    return raw.replace(/\/+$/, "");
  })(),
  CATALOG_SECRET:        requireEnv("CATALOG_SECRET"),

  // Cloudflare R2
  get R2_ACCOUNT_ID(): string { return requireEnv("R2_ACCOUNT_ID"); },
  get R2_ACCESS_KEY_ID(): string { return requireEnv("R2_ACCESS_KEY_ID"); },
  get R2_SECRET_ACCESS_KEY(): string { return requireEnv("R2_SECRET_ACCESS_KEY"); },
  R2_PUBLIC_BUCKET_NAME:  process.env.R2_PUBLIC_BUCKET_NAME || "catalog-media",
  R2_PRIVATE_BUCKET_NAME: process.env.R2_PRIVATE_BUCKET_NAME || "catalog-private",
  get NEXT_PUBLIC_R2_PUBLIC_URL(): string { return requireEnv("NEXT_PUBLIC_R2_PUBLIC_URL"); },
  ADMIN_ALLOWED_ORIGINS:  (process.env.ADMIN_ALLOWED_ORIGINS || "https://www.krenovas.my.id,https://krenovas.my.id,https://admin.krenovas.my.id,http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export function validateR2Env(): void {
  requireEnv("R2_ACCOUNT_ID");
  requireEnv("R2_ACCESS_KEY_ID");
  requireEnv("R2_SECRET_ACCESS_KEY");
  requireEnv("NEXT_PUBLIC_R2_PUBLIC_URL");
}
