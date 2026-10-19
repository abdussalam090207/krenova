// lib/server/midtrans.ts — Charge QRIS, cek status, verifikasi tanda tangan
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const BASE = env.MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const AUTH =
  "Basic " + Buffer.from(env.MIDTRANS_SERVER_KEY + ":").toString("base64");

async function call(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: AUTH,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

import type { PaymentMethod, PaymentDetails } from "@/lib/catalog/types";
export type { PaymentMethod, PaymentDetails };

export interface ChargePaymentParams {
  orderCode: string;
  amount: number;     // integer rupiah dari database
  name: string;
  email: string;
  title: string;
  minutes: number;    // masa berlaku
  paymentMethod?: PaymentMethod;
}

/** Charge pembayaran multi-metode ke Midtrans Core API. */
export function chargePayment(o: ChargePaymentParams) {
  const method = o.paymentMethod || "qris";

  const baseBody: Record<string, unknown> = {
    transaction_details: {
      order_id: o.orderCode,
      gross_amount: o.amount,
    },
    item_details: [
      {
        id: o.orderCode,
        price: o.amount,
        quantity: 1,
        name: o.title.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: (o.name.replace(/[^a-zA-Z0-9\s.,'-]/g, "").trim() || "Customer").slice(0, 50),
      email: o.email.trim().toLowerCase(),
    },
    custom_expiry: {
      expiry_duration: o.minutes,
      unit: "minute",
    },
  };

  switch (method) {
    case "qris":
      baseBody.payment_type = "qris";
      baseBody.qris = { acquirer: "gopay" };
      break;

    case "bca_va":
      baseBody.payment_type = "bank_transfer";
      baseBody.bank_transfer = { bank: "bca" };
      break;

    case "bni_va":
      baseBody.payment_type = "bank_transfer";
      baseBody.bank_transfer = { bank: "bni" };
      break;

    case "bri_va":
      baseBody.payment_type = "bank_transfer";
      baseBody.bank_transfer = { bank: "bri" };
      break;

    case "permata_va":
      baseBody.payment_type = "permata";
      break;

    case "mandiri_bill":
      baseBody.payment_type = "echannel";
      baseBody.echannel = {
        bill_info1: "Pembayaran:",
        bill_info2: "KRENOVA Studio",
      };
      break;

    case "indomaret":
      baseBody.payment_type = "cstore";
      baseBody.cstore = {
        store: "indomaret",
        message: "KRENOVA Studio",
      };
      break;

    case "alfamart":
      baseBody.payment_type = "cstore";
      baseBody.cstore = {
        store: "alfamart",
        message: "KRENOVA Studio",
      };
      break;

    default:
      baseBody.payment_type = "qris";
      baseBody.qris = { acquirer: "gopay" };
      break;
  }

  return call("/v2/charge", {
    method: "POST",
    body: JSON.stringify(baseBody),
  });
}

/** Charge QRIS backward compatibility. */
export function chargeQris(o: ChargePaymentParams) {
  return chargePayment({ ...o, paymentMethod: "qris" });
}

/** Cek status transaksi langsung ke Midtrans (sumber kebenaran). */
export function getStatus(orderCode: string) {
  return call(`/v2/${encodeURIComponent(orderCode)}/status`);
}

/** Batalkan transaksi di Midtrans secara langsung. */
export async function cancelTransaction(orderCode: string): Promise<Record<string, unknown>> {
  try {
    return await call(`/v2/${encodeURIComponent(orderCode)}/cancel`, {
      method: "POST",
    });
  } catch (err) {
    console.error(`[Midtrans Cancel Error] Order ${orderCode}:`, err);
    return { error: String(err) };
  }
}

/** Verifikasi tanda tangan webhook SHA-512 dengan perbandingan timing-safe. */
export function verifySignature(n: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  try {
    const expected = createHash("sha512")
      .update(
        n.order_id + n.status_code + n.gross_amount + env.MIDTRANS_SERVER_KEY,
      )
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(String(n.signature_key || ""));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Petik qr_string dari respons charge (berbeda tiap versi Midtrans). */
export function extractQrString(res: Record<string, unknown>): string | null {
  if (typeof res.qr_string === "string" && res.qr_string) return res.qr_string;
  // Fallback: cari di actions
  const actions = res.actions as Array<{ name: string; url: string }> | undefined;
  if (Array.isArray(actions)) {
    const qrAction = actions.find(
      (a) => a.name === "generate-qr-code" || a.name === "generate-qr-code-v2",
    );
    if (qrAction?.url) return qrAction.url;
  }
  return null;
}

/** Ekstrak rincian pembayaran untuk berbagai channel. */
export function extractPaymentDetails(
  res: Record<string, unknown>,
  method: PaymentMethod,
): PaymentDetails {
  if (method === "qris") {
    return {
      method: "qris",
      qrString: extractQrString(res),
    };
  }

  if (method === "bca_va" || method === "bni_va" || method === "bri_va") {
    const vaNumbers = res.va_numbers as Array<{ bank?: string; va_number?: string }> | undefined;
    const vaNumber = vaNumbers?.[0]?.va_number || null;
    const bank = vaNumbers?.[0]?.bank?.toUpperCase() || method.replace("_va", "").toUpperCase();
    return {
      method,
      vaNumber,
      bank,
    };
  }

  if (method === "permata_va") {
    const permataVa = (res.permata_va_number as string) ||
      (res.va_numbers as Array<{ va_number?: string }>)?.[0]?.va_number || null;
    return {
      method: "permata_va",
      vaNumber: permataVa,
      bank: "PERMATA",
    };
  }

  if (method === "mandiri_bill") {
    return {
      method: "mandiri_bill",
      billKey: (res.bill_key as string) || null,
      billerCode: (res.biller_code as string) || "70012",
      bank: "MANDIRI",
    };
  }

  if (method === "indomaret" || method === "alfamart") {
    return {
      method,
      paymentCode: (res.payment_code as string) || null,
      store: (res.store as string) || method,
    };
  }

  return {
    method: "qris",
    qrString: extractQrString(res),
  };
}
