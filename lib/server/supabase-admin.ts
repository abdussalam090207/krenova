// lib/server/supabase-admin.ts — Klien service_role (hanya di server)
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
