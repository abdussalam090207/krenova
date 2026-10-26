// lib/server/orders.ts — Buat pesanan, terapkan status gateway, muat pesanan, pembatalan, ganti pembayaran (v4 — DOKU)
import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import {
  chargeDoku,
  getDokuStatus,
  cancelDokuOrder,
  isDokuSandbox,
  type DokuPaymentChannel,
} from "./doku";
import { orderToken } from "./tokens";
import { catalogConfig } from "@/config/catalog";

// ─── Re-export tipe kompatibel (agar komponen yang ada tidak perlu ubah import) ─
import type { PaymentMethod, PaymentDetails } from "@/lib/catalog/types";
export type { PaymentMethod, PaymentDetails };

// ─── Tipe internal (tidak diekspor ke client) ─────────────────────────────

export interface OrderRow {
  id: string;
  order_code: string;
  product_id: string;
  product_title: string;
  product_slug: string;
  order_type: "paid" | "free";
  amount_idr: number;
  buyer_name: string;
  buyer_email: string;
  status: "pending" | "paid" | "expired" | "canceled" | "failed";
  token_version: number;
  qr_string: string | null;
  expires_at: string | null;
  paid_at: string | null;
  download_count: number;
  email_buyer_sent_at: string | null;
  email_admin_sent_at: string | null;
  email_error: string | null;
  gateway_transaction_id: string | null;
  gateway_payment_type: string | null;
  gateway_status: string | null;
}

// ─── Pembuatan pesanan ────────────────────────────────────────────────────

export interface CreateOrderInput {
  slug: string;
  name: string;
  email: string;
  paymentMethod?: PaymentMethod;
}

export async function createOrder(input: CreateOrderInput): Promise<{
  orderCode: string;
  redirectTo: string;
}> {
  // 1. Muat produk (harga dari database, bukan dari request)
  const { data: product, error: pErr } = await supabaseAdmin
    .from("catalog_products")
    .select("id,title,slug,purchase_mode,price_idr,is_published")
    .eq("slug", input.slug)
    .eq("is_published", true)
    .in("purchase_mode", ["paid", "free"])
    .single();

  if (pErr || !product) {
    throw Object.assign(new Error("Produk tidak ditemukan atau tidak dijual."), { status: 404 });
  }

  // 2. Bersihkan pesanan basi
  try {
    await supabaseAdmin.rpc("catalog_expire_stale_orders");
  } catch {
    // abaikan jika fungsi RPC belum dipasang
  }

  const isFree = product.purchase_mode === "free";
  const amountIdr = isFree ? 0 : (product.price_idr ?? 0);

  // 3. Insert pesanan
  const baseInsert = {
    product_id: product.id,
    product_title: product.title,
    product_slug: product.slug,
    order_type: isFree ? "free" : "paid",
    amount_idr: amountIdr,
    buyer_name: input.name.trim(),
    buyer_email: input.email.trim().toLowerCase(),
    status: isFree ? "paid" : "pending",
    ...(isFree ? { paid_at: new Date().toISOString() } : {}),
  };

  const { data: order, error: oErr } = await supabaseAdmin
    .from("catalog_orders")
    .insert(baseInsert)
    .select()
    .single<OrderRow>();

  if (oErr || !order) {
    throw new Error(`Gagal membuat pesanan: ${oErr?.message}`);
  }

  // 4. Charge Payment ke DOKU Direct API (hanya paid)
  if (!isFree) {
    let activeMethod: PaymentMethod = input.paymentMethod || "qris";
    const dokuChannel = paymentMethodToDokuChannel(activeMethod);

    let chargeResult: Awaited<ReturnType<typeof chargeDoku>>;
    try {
      chargeResult = await chargeDoku({
        orderCode:     order.order_code,
        amountIdr,
        buyerName:     input.name,
        buyerEmail:    input.email,
        productTitle:  product.title,
        expiryMinutes: catalogConfig.paymentExpiryMinutes,
        channel:       dokuChannel,
      });
    } catch (err) {
      console.error("[createOrder] Exception saat chargeDoku:", err);
      await supabaseAdmin
        .from("catalog_orders")
        .update({ status: "failed", gateway_status: "charge_error" })
        .eq("id", order.id);
      throw Object.assign(new Error("Pembayaran sedang tidak tersedia."), { status: 502 });
    }

    // Jika channel QRIS gagal (misalnya akun DOKU Production baru belum di-approve channel QRIS-nya oleh BI/ASPI),
    // otomatis fallback ke BCA Virtual Account agar checkout user tetap berhasil dan tidak terputus!
    if (!chargeResult.ok && dokuChannel === "QRIS") {
      console.warn(`[createOrder] Charge QRIS gagal (${chargeResult.errorMessage}). Mencoba fallback ke BCA Virtual Account...`);
      try {
        const vaFallback = await chargeDoku({
          orderCode:     order.order_code,
          amountIdr,
          buyerName:     input.name,
          buyerEmail:    input.email,
          productTitle:  product.title,
          expiryMinutes: catalogConfig.paymentExpiryMinutes,
          channel:       "VIRTUAL_ACCOUNT_BCA",
        });
        if (vaFallback.ok) {
          chargeResult = vaFallback;
          activeMethod = "bca_va";
          console.log(`[createOrder] Berhasil fallback ke BCA VA (${vaFallback.vaNumber}) untuk ${order.order_code}`);
        } else {
          console.error("[createOrder] Fallback BCA VA juga gagal:", vaFallback.errorMessage);
        }
      } catch (vaErr) {
        console.error("[createOrder] Exception saat fallback BCA VA:", vaErr);
      }
    }

    if (!chargeResult.ok) {
      console.error(`[createOrder] chargeDoku gagal untuk pesanan ${order.order_code}:`, chargeResult.errorMessage, chargeResult.raw);
      const errSnippet = (chargeResult.errorMessage || "unknown").slice(0, 100);
      await supabaseAdmin
        .from("catalog_orders")
        .update({ status: "failed", gateway_status: `charge_failed: ${errSnippet}` })
        .eq("id", order.id);
      throw Object.assign(new Error(chargeResult.errorMessage || "Pembayaran sedang tidak tersedia."), { status: 502 });
    }

    const paymentDetails = dokuResultToPaymentDetails(chargeResult, activeMethod);
    let expiresAt: string;
    try {
      expiresAt = chargeResult.expiredDate
        ? new Date(chargeResult.expiredDate).toISOString()
        : new Date(Date.now() + catalogConfig.paymentExpiryMinutes * 60_000).toISOString();
      if (expiresAt === "Invalid Date" || Number.isNaN(new Date(expiresAt).getTime())) {
        expiresAt = new Date(Date.now() + catalogConfig.paymentExpiryMinutes * 60_000).toISOString();
      }
    } catch {
      expiresAt = new Date(Date.now() + catalogConfig.paymentExpiryMinutes * 60_000).toISOString();
    }

    const qrOrPayload = JSON.stringify({
      activeMethod:  activeMethod,
      activeDetails: paymentDetails,
      methods:       { [activeMethod]: paymentDetails },
    });

    await supabaseAdmin
      .from("catalog_orders")
      .update({
        gateway:                "doku",
        gateway_transaction_id: chargeResult.invoiceNumber,
        gateway_payment_type:   activeMethod,
        gateway_status:         "pending",
        qr_string:              qrOrPayload,
        expires_at:             expiresAt,
      })
      .eq("id", order.id);
  }

  const token = orderToken(order.order_code, order.token_version);

  // 5. Pesanan gratis langsung berstatus paid — kirim email akses & notifikasi
  if (isFree) {
    try {
      const { onOrderPaid } = await import("./email");
      await onOrderPaid(order);
    } catch (err) {
      console.error("[KRENOVA] Gagal kirim email pesanan gratis:", err);
    }
  }

  return {
    orderCode: order.order_code,
    redirectTo: `/katalog/pesanan/${encodeURIComponent(order.order_code)}?t=${token}`,
  };
}

// ─── Terapkan status gateway (dipakai webhook + reconcile) ───────────────

type InternalStatus = "paid" | "pending" | "expired" | "canceled" | "failed" | "alert";

/**
 * Memetakan status DOKU → status internal KRENOVA.
 * Status DOKU: SUCCESS, PENDING, FAILED, EXPIRED, CANCELED, REFUNDED
 */
function mapDokuStatus(s: string): InternalStatus {
  const upper = s.toUpperCase();
  switch (upper) {
    case "SUCCESS":
    case "SETTLEMENT": return "paid";
    case "PENDING":    return "pending";
    case "EXPIRED":    return "expired";
    case "CANCEL":
    case "CANCELED":
    case "CANCELLED":  return "canceled";
    case "FAILED":
    case "FAILURE":    return "failed";
    case "REFUNDED":
    case "CHARGEBACK": return "alert";
    default:           return "pending";
  }
}

export interface ApplyResult {
  transitioned: boolean;
  newStatus: string;
}

/**
 * Terapkan status dari respons DOKU secara atomik dan idempoten.
 * statusResult = hasil getDokuStatus() langsung dari DOKU — bukan isi webhook.
 */
export async function applyGatewayStatus(
  order: OrderRow,
  statusResult: Awaited<ReturnType<typeof getDokuStatus>>,
): Promise<ApplyResult> {
  // 1. Pastikan invoice_number cocok
  const remoteInvoice = statusResult.invoiceNumber;
  const baseInvoice   = remoteInvoice.split("-").slice(0, 3).join("-");
  if (remoteInvoice !== order.order_code && baseInvoice !== order.order_code) {
    return { transitioned: false, newStatus: order.status };
  }

  // 2. Verifikasi nominal (hanya jika DOKU mengembalikan amount)
  if (statusResult.amountIdr > 0 && statusResult.amountIdr !== order.amount_idr) {
    try {
      await supabaseAdmin.from("catalog_notifications").insert({
        type:     "payment_alert",
        order_id: order.id,
        title:    "Nominal tidak cocok",
        body:     `Pesanan ${order.order_code}: DB Rp ${order.amount_idr}, DOKU Rp ${statusResult.amountIdr}`,
        meta:     { order_code: order.order_code, expected: order.amount_idr, received: statusResult.amountIdr },
      });
    } catch {}
    return { transitioned: false, newStatus: order.status };
  }

  const rawStatus     = statusResult.transactionStatus ?? "pending";
  const internalStatus = mapDokuStatus(rawStatus);

  // 3. Tangani alert (refund/chargeback)
  if (internalStatus === "alert") {
    await supabaseAdmin
      .from("catalog_orders")
      .update({ gateway_status: rawStatus })
      .eq("id", order.id);
    try {
      await supabaseAdmin.from("catalog_notifications").insert({
        type:     "payment_alert",
        order_id: order.id,
        title:    "Peringatan: refund/chargeback",
        body:     `Pesanan ${order.order_code}: ${rawStatus}`,
        meta:     { order_code: order.order_code, status: rawStatus },
      });
    } catch {}
    return { transitioned: false, newStatus: rawStatus };
  }

  if (internalStatus === "paid") {
    // Update atomik: idempoten dan tahan race-condition
    const { data } = await supabaseAdmin
      .from("catalog_orders")
      .update({
        status:               "paid",
        paid_at:              new Date().toISOString(),
        gateway_status:       rawStatus,
        gateway_payment_type: order.gateway_payment_type ?? "qris",
      })
      .eq("id", order.id)
      .in("status", ["pending", "expired", "canceled"])
      .select()
      .single<OrderRow>();

    if (data) return { transitioned: true, newStatus: "paid" };
    return { transitioned: false, newStatus: "paid" };
  }

  // pending/expired/canceled/failed
  const validFrom: string[] =
    internalStatus === "expired"  ? ["pending"] :
    internalStatus === "canceled" ? ["pending"] :
    internalStatus === "failed"   ? ["pending"] : [];

  if (validFrom.length > 0) {
    await supabaseAdmin
      .from("catalog_orders")
      .update({ status: internalStatus, gateway_status: rawStatus })
      .eq("id", order.id)
      .in("status", validFrom);
  }

  return { transitioned: false, newStatus: internalStatus };
}

// ─── Muat pesanan untuk halaman / unduhan ─────────────────────────────────

/**
 * Muat pesanan + verifikasi token.
 * Kembalikan null untuk SEMUA kasus gagal (tidak ada / token salah) — respons 404 generik.
 */
export async function loadOrder(
  code: string,
  token: string | null | undefined,
): Promise<OrderRow | null> {
  if (!code || !token) return null;

  const { data, error } = await supabaseAdmin
    .from("catalog_orders")
    .select("*")
    .eq("order_code", code)
    .single<OrderRow>();

  if (error || !data) return null;

  const { verifyOrderToken } = await import("./tokens");
  if (!verifyOrderToken(code, data.token_version, token)) return null;

  return data;
}

/** Hitung jumlah pesanan untuk satu produk (cek sebelum hapus). */
export async function countProductOrders(productId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("catalog_orders")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);
  return count ?? 0;
}

/**
 * Batalkan pesanan secara eksplisit (navigasi keluar / tombol batal).
 * Membatalkan transaksi di gateway DOKU (status jadi CANCEL) dan di database Supabase (status jadi canceled).
 */
export async function cancelOrder(
  code: string,
  token?: string | null,
): Promise<{ ok: boolean; status: string; message: string }> {
  let order: OrderRow | null = null;
  if (token) {
    order = await loadOrder(code, token);
  } else {
    const { data } = await supabaseAdmin
      .from("catalog_orders")
      .select("*")
      .eq("order_code", code)
      .single<OrderRow>();
    order = data ?? null;
  }

  if (!order) {
    return { ok: false, status: "not_found", message: "Pesanan tidak ditemukan." };
  }
  if (order.status === "paid") {
    return { ok: false, status: "paid", message: "Pesanan sudah lunas, tidak dapat dibatalkan." };
  }
  if (order.status === "canceled") {
    return { ok: true, status: "canceled", message: "Pesanan sudah dibatalkan sebelumnya." };
  }

  // 1. Batalkan transaksi di DOKU agar di DOKU statusnya menjadi CANCEL (bukan pending)
  const invoicesToCancel = new Set<string>();
  invoicesToCancel.add(order.order_code);
  if (order.gateway_transaction_id) {
    invoicesToCancel.add(order.gateway_transaction_id);
  }
  if (order.gateway_payment_type && order.gateway_payment_type !== "qris") {
    invoicesToCancel.add(`${order.order_code}-${order.gateway_payment_type}`);
  }

  try {
    await Promise.allSettled(
      Array.from(invoicesToCancel).map((inv) => cancelDokuOrder(inv))
    );
  } catch (err) {
    console.error("[cancelOrder] Error saat membatalkan di DOKU:", err);
  }

  // 2. Update status di Supabase menjadi 'canceled'
  const { data: updated, error } = await supabaseAdmin
    .from("catalog_orders")
    .update({
      status:         "canceled",
      gateway_status: "CANCELED",
      updated_at:     new Date().toISOString(),
    })
    .eq("id", order.id)
    .in("status", ["pending"])
    .select()
    .single<OrderRow>();

  if (error || !updated) {
    return { ok: true, status: order.status, message: "Pesanan tidak dalam status pending." };
  }

  return { ok: true, status: "canceled", message: "Pesanan berhasil dibatalkan." };
}

/**
 * Tandai pesanan sebagai expired saat waktu pembayaran habis.
 * Membatalkan transaksi di DOKU dan mengubah status DB menjadi 'expired'.
 */
export async function expireOrder(
  order: OrderRow,
): Promise<{ ok: boolean; status: string }> {
  if (order.status !== "pending") {
    return { ok: true, status: order.status };
  }

  // Batalkan di DOKU agar tidak menggantung pending
  const invoicesToCancel = new Set<string>();
  invoicesToCancel.add(order.order_code);
  if (order.gateway_transaction_id) invoicesToCancel.add(order.gateway_transaction_id);
  if (order.gateway_payment_type && order.gateway_payment_type !== "qris") {
    invoicesToCancel.add(`${order.order_code}-${order.gateway_payment_type}`);
  }

  try {
    await Promise.allSettled(
      Array.from(invoicesToCancel).map((inv) => cancelDokuOrder(inv))
    );
  } catch (err) {
    console.error("[expireOrder] Error saat membatalkan di DOKU:", err);
  }

  const { data: updated } = await supabaseAdmin
    .from("catalog_orders")
    .update({
      status:         "expired",
      gateway_status: "EXPIRED",
      updated_at:     new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select()
    .single<OrderRow>();

  return { ok: true, status: updated ? "expired" : order.status };
}

export interface SwitchPaymentResult {
  ok: boolean;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  qrDataUrl?: string | null;
  message?: string;
  error?: string;
}

/**
 * Ganti metode pembayaran di halaman checkout (QRIS atau Virtual Account).
 * Mendukung caching agar tidak merequest ulang jika channel sudah pernah digenerate.
 */
export async function switchOrderPaymentMethod(
  code: string,
  token: string,
  newMethod: PaymentMethod,
): Promise<SwitchPaymentResult> {
  const order = await loadOrder(code, token);
  if (!order) {
    return { ok: false, paymentMethod: newMethod, paymentDetails: { method: newMethod }, error: "Pesanan tidak ditemukan." };
  }

  if (order.status !== "pending") {
    return {
      ok: false, paymentMethod: newMethod, paymentDetails: { method: newMethod },
      error: `Pesanan berstatus ${order.status}. Tidak dapat mengganti metode pembayaran.`,
    };
  }

  // Parse cache metode pembayaran yang sudah tersimpan
  let cachedMethods: Record<string, PaymentDetails> = {};
  if (order.qr_string) {
    if (order.qr_string.startsWith("{")) {
      try {
        const parsed = JSON.parse(order.qr_string);
        if (parsed.methods && typeof parsed.methods === "object") {
          cachedMethods = parsed.methods;
        } else if (parsed.activeDetails) {
          cachedMethods[parsed.activeMethod || order.gateway_payment_type || "qris"] = parsed.activeDetails;
        } else if (parsed.method) {
          cachedMethods[parsed.method] = parsed;
        }
      } catch {}
    } else {
      cachedMethods["qris"] = { method: "qris", qrString: order.qr_string };
    }
  }

  // Jika channel ini sudah pernah digenerate, gunakan data cache
  if (cachedMethods[newMethod]) {
    const details    = cachedMethods[newMethod];
    let qrDataUrl: string | null = null;
    if (newMethod === "qris" && details.qrString) {
      const QRCode = (await import("qrcode")).default;
      qrDataUrl = await QRCode.toDataURL(details.qrString, {
        margin: 2, width: 280, errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      }).catch(() => null);
    }

    await supabaseAdmin
      .from("catalog_orders")
      .update({
        gateway_payment_type: newMethod,
        qr_string:            JSON.stringify({ activeMethod: newMethod, activeDetails: details, methods: cachedMethods }),
        updated_at:           new Date().toISOString(),
      })
      .eq("id", order.id);

    return { ok: true, paymentMethod: newMethod, paymentDetails: details, qrDataUrl, message: "Metode pembayaran berhasil diaktifkan." };
  }

  // Belum ada di cache → charge ke DOKU dengan sub-ID
  const dokuOrderId = `${order.order_code}-${newMethod}`;
  const dokuChannel = paymentMethodToDokuChannel(newMethod);

  let chargeResult: Awaited<ReturnType<typeof chargeDoku>>;
  try {
    chargeResult = await chargeDoku({
      orderCode:     dokuOrderId,
      amountIdr:     order.amount_idr,
      buyerName:     order.buyer_name,
      buyerEmail:    order.buyer_email,
      productTitle:  order.product_title,
      expiryMinutes: catalogConfig.paymentExpiryMinutes,
      channel:       dokuChannel,
    });
  } catch (err) {
    console.error(`[switchOrderPaymentMethod] DOKU Charge error (${newMethod}):`, err);
    return { ok: false, paymentMethod: newMethod, paymentDetails: { method: newMethod }, error: "Pembayaran channel ini sedang tidak tersedia di gateway." };
  }

  if (!chargeResult.ok) {
    return {
      ok: false, paymentMethod: newMethod, paymentDetails: { method: newMethod },
      error: chargeResult.errorMessage || "Gagal mengaktifkan channel pembayaran.",
    };
  }

  const details = dokuResultToPaymentDetails(chargeResult, newMethod);
  cachedMethods[newMethod] = details;

  let qrDataUrl: string | null = null;
  if (newMethod === "qris" && details.qrString) {
    const QRCode = (await import("qrcode")).default;
    qrDataUrl = await QRCode.toDataURL(details.qrString, {
      margin: 2, width: 280, errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    }).catch(() => null);
  }

  await supabaseAdmin
    .from("catalog_orders")
    .update({
      gateway_payment_type:   newMethod,
      gateway_transaction_id: chargeResult.invoiceNumber,
      qr_string:              JSON.stringify({ activeMethod: newMethod, activeDetails: details, methods: cachedMethods }),
      updated_at:             new Date().toISOString(),
    })
    .eq("id", order.id);

  return { ok: true, paymentMethod: newMethod, paymentDetails: details, qrDataUrl, message: "Metode pembayaran berhasil diaktifkan." };
}

// ─── Helper: konversi PaymentMethod → DokuPaymentChannel ─────────────────

function paymentMethodToDokuChannel(method: PaymentMethod): DokuPaymentChannel {
  switch (method) {
    case "bca_va":      return "VIRTUAL_ACCOUNT_BCA";
    case "bni_va":      return "VIRTUAL_ACCOUNT_BNI";
    case "bri_va":      return "VIRTUAL_ACCOUNT_BRI";
    case "mandiri_bill": return "VIRTUAL_ACCOUNT_MANDIRI";
    case "permata_va":  return "VIRTUAL_ACCOUNT_PERMATA";
    case "qris":
    default:           return "QRIS";
  }
}

// ─── Helper: konversi DokuChargeResult → PaymentDetails ──────────────────

function dokuResultToPaymentDetails(
  result: Awaited<ReturnType<typeof chargeDoku>>,
  method: PaymentMethod,
): PaymentDetails {
  if (method === "qris") {
    return { method: "qris", qrString: result.qrString ?? null };
  }
  if (method === "mandiri_bill") {
    // DOKU Mandiri VA: va_number digunakan sebagai bill_key
    return {
      method:      "mandiri_bill",
      billKey:     result.vaNumber ?? null,
      billerCode:  "70012",
      bank:        "MANDIRI",
    };
  }
  // Semua VA lainnya
  return {
    method,
    vaNumber: result.vaNumber ?? null,
    bank:     result.bank ?? method.replace("_va", "").toUpperCase(),
  };
}

// Re-export DOKU helpers agar dipakai oleh route lain
export { getDokuStatus, isDokuSandbox, cancelDokuOrder };
