import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { env } from "./env";
import { allow } from "./rate-limit";
import type { User } from "@supabase/supabase-js";

export interface AdminAuthSuccess {
  user: User;
  corsHeaders: Record<string, string>;
}

export interface AdminAuthError {
  error: string;
  status: number;
  corsHeaders: Record<string, string>;
}

/**
 * Validasi dan bentuk CORS headers berdasarkan origin yang diizinkan.
 */
export function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) return {};

  const allowedOrigins = env.ADMIN_ALLOWED_ORIGINS;
  let isAllowed = allowedOrigins.some(
    (o) => o.toLowerCase() === origin.toLowerCase(),
  );

  // Fallback aman untuk dev: izinkan localhost / 127.0.0.1 / LAN IP pada port Live Server (5500, 5501, 3000, 5173)
  if (!isAllowed) {
    try {
      const u = new URL(origin);
      const isLocalHost = u.hostname === "localhost" || u.hostname === "127.0.0.1" || /^192\.168\.\d+\.\d+$/.test(u.hostname) || /^10\.\d+\.\d+\.\d+$/.test(u.hostname);
      const isDevPort = ["5500", "5501", "3000", "5173", "8080"].includes(u.port);
      if (isLocalHost && isDevPort) {
        isAllowed = true;
      }
    } catch {}
  }

  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle preflight OPTIONS request.
 */
export function handleCorsOptions(req: NextRequest): NextResponse | null {
  if (req.method === "OPTIONS") {
    const cors = getCorsHeaders(req);
    return new NextResponse(null, {
      status: 204,
      headers: cors,
    });
  }
  return null;
}

/**
 * Verifikasi bahwa permintaan berasal dari admin Supabase yang terautentikasi.
 * 1. Ambil Bearer token
 * 2. Cek token via supabaseAdmin.auth.getUser()
 * 3. Pastikan user bukan anonymous
 * 4. Cek keberadaan user_id di tabel public.admins
 * 5. Batas laju per admin (120 req/menit)
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<AdminAuthSuccess | AdminAuthError> {
  const corsHeaders = getCorsHeaders(req);

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Otorisasi gagal: token Bearer tidak ditemukan.",
      status: 401,
      corsHeaders,
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      error: "Otorisasi gagal: token kosong.",
      status: 401,
      corsHeaders,
    };
  }

  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);

  if (authErr || !user) {
    return {
      error: "Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login kembali.",
      status: 401,
      corsHeaders,
    };
  }

  if (user.is_anonymous) {
    return {
      error: "Akses ditolak: pengguna anonim tidak diizinkan.",
      status: 403,
      corsHeaders,
    };
  }

  // Cek keanggotaan admin di tabel public.admins
  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminErr || !adminRow) {
    if (adminErr) {
      console.error("[admin-auth] Gagal memverifikasi admin:", adminErr);
    }
    return {
      error: "Akses ditolak: akun Anda tidak memiliki hak akses admin.",
      status: 403,
      corsHeaders,
    };
  }

  // Rate limit: 120 permintaan per menit per admin
  try {
    const isAllowed = await allow("admin_storage", user.id, 120, 60);
    if (!isAllowed) {
      return {
        error: "Terlalu banyak permintaan. Silakan tunggu sebentar.",
        status: 429,
        corsHeaders,
      };
    }
  } catch {
    // Toleransi jika RPC rate limit belum terpasang di database
  }

  return { user, corsHeaders };
}
