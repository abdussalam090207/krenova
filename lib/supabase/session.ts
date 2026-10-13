import type { SupabaseClient } from "@supabase/supabase-js";

export class AnonAuthError extends Error {
  constructor(message = "Fitur 'Allow anonymous sign-ins' belum diaktifkan di Supabase Dashboard. Silakan aktifkan di: Authentication → Providers → Anonymous → centang 'Allow anonymous sign-ins' lalu Save.") {
    super(message);
    this.name = "AnonAuthError";
  }
}

/**
 * Pastikan ada sesi pengguna (baik anonymous maupun authenticated).
 * Jika belum ada sesi, lakukan anonymous sign-in.
 */
export async function ensureSession(sb: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (session) return session.user.id;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data?.user) {
    if (error?.message?.toLowerCase().includes("anonymous") || (error as { code?: string })?.code === "anonymous_provider_disabled") {
      throw new AnonAuthError(
        "Fitur 'Allow anonymous sign-ins' belum diaktifkan di Supabase Dashboard. Silakan aktifkan di: Authentication → Providers → Anonymous → centang 'Allow anonymous sign-ins' lalu Save."
      );
    }
    throw new AnonAuthError(error?.message || "Layanan autentikasi anonim sedang tidak tersedia.");
  }
  return data.user.id;
}
