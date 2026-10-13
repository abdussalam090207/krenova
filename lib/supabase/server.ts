/**
 * Supabase server client — tanpa sesi, hanya baca publik.
 * persistSession: false (Server Components tidak butuh auth state).
 */
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
