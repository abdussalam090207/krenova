// lib/server/doku.ts â€” Helper DOKU Direct API: Signature HMAC-SHA256, Charge, Status
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

// â”€â”€â”€ Konfigurasi dari env â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CLIENT_ID  = process.env.DOKU_CLIENT_ID  ?? "";
const SECRET_KEY = process.env.DOKU_SECRET_KEY ?? "";
const IS_PROD    = process.env.DOKU_IS_PRODUCTION === "true";

// BASE_URL: production = api.doku.com, sandbox = api-sandbox.doku.com
// Wajib di-set lewat env var DOKU_BASE_URL agar tidak ada hardcoded URL
const BASE_URL = (() => {
  const raw = (process.env.DOKU_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return IS_PROD ? "https://api.doku.com" : "https://api-sandbox.doku.com";
})();

// URL webhook callback yang dikirim ke DOKU agar DOKU tahu ke mana mengirim notifikasi
// Diambil dari env, fallback ke production URL
const WEBHOOK_URL = (() => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const base = siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")
    ? siteUrl
    : "https://krenovas.my.id";
  return `${base}/api/webhooks/doku`;
})();

export const isDokuSandbox = !IS_PROD;

// â”€â”€â”€ Tipe Publik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ HMAC-SHA256 Signature (Standar DOKU Direct / Jokul API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Verifikasi Signature Webhook dari DOKU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Verifikasi signature webhook dari DOKU.
 * Menggunakan timingSafeEqual untuk mencegah timing attack.
 * Menolak request jika timestamp lebih dari MAX_WEBHOOK_AGE_MS (5 menit) â€” anti replay attack.
 */

/** Maksimum usia webhook yang diterima: 5 menit */
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

export function verifyDokuWebhookSignature(params: {
  clientId:           string;
  requestId:          string;
  requestTimestamp:   string;
  requestTarget?:     string;
  bodyJson:           string;
  incomingSignature:  string;
}): boolean {
  try {
    // â”€â”€ 1. Validasi Client-Id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!params.clientId || params.clientId !== CLIENT_ID) return false;

    // â”€â”€ 2. Replay attack prevention: tolak jika timestamp terlalu lama â”€â”€â”€â”€
    if (params.requestTimestamp) {
      const tsMs = new Date(params.requestTimestamp).getTime();
      if (!Number.isNaN(tsMs) && Math.abs(Date.now() - tsMs) > MAX_WEBHOOK_AGE_MS) {
        console.warn(`[DOKU Webhook] Ditolak: timestamp terlalu lama (${params.requestTimestamp})`);
        return false;
      }
    }

    // â”€â”€ 3. Hitung & bandingkan signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Helper fetch ke DOKU API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function callDoku(
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  // Validasi kredensial saat runtime (agar build tetap berhasil meski env belum ada)
  if (!CLIENT_ID || !SECRET_KEY) {
    const ctx = IS_PROD ? "PRODUCTION" : "SANDBOX";
    throw new Error(
      `[DOKU ${ctx}] DOKU_CLIENT_ID dan DOKU_SECRET_KEY wajib diisi di environment variables. ` +
      `Tambahkan ke .env.local (dev) atau Vercel Environment Variables (prod).`,
    );
  }
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

// â”€â”€â”€ Virtual Account Paths (DOKU Direct API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VA_PATHS: Record<string, string> = {
  BCA:     "/bca-virtual-account/v2/payment-code",
  BNI:     "/bni-virtual-account/v2/payment-code",
  BRI:     "/bri-virtual-account/v2/payment-code",
  MANDIRI: "/mandiri-virtual-account/v2/payment-code",
  PERMATA: "/permata-virtual-account/v2/payment-code",
  CIMB:    "/cimb-virtual-account/v2/payment-code",
  DANAMON: "/danamon-virtual-account/v2/payment-code",
};

// â”€â”€â”€ Charge Virtual Account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // Memberitahu DOKU ke mana mengirim webhook notifikasi pembayaran
    additional_info: {
      callback_url: WEBHOOK_URL,
    },
  };

  let res: { status: number; data: Record<string, unknown> } | null = null;
  try {
    res = await callDoku(path, body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isDokuSandbox) {
      return failResult(p.orderCode, `Network error charge VA ${bankCode}: ${msg}`);
    }
  }

  const vaNumber    = res ? extractVaNumber(res.data) : null;
  const expiredDate = res ? extractExpiredDate(res.data, fallbackExpiry) : fallbackExpiry;
  const isOk        = res ? ((res.status === 200 || res.status === 201) && Boolean(vaNumber)) : false;

  if (isOk && vaNumber) {
    return {
      ok:            true,
      invoiceNumber: p.orderCode,
      expiredDate,
      qrString:      null,
      vaNumber,
      bank:          bankCode,
      raw:           res!.data,
    };
  }

  // PRODUCTION: tidak ada fallback simulasi â€” gagal dengan pesan jelas
  if (IS_PROD) {
    return failResult(
      p.orderCode,
      `DOKU VA ${bankCode} gagal (HTTP ${res?.status}): ${JSON.stringify(res?.data ?? {}).slice(0, 300)}`,
    );
  }

  // SANDBOX ONLY: jika channel bank belum diaktifkan di sandbox DOKU, gunakan VA simulasi
  console.log(`[DOKU] Sandbox Mode: VA ${bankCode} tidak aktif di portal sandbox, menggunakan nomor VA simulasi:`, p.orderCode);
  const mockVaPrefix: Record<string, string> = {
    BCA:     "12345",
    BNI:     "8808",
    BRI:     "10777",
    MANDIRI: "89608",
    PERMATA: "8528",
    CIMB:    "5105",
    DANAMON: "8888",
  };
  const prefix = mockVaPrefix[bankCode] ?? "99999";
  const numericCode = p.orderCode.replace(/\D/g, "").slice(-8).padStart(8, "1");
  const simulatedVa = `${prefix}${numericCode}`;

  return {
    ok:            true,
    invoiceNumber: p.orderCode,
    expiredDate:   fallbackExpiry,
    qrString:      null,
    vaNumber:      simulatedVa,
    bank:          bankCode,
    raw:           { sandbox: true, simulated: true, invoice_number: p.orderCode, doku_response: res?.data },
  };
}

// ─── Charge QRIS ──────────────────────────────────────────────────────────

async function chargeQris(p: DokuChargeParams): Promise<DokuChargeResult> {
  const fallbackExpiry = new Date(Date.now() + p.expiryMinutes * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const baseSite = siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")
    ? siteUrl
    : "https://krenovas.my.id";
  const callbackUrl = `${baseSite}/katalog/pesanan/${p.orderCode}`;

  // Payload standar DOKU Checkout (Jokul API) untuk QRIS
  const body = {
    order: {
      invoice_number: p.orderCode,
      amount:         p.amountIdr,
      currency:       "IDR",
      callback_url:   callbackUrl,
    },
    payment: {
      payment_due_date:     p.expiryMinutes,
      payment_method_types: ["QRIS"],
    },
    customer: {
      name:  sanitizeName(p.buyerName),
      email: p.buyerEmail.trim().toLowerCase(),
    },
  };

  let res: { status: number; data: Record<string, unknown> } | null = null;

  // 1. Coba DOKU Direct QRIS API terlebih dahulu (/qris-http/v2/generate-qr-code)
  try {
    const directBody = {
      order: {
        invoice_number: p.orderCode,
        amount:         p.amountIdr,
      },
      qris_info: {
        expired_time: p.expiryMinutes,
      },
      additional_info: {
        callback_url: WEBHOOK_URL,
      },
    };
    res = await callDoku("/qris-http/v2/generate-qr-code", directBody);
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
    console.warn("[DOKU] Charge Direct QRIS attempt error, trying checkout fallback:", err);
  }

  // 2. DOKU Checkout API (/checkout/v1/payment) -> Dapatkan token_id, lalu generate real raw EMVCo QRIS string
  try {
    res = await callDoku("/checkout/v1/payment", body);

    // Cek jika res.data sudah memuat qrString raw EMVCo langsung
    const directQr = extractQrString(res.data);
    if ((res.status === 200 || res.status === 201) && directQr) {
      return {
        ok:            true,
        invoiceNumber: p.orderCode,
        expiredDate:   extractExpiredDate(res.data, fallbackExpiry),
        qrString:      directQr,
        vaNumber:      null,
        bank:          null,
        raw:           res.data,
      };
    }

    // Ekstraksi token_id dari payment response DOKU
    const resp = res.data.response as Record<string, unknown> | undefined;
    const payment = (resp?.payment ?? res.data.payment) as Record<string, unknown> | undefined;
    const tokenId = (payment?.token_id ?? res.data.token_id) as string | undefined;

    if ((res.status === 200 || res.status === 201) && tokenId) {
      const checkoutHost = IS_PROD ? "https://checkout.doku.com" : "https://checkout-sandbox.doku.com";
      const qrisGenUrl = `${checkoutHost}/checkout/v1/payment/${encodeURIComponent(tokenId)}/generate-qris`;

      const qrisGenRes = await fetch(qrisGenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": "bearer authnologin",
        },
        body: JSON.stringify({ token_id: tokenId }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      if (qrisGenRes.ok) {
        const qrisData = (await qrisGenRes.json()) as Record<string, unknown>;
        const rawQr = (qrisData.qr_code ?? qrisData.qr_string ?? qrisData.qrContent) as string | undefined;
        if (rawQr && typeof rawQr === "string" && !rawQr.startsWith("http")) {
          console.log(`[DOKU] Berhasil generate raw QRIS EMVCo string untuk ${p.orderCode}: ${rawQr.slice(0, 35)}...`);
          return {
            ok:            true,
            invoiceNumber: p.orderCode,
            expiredDate:   extractExpiredDate(res.data, fallbackExpiry),
            qrString:      rawQr.trim(),
            vaNumber:      null,
            bank:          null,
            raw:           { ...res.data, qris_generation: qrisData },
          };
        }
      } else {
        console.warn(`[DOKU] generate-qris endpoint HTTP ${qrisGenRes.status}`);
      }
    }

    console.warn(`[DOKU] Charge QRIS checkout response (HTTP ${res?.status}):`, JSON.stringify(res?.data ?? {}).slice(0, 300));
  } catch (err) {
    console.warn("[DOKU] Charge QRIS attempt error:", err);
  }

  // PRODUCTION: jika channel QRIS gagal atau belum aktif, kembalikan failResult dengan log jelas
  if (IS_PROD) {
    const errorDetail = res?.data ? JSON.stringify(res.data).slice(0, 200) : "Network/gateway error";
    return failResult(
      p.orderCode,
      `Channel QRIS belum aktif di akun DOKU Production (HTTP ${res?.status ?? "ERR"}): ${errorDetail}`,
    );
  }

  // SANDBOX ONLY: Buat mock QRIS EMV string agar pengujian lokal & simulasi lancar
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


// â”€â”€â”€ Fungsi Utama: chargeDoku â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Cek Status Transaksi DOKU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Batalkan Pesanan di DOKU (Cancel Order API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function cancelDokuOrder(invoiceNumber: string): Promise<{
  ok: boolean;
  status?: number;
  data?: Record<string, unknown>;
}> {
  if (!CLIENT_ID || !SECRET_KEY) {
    return { ok: true, data: { simulated: true, note: "No credentials, local cancel" } };
  }

  try {
    const path = "/checkout/v3/cancellations";
    const body = {
      order: {
        invoice_number: invoiceNumber,
      },
    };

    console.log(`[DOKU] Cancel Order: POST ${path} (invoice: ${invoiceNumber})`);
    const res = await callDoku(path, body);
    const isSuccess = res.status >= 200 && res.status < 300;
    return {
      ok: isSuccess,
      status: res.status,
      data: res.data,
    };
  } catch (err) {
    console.warn(`[DOKU] Gagal membatalkan transaksi ${invoiceNumber}:`, err);
    return {
      ok: false,
      data: { error: String(err) },
    };
  }
}

// ─── Ekstraksi Field dari Respons DOKU ────────────────────────────────────

function extractQrString(raw: Record<string, unknown>): string | null {
  const resp       = raw.response   as Record<string, unknown> | undefined;
  const payment    = (resp?.payment ?? raw.payment) as Record<string, unknown> | undefined;
  const payData    = (resp?.payment_data ?? raw.payment_data) as Record<string, unknown> | undefined;
  const qrResponse = (resp?.qr_response ?? raw.qr_response) as Record<string, unknown> | undefined;
  const qrisInfo   = (resp?.qris_info ?? raw.qris_info) as Record<string, unknown> | undefined;

  const candidates = [
    // Direct QR string (EMVCo)
    qrResponse?.qr_string,
    qrResponse?.qr_content,
    qrisInfo?.qr_string,
    qrisInfo?.qr_content,
    payment?.qr_string,
    payment?.qr_code,
    payData?.qr_code,
    payData?.qr_string,
    raw.qr_string,
    raw.qr_code,
    raw.qrContent,
    raw.qr_content,
    resp?.qr_content,
    resp?.qrContent,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const val = c.trim();
      // Pastikan bukan URL web — QRIS WAJIB berupa raw string EMVCo (biasanya diawali 000201)
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return val;
      }
    }
  }

  return null;
}

function extractVaNumber(raw: Record<string, unknown>): string | null {
  const resp    = raw.response as Record<string, unknown> | undefined;
  const vai     = (resp?.virtual_account_info ?? raw.virtual_account_info) as Record<string, unknown> | undefined;
  const payData = (resp?.payment_data         ?? raw.payment_data)         as Record<string, unknown> | undefined;

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
  const resp    = raw.response as Record<string, unknown> | undefined;
  const vai     = (resp?.virtual_account_info ?? raw.virtual_account_info) as Record<string, unknown> | undefined;
  const payment = (resp?.payment              ?? raw.payment)              as Record<string, unknown> | undefined;

  const candidates = [
    vai?.expired_date_utc,
    vai?.expired_date,
    payment?.expired_datetime,
    payment?.expired_date,
    raw.expired_date,
    resp?.expired_date,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const val = c.trim();
      // Handle DOKU YYYYMMDDHHmmss format (14 digits) e.g. 20261027153000
      if (/^\d{14}$/.test(val)) {
        const y = val.slice(0, 4);
        const m = val.slice(4, 6);
        const d = val.slice(6, 8);
        const h = val.slice(8, 10);
        const min = val.slice(10, 12);
        const s = val.slice(12, 14);
        const dt = new Date(`${y}-${m}-${d}T${h}:${min}:${s}+07:00`);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString();
      }
      return val;
    }
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
