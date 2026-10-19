// lib/catalog/format.ts — Utilitas format (aman di client & server)

/** Format angka ke Rupiah, mis. 25000 → "Rp 25.000" */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format tanggal ke lokal id-ID, mis. "16 Oktober 2026" */
export function formatTanggal(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Format waktu ke lokal id-ID dengan zona waktu Jakarta */
export function formatWaktu(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB";
  } catch {
    return isoStr;
  }
}

/** Samarkan email: "user@gmail.com" → "u***@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/** Rasio aspek media ke string CSS "4 / 3" */
export function aspectRatio(w: number | null, h: number | null): string {
  if (!w || !h) return "4 / 3";
  const g = gcd(w, h);
  return `${w / g} / ${h / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Format ukuran file bytes ke KB/MB */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Teks label harga sesuai mode */
export function priceLabel(
  mode: "paid" | "free" | "whatsapp",
  price: number | null,
): string {
  if (mode === "free") return "Gratis";
  if (mode === "whatsapp") {
    if (price) return `Mulai ${formatRupiah(price)} · nego via WhatsApp`;
    return "Hubungi via WhatsApp";
  }
  return formatRupiah(price);
}
