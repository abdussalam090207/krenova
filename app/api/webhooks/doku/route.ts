// app/api/webhooks/doku/route.ts — Webhook/Notification callback dari DOKU
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyDokuWebhookSignature } from "@/lib/server/doku";
import { applyGatewayStatus, loadOrder, getDokuStatus, type OrderRow } from "@/lib/server/orders";
import { onOrderPaid } from "@/lib/server/email";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: NO_STORE });

// ─── Helper: simpan log event pembayaran ─────────────────────────────────

async function logEvent(p: {
  order_code?: string;
  signature_valid?: boolean;
  transaction_status?: string;
  note?: string;
  payload?: unknown;
}) {
  try {
    await supabaseAdmin.from("catalog_payment_events").insert({
      order_code:          p.order_code ?? null,
      source:              "doku_webhook",
      signature_valid:     p.signature_valid ?? false,
      transaction_status:  p.transaction_status ?? null,
      note:                p.note ?? null,
      payload:             p.payload ?? null,
    });
  } catch {
    // fire-and-forget — jangan sampai error log menghentikan response
  }
}

// ─── POST: terima notifikasi dari DOKU ───────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Baca body (batasi ukuran maks 8 KB)
  let rawBody: string;
  try {
    rawBody = await req.text();
    if (rawBody.length > 8192) return json({ error: "Payload too large" }, 413);
  } catch {
    return json({ error: "Failed to read request body" }, 400);
  }

  // 2. Parse JSON
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // 3. Ambil header wajib dari DOKU
  const clientId         = req.headers.get("Client-Id")         ?? "";
  const requestId        = req.headers.get("Request-Id")        ?? "";
  const requestTimestamp = req.headers.get("Request-Timestamp") ?? "";
  const incomingSignature = req.headers.get("Signature")        ?? "";

  // 4. Validasi bentuk dasar body DOKU
  // DOKU mengirim: { order: { invoice_number, amount }, transaction: { status } }
  const order    = body.order    as Record<string, unknown> | undefined;
  const txn      = body.transaction as Record<string, unknown> | undefined;

  const invoiceNumber = (order?.invoice_number as string) ?? "";
  const txnStatus     = (txn?.status           as string) ?? "";

  if (!invoiceNumber || !txnStatus) {
    await logEvent({ note: "Missing invoice_number or transaction.status", payload: body });
    return json({ error: "Bad request: missing required fields" }, 400);
  }

  // 5. Verifikasi signature DOKU (WAJIB sebelum menyentuh DB)
  const sigValid = verifyDokuWebhookSignature({
    clientId,
    requestId,
    requestTimestamp,
    requestTarget:     req.nextUrl.pathname || "/api/webhooks/doku",
    bodyJson:          rawBody,
    incomingSignature,
  });

  if (!sigValid) {
    await logEvent({
      order_code:         invoiceNumber,
      signature_valid:    false,
      transaction_status: txnStatus,
      note:               "Signature mismatch — request ditolak",
      payload:            body,
    });
    return json({ error: "Forbidden: invalid signature" }, 403);
  }

  // 6. Cari pesanan di DB
  let rawOrder: OrderRow | null = null;

  // Coba cari langsung dengan invoice_number
  const { data: directOrder } = await supabaseAdmin
    .from("catalog_orders")
    .select("*")
    .eq("order_code", invoiceNumber)
    .single<OrderRow>();

  rawOrder = directOrder ?? null;

  // Fallback: jika invoice_number mengandung suffix method (mis: KRN-001-qris), cari order_code dasarnya
  if (!rawOrder && invoiceNumber.includes("-")) {
    const baseCode = invoiceNumber.split("-").slice(0, 3).join("-");
    const { data: baseOrder } = await supabaseAdmin
      .from("catalog_orders")
      .select("*")
      .eq("order_code", baseCode)
      .single<OrderRow>();
    rawOrder = baseOrder ?? null;
  }

  await logEvent({
    order_code:         invoiceNumber,
    signature_valid:    true,
    transaction_status: txnStatus,
    note:               rawOrder ? "order_found" : "order_not_found",
    payload:            body,
  });

  if (!rawOrder) {
    // Tidak ditemukan → balas 200 supaya DOKU tidak mengulang tanpa henti
    return json({ ok: true, ignored: true, reason: "order_not_found" });
  }

  // 7. Jangan percaya isi webhook saja; verifikasi langsung ke DOKU API (double-check)
  let statusResult: Awaited<ReturnType<typeof getDokuStatus>>;
  try {
    statusResult = await getDokuStatus(invoiceNumber);
  } catch (statusErr) {
    console.error("[DOKU Webhook] Gagal verifikasi status ke DOKU API:", statusErr);
    // Gunakan data dari webhook sebagai fallback (less secure tapi tidak block notifikasi)
    statusResult = {
      ok:                true,
      invoiceNumber,
      transactionStatus: txnStatus.toUpperCase(),
      amountIdr:         Math.round(Number(order?.amount ?? 0)),
      raw:               body,
    };
  }

  // 8. Terapkan status ke DB
  const result = await applyGatewayStatus(rawOrder, statusResult);

  // 9. Kirim email jika baru lunas atau email belum terkirim
  if (
    result.transitioned ||
    (result.newStatus === "paid" && (!rawOrder.email_buyer_sent_at || !rawOrder.email_admin_sent_at))
  ) {
    const updatedOrder = { ...rawOrder, status: "paid" as const };
    try {
      await onOrderPaid(updatedOrder);
    } catch (emailErr) {
      console.error("[DOKU Webhook] Gagal memproses email pesanan:", emailErr);
    }
  }

  return json({ ok: true });
}

export async function GET() {
  return json({ error: "Method not allowed" }, 405);
}
