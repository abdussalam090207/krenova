// lib/server/rate-limit.ts — Pembatas laju via RPC database
import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { hashIdentity } from "./tokens";

/**
 * Periksa batas laju. Gagal-tertutup: bila RPC error → tolak (return false).
 * IP dan email di-hash sebelum dikirim ke DB — nilai mentah tidak tersimpan.
 */
export async function allow(
  bucket: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("catalog_rate_hit", {
    p_bucket: bucket,
    p_key: key,
    p_max: max,
    p_window_seconds: windowSec,
  });
  if (error) return false; // gagal-tertutup
  return data === true;
}

/** Ambil IP pertama dari x-forwarded-for, lalu hash. */
export function ipHash(forwardedFor: string | null): string {
  const raw = (forwardedFor ?? "127.0.0.1").split(",")[0].trim();
  return hashIdentity("ip", raw);
}

/** Hash email. */
export const emailHash = (email: string): string => hashIdentity("email", email);

/** Bersihkan catatan lama (1% probabilitas, fire-and-forget). */
export function maybeCleanup(): void {
  if (Math.random() < 0.01) {
    Promise.resolve(supabaseAdmin.rpc("catalog_rate_cleanup")).catch(() => {});
  }
}
