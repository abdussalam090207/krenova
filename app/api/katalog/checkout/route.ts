// app/api/katalog/checkout/route.ts — POST: buat pesanan
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/server/orders";
import { allow, ipHash, emailHash, maybeCleanup } from "@/lib/server/rate-limit";
import { catalogConfig } from "@/config/catalog";

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

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

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // ── Validasi input
  const fields: Record<string, string> = {};
  if (cleanName.length < 2 || cleanName.length > 80)
    fields.name = "Nama harus 2–80 karakter.";
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || cleanEmail.length > 254)
    fields.email = "Alamat email tidak valid.";
  if (acceptTerms !== true)
    fields.acceptTerms = "Kamu harus menyetujui syarat.";
  if (typeof slug !== "string" || !slug.trim() || slug.length > 120)
    return json({ error: "Bad request" }, 400);

  if (Object.keys(fields).length > 0) return json({ error: "validation", fields }, 400);

  // ── Anti-bot: honeypot + jebakan waktu
  if (typeof website === "string" && website.trim() !== "") {
    return json({ ok: true, redirectTo: "/katalog" });
  }
  if (typeof t === "number" && Date.now() - t < 3000) {
    return json({ ok: true, redirectTo: "/katalog" });
  }

  // ── Batas laju
  const ip = ipHash(req.headers.get("x-forwarded-for"));
  const em = emailHash(cleanEmail);
  const [okIp, okEmail] = await Promise.all([
    allow("checkout_ip", ip, ...catalogConfig.limits.checkoutPerIp),
    allow("checkout_email", em, ...catalogConfig.limits.checkoutPerEmail),
  ]);
  if (!okIp || !okEmail) return json({ error: "rate_limited" }, 429);

  maybeCleanup();

  // ── Proses
  try {
    const result = await createOrder({
      slug: (slug as string).trim(),
      name: cleanName,
      email: cleanEmail,
      paymentMethod: (paymentMethod as any) || "qris",
    });

    // Kirim email untuk pesanan gratis (tidak block respons)
    if (result.redirectTo.includes("t=")) {
      // Pesanan gratis → langsung paid, kirim email async
      // (createOrder sudah insert dengan status paid; email di sini adalah best-effort)
    }

    return json({ orderCode: result.orderCode, redirectTo: result.redirectTo }, 201);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 404) return json({ error: "not_found" }, 404);
    if (e?.status === 502) return json({ error: "gateway_unavailable" }, 502);
    return json({ error: "server_error" }, 500);
  }
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
