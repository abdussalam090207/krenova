// lib/server/tokens.ts — Token akses pesanan (HMAC-SHA256, tidak disimpan)
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const sign = (label: string, value: string): string =>
  createHmac("sha256", env.CATALOG_SECRET)
    .update(`${label}:${value}`)
    .digest("base64url");

/** Hitung token untuk satu pesanan. Panggil setiap kali perlu (tidak disimpan). */
export const orderToken = (code: string, version: number): string =>
  sign("order", `${code}:${version}`);

/** Verifikasi token dengan perbandingan timing-safe. */
export function verifyOrderToken(
  code: string,
  version: number,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  try {
    const a = Buffer.from(orderToken(code, version));
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Hash identitas (IP atau email) — tidak simpan nilai mentah. */
export const hashIdentity = (kind: "ip" | "email", v: string): string =>
  sign(kind, v.trim().toLowerCase());

/** Ambil link akses pesanan lengkap. */
export function orderLink(code: string, version: number): string {
  return `${env.SITE_URL}/katalog/pesanan/${encodeURIComponent(code)}?t=${orderToken(code, version)}`;
}
