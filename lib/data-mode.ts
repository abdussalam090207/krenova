/**
 * data-mode.ts
 * Menentukan mode data aplikasi: "dummy" | "supabase" | "none"
 * Satu sumber penentu mode untuk Projects dan Feedback (About).
 */

const mode = process.env.NEXT_PUBLIC_DATA_MODE;
const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("XXXXXXXX");

export const DATA_MODE: "dummy" | "supabase" | "none" =
  mode === "dummy"
    ? "dummy"
    : mode === "supabase" || hasSupabase
    ? "supabase"
    : process.env.NODE_ENV !== "production"
    ? "dummy"
    : "none";
