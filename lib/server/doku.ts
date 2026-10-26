// lib/server/doku.ts — Helper DOKU Direct API: Signature HMAC-SHA256, Charge, Status
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

// ─── Konfigurasi dari env ─────────────────────────────────────────────────

const CLIENT_ID  = process.env.DOKU_CLIENT_ID  ?? "";
const SECRET_KEY = process.env.DOKU_SECRET_KEY ?? "";
const BASE_URL   = (process.env.DOKU_BASE_URL  ?? "https://api-sandbox.doku.com").replace(/\/+$/, "");
const IS_PROD    = process.env.DOKU_IS_PRODUCTION === "true";

export const isDokuSandbox = !IS_PROD;

// ─── Tipe Publik ──────────────────────────────────────────────────────────

export type DokuPaymentChannel =
  | "QRIS"
  | "VIRTUAL_ACCOUNT_BCA"
  | "VIRTUAL_ACCOUNT_BNI"
  | "VIRTUAL_ACCOUNT_BRI"
  | "VIRTUAL_ACCOUNT_MANDIRI"
  | "VIRTUAL_ACCOUNT_PERMATA"
  | "VIRTUAL_ACCOUNT_CIMB"
  | "VIRTUAL_ACCOUNT_DANAMON";

export interface DokuChargeParams {
  orderCode:     string;
  amountIdr:     number;
  buyerName:     string;
  buyerEmail:    string;
  productTitle:  string;
  expiryMinutes: number;
  channel:       DokuPaymentChannel;
}

export interface DokuChargeResult {
  ok:             boolean;
  invoiceNumber:  string;
  expiredDate:    string | null;
  qrString:       string | null;
  vaNumber:       string | null;
  bank:           string | null;
  raw:            Record<string, unknown>;
  errorMessage?:  string;
}

export interface DokuStatusResult {
  ok:                boolean;
  invoiceNumber:     string;
  transactionStatus: string | null;
  amountIdr:         number;
  raw:               Record<string, unknown>;
}

// ─── HMAC-SHA256 Signature (Standar DOKU Direct / Jokul API) ─────────────

/**
 * Digest = Base64( SHA-256(requestBody) )
 */
export function buildDigest(bodyJson: string): string {
  return createHash("sha256").update(bodyJson, "utf8").digest("base64");
}

/**
 * Signature DOKU POST:
 * Client-Id:{clientId}\n
 * Request-Id:{requestId}\n
 * Request-Timestamp:{timestamp}\n
 * Request-Target:{requestTarget}\n
 * Digest:{digest}
 *
 * Signature DOKU GET:
 * Client-Id:{clientId}\n
 * Request-Id:{requestId}\n
 * Request-Timestamp:{timestamp}\n
 * Request-Target:{requestTarget}
 */
export function buildSignature(params: {
  clientId:         string;
  requestId:        string;
  requestTimestamp: string;
  requestTarget:    string;
  digest?:          string;
}): string {
  const parts = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.requestTimestamp}`,
    `Request-Target:${params.requestTarget}`,
  ];

  if (params.digest) {
    parts.push(`Digest:${params.digest}`);
  }

  const rawMessage = parts.join("\n");
  const sig = createHmac("sha256", SECRET_KEY).update(rawMessage, "utf8").digest("base64");
  return `HMACSHA256=${sig}`;
}

/**
 * Header wajib untuk request ke DOKU
 */
export function buildDokuHeaders(requestTarget: string, bodyJson?: string): Record<string, string> {
  const requestId        = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const digest           = bodyJson ? buildDigest(bodyJson) : undefined;

  const signature = buildSignature({
    clientId: CLIENT_ID,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
  });

  const headers: Record<string, string> = {
    "Content-Type":      "application/json",
    "Client-Id":         CLIENT_ID,
    "Request-Id":        requestId,
    "Request-Timestamp": requestTimestamp,
    "Request-Target":    requestTarget,
    "Signature":         signature,
  };

  if (digest) {
    headers["Digest"] = digest;
  }

  return headers;
}

// ─── Verifikasi Signature Webhook dari DOKU ───────────────────────────────

export function verifyDokuWebhookSignature(params: {
  clientId:           string;
  requestId:          string;
  requestTimestamp:   string;
  requestTarget?:     string;
  bodyJson:           string;
  incomingSignature:  string;
}): boolean {
  try {
    const target   = params.requestTarget || "/api/webhooks/doku";
    const digest   = buildDigest(params.bodyJson);
    const expected = buildSignature({
      clientId:         params.clientId,
      requestId:        params.requestId,
      requestTimestamp: params.requestTimestamp,
      requestTarget:    target,
      digest,
    });

    const a = Buffer.from(expected);
    const b = Buffer.from(params.incomingSignature || "");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Helper fetch ke DOKU API ─────────────────────────────────────────────

async function callDoku(
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const bodyJson = JSON.stringify(body);
  const headers  = buildDokuHeaders(path, bodyJson);
  const url      = `${BASE_URL}${path}`;

  console.log(`[DOKU] POST ${url}`, { clientId: CLIENT_ID, invoice: (body.order as any)?.invoice_number });

  const res = await fetch(url, {
    method:  "POST",
    headers,
    body:    bodyJson,
    cache:   "no-store",
    signal:  AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw_text: text };
  }

  console.log(`[DOKU] Response ${res.status}:`, JSON.stringify(data).slice(0, 300));
  return { status: res.status, data };
}

// ─── Virtual Account Paths (DOKU Direct API) ──────────────────────────────

const VA_PATHS: Record<string, string> = {
  BCA:     "/bca-virtual-account/v2/payment-code",
  BNI:     "/bni-virtual-account/v2/payment-code",
  BRI:     "/bri-virtual-account/v2/payment-code",
  MANDIRI: "/mandiri-virtual-account/v2/payment-code",
  PERMATA: "/permata-virtual-account/v2/payment-code",
  CIMB:    "/cimb-virtual-account/v2/payment-code",
  DANAMON: "/danamon-virtual-account/v2/payment-code",
};

// ─── Charge Virtual Account ───────────────────────────────────────────────

async function chargeVA(p: DokuChargeParams, bankCode: string): Promise<DokuChargeResult> {
  const fallbackExpiry = new Date(Date.now() + p.expiryMinutes * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  const path = VA_PATHS[bankCode] ?? VA_PATHS.BCA;

  const vaInfo: Record<string, unknown> = {
    expired_time:    p.expiryMinutes,
    reusable_status: false,
    info1:           "KRENOVA",
    info2:           p.productTitle.slice(0, 18),
  };

  // BNI memerlukan merchant_unique_reference yang panjangnya < 13 digit
  if (bankCode === "BNI") {
    vaInfo.merchant_unique_reference = String(Date.now()).slice(-8);
  }

  const body = {
    order: {
      invoice_number: p.orderCode,
      amount:         p.amountIdr,
    },
    virtual_account_info: vaInfo,
    customer: {
      name:  sanitizeName(p.buyerName),
      email: p.buyerEmail.trim().toLowerCase(),
    },
  };

  let res: { status: number; data: Record<string, unknown> };
  try {
    res = await callDoku(path, body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return failResult(p.orderCode, `Network error charge VA ${bankCode}: ${msg}`);
  }

  const vaNumber    = extractVaNumber(res.data);
  const expiredDate = extractExpiredDate(res.data, fallbackExpiry);
  const isOk        = (res.status === 200 || res.status === 201) && Boolean(vaNumber);

  return {
    ok:            isOk,
    invoiceNumber: p.orderCode,
    expiredDate,
    qrString:      null,
    vaNumber,
    bank:          bankCode,
    raw:           res.data,
    errorMessage:  isOk ? undefined : `DOKU VA ${bankCode} gagal (HTTP ${res.status}): ${JSON.stringify(res.data).slice(0, 300)}`,
  };
}

// ─── Charge QRIS ──────────────────────────────────────────────────────────

async function chargeQris(p: DokuChargeParams): Promise<DokuChargeResult> {
  const fallbackExpiry = new Date(Date.now() + p.expiryMinutes * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  // Di DOKU Sandbox, QRIS channel seringkali belum aktif di profil merchant default
  // Kita coba dulu via endpoint SNAP adapter atau checkout
  const body = {
    order: {
      invoice_number: p.orderCode,
      amount:         p.amountIdr,
      currency:       "IDR",
    },
    payment: {
      payment_due_date: p.expiryMinutes,
    },
    customer: {
      name:  sanitizeName(p.buyerName),
      email: p.buyerEmail.trim().toLowerCase(),
    },
  };

  try {
    const res = await callDoku("/checkout/v1/payment", body);
    const qrString = extractQrString(res.data);
    if ((res.status === 200 || res.status === 201) && qrString) {
      return {
        ok:            true,
        invoiceNumber: p.orderCode,
        expiredDate:   extractExpiredDate(res.data, fallbackExpiry),
        qrString,
        vaNumber:      null,
        bank:          null,
        raw:           res.data,
      };
    }
  } catch (err) {
    console.warn("[DOKU] Charge QRIS direct attempt error:", err);
  }

  // Jika di mode Sandbox dan QRIS tidak aktif di DOKU:
  // Buat mock QRIS EMV string resmi agar pengujian lokal & simulasi lancar
  if (isDokuSandbox) {
    console.log("[DOKU] Sandbox Mode: Menggunakan mock QRIS string untuk simulasi:", p.orderCode);
    const mockQr = `00020101021226580014ID.LINKAJA.WWW01189360091100222830840208102228300303UMI51440014ID.DOKU.WWW02150000000000000000303UMI520458125303360540${p.amountIdr.toString().length}${p.amountIdr}5802ID5914KRENOVA STUDIO6007BANDUNG61054011562200716${p.orderCode.slice(0, 16)}6304ABCD`;

    return {
      ok:            true,
      invoiceNumber: p.orderCode,
      expiredDate:   fallbackExpiry,
      qrString:      mockQr,
      vaNumber:      null,
      bank:          null,
      raw:           { sandbox: true, simulated: true, invoice_number: p.orderCode },
    };
  }

  return failResult(p.orderCode, "Channel QRIS belum diaktifkan di akun DOKU Anda.");
}

// ─── Fungsi Utama: chargeDoku ─────────────────────────────────────────────

export async function chargeDoku(p: DokuChargeParams): Promise<DokuChargeResult> {
  switch (p.channel) {
    case "QRIS":                    return chargeQris(p);
    case "VIRTUAL_ACCOUNT_BCA":     return chargeVA(p, "BCA");
    case "VIRTUAL_ACCOUNT_BNI":     return chargeVA(p, "BNI");
    case "VIRTUAL_ACCOUNT_BRI":     return chargeVA(p, "BRI");
    case "VIRTUAL_ACCOUNT_MANDIRI": return chargeVA(p, "MANDIRI");
    case "VIRTUAL_ACCOUNT_PERMATA": return chargeVA(p, "PERMATA");
    case "VIRTUAL_ACCOUNT_CIMB":    return chargeVA(p, "CIMB");
    case "VIRTUAL_ACCOUNT_DANAMON": return chargeVA(p, "DANAMON");
    default:                        return chargeQris(p);
  }
}

// ─── Cek Status Transaksi DOKU ────────────────────────────────────────────

export async function getDokuStatus(invoiceNumber: string): Promise<DokuStatusResult> {
  const requestTarget = `/orders/v1/status/${encodeURIComponent(invoiceNumber)}`;
  const headers       = buildDokuHeaders(requestTarget);

  try {
    const res = await fetch(`${BASE_URL}${requestTarget}`, {
      method: "GET",
      headers: {
        "Client-Id":         headers["Client-Id"],
        "Request-Id":        headers["Request-Id"],
        "Request-Timestamp": headers["Request-Timestamp"],
        "Request-Target":    requestTarget,
        "Signature":         headers["Signature"],
      },
      cache:  "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw_text: text };
    }

    const txn             = data.transaction as Record<string, unknown> | undefined;
    const orderData       = data.order       as Record<string, unknown> | undefined;
    const transactionStatus =
      (txn?.status        as string) ??
      (data.status        as string) ??
      (data.responseCode === "2000000" ? "PENDING" : null);

    const amountRaw = orderData?.amount ?? data.amount ?? 0;

    return {
      ok:                res.ok,
      invoiceNumber,
      transactionStatus: transactionStatus?.toUpperCase() ?? null,
      amountIdr:         Math.round(Number(amountRaw)),
      raw:               data,
    };
  } catch (err) {
    console.error("[DOKU] getDokuStatus error:", err);
    return {
      ok:                false,
      invoiceNumber,
      transactionStatus: null,
      amountIdr:         0,
      raw:               { error: String(err) },
    };
  }
}

// ─── Ekstraksi Field dari Respons DOKU ────────────────────────────────────

function extractQrString(raw: Record<string, unknown>): string | null {
  const payment    = raw.payment    as Record<string, unknown> | undefined;
  const payData    = raw.payment_data as Record<string, unknown> | undefined;
  const qrResponse = raw.qr_response as Record<string, unknown> | undefined;

  const candidates = [
    payment?.qr_string,
    payment?.qr_code,
    payData?.qr_code,
    payData?.qr_string,
    qrResponse?.qr_string,
    raw.qr_string,
    raw.qr_code,
    raw.qrContent,
    raw.qr_content,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  return null;
}

function extractVaNumber(raw: Record<string, unknown>): string | null {
  const vai     = raw.virtual_account_info as Record<string, unknown> | undefined;
  const payData = raw.payment_data         as Record<string, unknown> | undefined;

  const candidates = [
    vai?.virtual_account_number,
    payData?.virtual_account_number,
    raw.virtual_account_number,
    raw.va_number,
    raw.account_number,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  return null;
}

function extractExpiredDate(raw: Record<string, unknown>, fallback: string): string {
  const vai     = raw.virtual_account_info as Record<string, unknown> | undefined;
  const payment = raw.payment              as Record<string, unknown> | undefined;

  const candidates = [
    vai?.expired_date_utc,
    vai?.expired_date,
    payment?.expired_datetime,
    payment?.expired_date,
    raw.expired_date,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return fallback;
}

function sanitizeName(name: string): string {
  return (name.replace(/[^a-zA-Z0-9\s.,'-]/g, "").trim() || "Customer").slice(0, 50);
}

function failResult(invoiceNumber: string, errorMessage: string): DokuChargeResult {
  return {
    ok:            false,
    invoiceNumber,
    expiredDate:   null,
    qrString:      null,
    vaNumber:      null,
    bank:          null,
    raw:           {},
    errorMessage,
  };
}
