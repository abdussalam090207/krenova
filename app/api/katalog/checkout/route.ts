// app/api/katalog/checkout/route.ts — POST: buat pesanan (dengan idempoten lock)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/server/orders";
import { allow, ipHash, emailHash, maybeCleanup } from "@/lib/server/rate-limit";
import { catalogConfig } from "@/config/catalog";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

// In-memory lock: mencegah dua request checkout yang identik terjadi bersamaan pada instance server yang sama
// Format key: "<emailHash>:<slug>"
const activeCheckouts = new Set<string>();

export async function POST(req: NextRequest) {
  // ── Validasi Content-Type & ukuran body
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return json({ error: "Bad request" }, 400);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { slug, name, email, paymentMethod, acceptTerms, website, t } = body as Record<string, unknown>;

  const cleanName  = typeof name  === "string" ? name.trim()                    : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase()     : "";
  const cleanSlug  = typeof slug  === "string" ? slug.trim()                    : "";

  // ── Validasi input
  const fields: Record<string, string> = {};
  if (cleanName.length < 2 || cleanName.length > 80)
    fields.name = "Nama harus 2–80 karakter.";
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || cleanEmail.length > 254)
    fields.email = "Alamat email tidak valid.";
  if (acceptTerms !== true)
    fields.acceptTerms = "Kamu harus menyetujui syarat.";
  if (!cleanSlug || cleanSlug.length > 120)
    return json({ error: "Bad request" }, 400);

  if (Object.keys(fields).length > 0) return json({ error: "validation", fields }, 400);

  // ── Anti-bot: honeypot + jebakan waktu (800ms)
  if (typeof website === "string" && website.trim() !== "") {
    return json({ ok: true, redirectTo: "/katalog" });
  }
  if (typeof t === "number" && Date.now() - t < 800) {
    return json({ ok: true, redirectTo: "/katalog" });
  }

  // ── Batas laju (rate limit)
  const ip = ipHash(req.headers.get("x-forwarded-for"));
  const em = emailHash(cleanEmail);
  const [okIp, okEmail] = await Promise.all([
    allow("checkout_ip",    ip, ...catalogConfig.limits.checkoutPerIp),
    allow("checkout_email", em, ...catalogConfig.limits.checkoutPerEmail),
  ]);
  if (!okIp || !okEmail) return json({ error: "rate_limited" }, 429);

  maybeCleanup();

  // ── Idempoten check: apakah user sudah memiliki pesanan PENDING untuk produk ini?
  // (Mencegah double-order jika request tiba dari jaringan yang lambat)
  const { data: existingOrder } = await supabaseAdmin
    .from("catalog_orders")
    .select("order_code, status, qr_string, expires_at, token_version")
    .eq("buyer_email", cleanEmail)
    .eq("product_slug", cleanSlug)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString()) // Belum kedaluwarsa
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOrder) {
    // Pesanan pending yang masih valid sudah ada → kembalikan pesanan yang lama
    const { orderToken } = await import("@/lib/server/tokens");
    const token = orderToken(existingOrder.order_code, existingOrder.token_version ?? 1);
    const redirectTo = `/katalog/pesanan/${encodeURIComponent(existingOrder.order_code)}?t=${token}`;
    console.log(`[checkout] Pesanan pending masih aktif untuk ${cleanEmail} + ${cleanSlug}: ${existingOrder.order_code}`);
    return json({ orderCode: existingOrder.order_code, redirectTo }, 200);
  }

  // ── In-memory lock: cegah dua request bersamaan lolos ke createOrder
  const lockKey = `${em}:${cleanSlug}`;
  if (activeCheckouts.has(lockKey)) {
    // Request duplikat sedang diproses → kembalikan 429 untuk request kedua
    return json({ error: "Sedang memproses pesananmu, harap tunggu." }, 429);
  }
  activeCheckouts.add(lockKey);

  // ── Proses
  try {
    const result = await createOrder({
      slug:          cleanSlug,
      name:          cleanName,
      email:         cleanEmail,
      paymentMethod: (paymentMethod as any) || "qris",
    });

    return json({ orderCode: result.orderCode, redirectTo: result.redirectTo }, 201);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 404) return json({ error: "not_found" }, 404);
    if (e?.status === 502) return json({ error: "gateway_unavailable" }, 502);
    return json({ error: "server_error" }, 500);
  } finally {
    // Selalu lepas lock setelah request selesai
    activeCheckouts.delete(lockKey);
  }
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
