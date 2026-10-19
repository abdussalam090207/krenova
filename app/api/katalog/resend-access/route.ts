// app/api/katalog/resend-access/route.ts — POST: kirim ulang link akses
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { onOrderPaid } from "@/lib/server/email";
import { allow, ipHash, emailHash, maybeCleanup } from "@/lib/server/rate-limit";
import { catalogConfig } from "@/config/catalog";
import type { OrderRow } from "@/lib/server/orders";

const NO_STORE = { "Cache-Control": "no-store" };
// SELALU kembalikan pesan sama — tidak bocorkan keberadaan email
const ALWAYS_OK = NextResponse.json(
  { ok: true, message: "Jika ada pesanan dengan email itu, kami kirim linknya." },
  { status: 200, headers: NO_STORE },
);

const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return json({ error: "Bad request" }, 400);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return ALWAYS_OK; }

  const { email, website, t } = body as Record<string, unknown>;

  // Anti-bot
  if (typeof website === "string" && website.trim() !== "") return ALWAYS_OK;
  if (typeof t === "number" && Date.now() - t < 3000) return ALWAYS_OK;
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ALWAYS_OK;

  // Batas laju
  const ip = ipHash(req.headers.get("x-forwarded-for"));
  const em = emailHash(email);
  const [okIp, okEmail] = await Promise.all([
    allow("resend_ip",    ip, ...catalogConfig.limits.resendPerIp),
    allow("resend_email", em, ...catalogConfig.limits.resendPerEmail),
  ]);
  if (!okIp || !okEmail) return ALWAYS_OK;

  maybeCleanup();

  // Cari pesanan paid untuk email ini (maks 5 terbaru)
  const { data: orders } = await supabaseAdmin
    .from("catalog_orders")
    .select("*")
    .eq("buyer_email", email.trim().toLowerCase())
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(5);

  if (orders && orders.length > 0) {
    // Reset email_buyer_sent_at supaya onOrderPaid akan mengirim ulang
    await Promise.allSettled(
      (orders as OrderRow[]).map(async (o) => {
        await supabaseAdmin
          .from("catalog_orders")
          .update({ email_buyer_sent_at: null })
          .eq("id", o.id);
        await onOrderPaid({ ...o, email_buyer_sent_at: null });
      }),
    );
  }

  return ALWAYS_OK;
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
