// app/api/webhooks/midtrans/route.ts — Webhook Midtrans
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySignature, getStatus } from "@/lib/server/midtrans";
import { applyGatewayStatus } from "@/lib/server/orders";
import { onOrderPaid } from "@/lib/server/email";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

async function logEvent(p: {
  order_code?: string;
  signature_valid?: boolean;
  transaction_status?: string;
  note?: string;
  payload?: unknown;
}) {
  try {
    await supabaseAdmin.from("catalog_payment_events").insert({
      order_code: p.order_code ?? null,
      source: "midtrans_webhook",
      signature_valid: p.signature_valid ?? false,
      transaction_status: p.transaction_status ?? null,
      note: p.note ?? null,
      payload: p.payload ?? null,
    });
  } catch {
    // fire-and-forget
  }
}

export async function POST(req: NextRequest) {
  // ── Baca body (batasi ukuran)
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 8192) return json({ error: "Payload too large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  // ── Validasi bentuk dasar
  const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
  if (
    typeof order_id !== "string" ||
    typeof status_code !== "string" ||
    typeof gross_amount !== "string" ||
    typeof signature_key !== "string" ||
    typeof transaction_status !== "string"
  ) {
    await logEvent({ note: "Missing required fields", payload: body });
    return json({ error: "Bad request" }, 400);
  }

  // ── Verifikasi tanda tangan (WAJIB sebelum menyentuh DB)
  const sigValid = verifySignature({
    order_id, status_code, gross_amount, signature_key,
  });

  if (!sigValid) {
    await logEvent({
      order_code: order_id,
      signature_valid: false,
      transaction_status,
      note: "Signature mismatch",
    });
    return json({ error: "Forbidden" }, 403);
  }

  // ── Cari pesanan di DB (khusus webhook: cari langsung tanpa token check)
  let { data: rawOrder } = await supabaseAdmin
    .from("catalog_orders")
    .select("*")
    .eq("order_code", order_id)
    .single();

  if (!rawOrder && order_id.includes("-")) {
    const baseCode = order_id.split("-").slice(0, 3).join("-");
    const { data: baseOrder } = await supabaseAdmin
      .from("catalog_orders")
      .select("*")
      .eq("order_code", baseCode)
      .single();
    rawOrder = baseOrder;
  }

  await logEvent({
    order_code: order_id,
    signature_valid: true,
    transaction_status,
    note: rawOrder ? "found" : "not_found",
  });

  if (!rawOrder) {
    // Tidak ditemukan → balas 200 supaya Midtrans tidak mengulang tanpa henti
    return json({ ok: true, ignored: true });
  }

  // ── Jangan percaya isi webhook; cek status langsung ke Midtrans
  const remote = await getStatus(order_id);

  const result = await applyGatewayStatus(rawOrder, remote);

  // Kirim email jika status baru lunas, atau jika sudah lunas tetapi email belum terkirim
  if (
    result.transitioned ||
    (result.newStatus === "paid" && (!rawOrder.email_buyer_sent_at || !rawOrder.email_admin_sent_at))
  ) {
    const updatedOrder = { ...rawOrder, status: "paid" as const };
    try {
      await onOrderPaid(updatedOrder);
    } catch (emailErr) {
      console.error("[Midtrans Webhook] Gagal memproses email pesanan:", emailErr);
    }
  }

  return json({ ok: true });
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
