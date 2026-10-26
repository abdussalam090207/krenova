"use client";
// components/katalog/OrderPending.tsx — Tampilan Pembayaran Multi-Channel + Custom Liquid Glass Dropdown + Auto-Cancel + Midtrans Watermark
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { PaymentDetails, PaymentMethod } from "@/lib/catalog/types";
import { catalogConfig } from "@/config/catalog";

interface Props {
  orderCode: string;
  token: string;
  productTitle: string;
  amountIdr: number;
  qrDataUrl?: string | null;
  paymentDetails?: PaymentDetails | null;
  paymentMethod?: PaymentMethod | string | null;
  expiresAt: string | null;
  isSandbox: boolean;
}

interface ReconcileFeedback {
  type: "success" | "pending" | "info" | "error";
  message: string;
}

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "qris", label: "QRIS & E-Wallet" },
  { value: "bca_va", label: "BCA Virtual Account" },
  { value: "mandiri_bill", label: "Mandiri Bill" },
  { value: "bni_va", label: "BNI Virtual Account" },
  { value: "bri_va", label: "BRI Virtual Account" },
  { value: "permata_va", label: "Permata Virtual Account" },
  { value: "indomaret", label: "Indomaret" },
  { value: "alfamart", label: "Alfamart" },
];

export function OrderPending({
  orderCode,
  token,
  productTitle,
  amountIdr,
  qrDataUrl,
  paymentDetails,
  paymentMethod = "qris",
  expiresAt,
  isSandbox,
}: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stoppedRef = useRef(false);
  const beaconActiveRef = useRef(true);

  // State metode pembayaran aktif & rincian pembayaran (mendukung pergantian dinamis)
  const initialMethod = (paymentDetails?.method || (paymentMethod as PaymentMethod) || "qris");
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(initialMethod);
  const [currentDetails, setCurrentDetails] = useState<PaymentDetails | null>(paymentDetails ?? null);
  const [currentQrDataUrl, setCurrentQrDataUrl] = useState<string | null>(qrDataUrl ?? null);
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State untuk feedback & UI
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<ReconcileFeedback | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Countdown masa berlaku
  const countdown = useCountdown(expiresAt);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Timer cooldown tombol cek status
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Polling otomatis status
  const checkStatus = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const res = await fetch(
        `/api/orders/check?code=${encodeURIComponent(orderCode)}&t=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { status: string; paid?: boolean };
      if (data.status === "paid" || data.paid) {
        stoppedRef.current = true;
        beaconActiveRef.current = false;
        setFeedback({
          type: "success",
          message: "Pembayaran terdeteksi lunas! Mengalihkan ke halaman produk...",
        });
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 800);
        return;
      }
      if (["expired", "canceled", "failed"].includes(data.status)) {
        stoppedRef.current = true;
        beaconActiveRef.current = false;
        router.refresh();
        return;
      }
    } catch {
      // backoff
    }
  }, [orderCode, router, token]);

  // Polling dengan setTimeout berantai
  useEffect(() => {
    let elapsed = 0;
    const FAST_MS = 3000;
    const SLOW_MS = 6000;
    const FAST_DUR = 2 * 60 * 1000;

    function schedule() {
      if (stoppedRef.current) return;
      const expiryMs = expiresAt ? new Date(expiresAt).getTime() + 60_000 - Date.now() : Infinity;
      if (expiryMs <= 0) {
        stoppedRef.current = true;
        return;
      }

      const delay = elapsed < FAST_DUR ? FAST_MS : SLOW_MS;
      elapsed += delay;
      timerRef.current = setTimeout(async () => {
        if (document.visibilityState !== "hidden") {
          await checkStatus();
        }
        schedule();
      }, delay);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible" && !stoppedRef.current) {
        checkStatus();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    schedule();
    return () => {
      stoppedRef.current = true;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkStatus, expiresAt]);

  // Auto-cancel saat user menutup tab, undo page browser, atau meninggalkan halaman (beforeunload, pagehide, popstate)
  useEffect(() => {
    const handleUnload = () => {
      if (!beaconActiveRef.current || stoppedRef.current) return;
      const payload = JSON.stringify({ code: orderCode, t: token });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/orders/cancel", blob);
      } else {
        fetch("/api/orders/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };

    // Auto-cancel saat user menutup tab / navigasi keluar
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("popstate", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("popstate", handleUnload);
    };
  }, [orderCode, token]);

  // Ganti metode pembayaran dinamis dari dropdown Liquid Glass di bawah
  async function handleSwitchPayment(newMethod: PaymentMethod) {
    if (newMethod === activeMethod || isSwitchingMethod) return;

    setIsSwitchingMethod(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/orders/change-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: orderCode,
          t: token,
          paymentMethod: newMethod,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setActiveMethod(data.paymentMethod);
        setCurrentDetails(data.paymentDetails);
        if (data.qrDataUrl) {
          setCurrentQrDataUrl(data.qrDataUrl);
        }
        setFeedback({
          type: "info",
          message: `Metode pembayaran berhasil dialihkan ke ${getPaymentLabel(data.paymentMethod)}.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal mengganti metode pembayaran.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Koneksi bermasalah saat mengganti metode pembayaran.",
      });
    } finally {
      setIsSwitchingMethod(false);
    }
  }

  // Manual Reconcile / Cek Status
  async function handleReconcile() {
    if (isChecking || cooldown > 0) return;
    setIsChecking(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/orders/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: orderCode, t: token }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        paid?: boolean;
        error?: string;
        message?: string;
      };

      if (res.status === 429 || data.error === "rate_limited") {
        setFeedback({
          type: "info",
          message: "Pengecekan terlalu sering. Mohon tunggu beberapa detik.",
        });
        setCooldown(5);
        return;
      }

      if (data.status === "paid" || data.paid) {
        setFeedback({
          type: "success",
          message: "Pembayaran berhasil diverifikasi! Menyiapkan produk...",
        });
        stoppedRef.current = true;
        beaconActiveRef.current = false;
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 800);
        return;
      }

      if (data.status === "pending") {
        setFeedback({
          type: "pending",
          message: isSandbox
            ? "Pembayaran belum terdeteksi. Selesaikan pembayaran di simulator Midtrans lalu klik cek kembali."
            : "Pembayaran belum terdeteksi. Silakan selesaikan pembayaran sesuai instruksi di bawah, lalu klik cek kembali.",
        });
        setCooldown(5);
        return;
      }

      if (data.status && ["expired", "canceled", "failed"].includes(data.status)) {
        setFeedback({
          type: "error",
          message: `Status pesanan: ${data.status}. Memuat ulang halaman...`,
        });
        stoppedRef.current = true;
        beaconActiveRef.current = false;
        router.refresh();
        return;
      }

      setFeedback({
        type: "error",
        message: data.message || "Status belum berubah. Silakan coba beberapa saat lagi.",
      });
      setCooldown(4);
    } catch {
      setFeedback({
        type: "error",
        message: "Gagal terhubung ke server untuk mengecek status. Coba lagi.",
      });
      setCooldown(4);
    } finally {
      setIsChecking(false);
    }
  }

  // Download QR Code
  function downloadQr() {
    if (!currentQrDataUrl) return;
    const a = document.createElement("a");
    a.href = currentQrDataUrl;
    a.download = `QRIS-${orderCode}.png`;
    a.click();
  }

  const isQris = activeMethod === "qris";
  const isVA =
    activeMethod.endsWith("_va") ||
    activeMethod === "bca_va" ||
    activeMethod === "bni_va" ||
    activeMethod === "bri_va" ||
    activeMethod === "permata_va";
  const isMandiri = activeMethod === "mandiri_bill";
  const isOtc = activeMethod === "indomaret" || activeMethod === "alfamart";

  const waMsg = encodeURIComponent(
    `Halo KRENOVA STUDIO, saya butuh bantuan untuk pesanan ${orderCode} (${productTitle}).`,
  );
  const waUrl = `https://wa.me/${catalogConfig.supportWhatsapp}?text=${waMsg}`;

  // Simulator URL untuk Sandbox DOKU
  let simulatorUrl = "https://sandbox.doku.com";
  let simulatorLabel = "Simulator Pembayaran DOKU";
  if (isVA || isMandiri) {
    simulatorUrl = "https://sandbox.doku.com";
    simulatorLabel = "Simulator Virtual Account DOKU";
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Sandbox Notice */}
      {isSandbox && (
        <div className="px-4 py-2.5 rounded-2xl bg-yellow-400/10 border border-yellow-400/25 text-yellow-300 text-xs text-center backdrop-blur-md">
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-yellow-400/20 px-1.5 py-0.5 rounded mr-1.5">
            Sandbox
          </span>
          Uji pembayaran melalui{" "}
          <a
            href={simulatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-yellow-200 hover:text-white transition-colors"
          >
            {simulatorLabel} →
          </a>
        </div>
      )}

      {/* Main Payment Card (Liquid Glass) */}
      <div className="glass glass-strong rounded-3xl p-6 md:p-7 text-center space-y-5 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.3)] bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-white/[0.03] backdrop-blur-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue/15 rounded-full blur-3xl pointer-events-none -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-violet/10 rounded-full blur-3xl pointer-events-none -ml-8 -mb-8" />

        {/* Product Title & Total (Tanpa tag badge di atas harga) */}
        <div className="space-y-1 relative z-10">
          <h2 className="text-base md:text-lg font-bold text-text line-clamp-1">{productTitle}</h2>
          <p className="text-3xl md:text-4xl font-display font-bold text-text tabular-nums tracking-tight">
            Rp {amountIdr.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Loading overlay saat pergantian metode */}
        {isSwitchingMethod && (
          <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center gap-3 relative z-10 animate-fade-in">
            <Loader2 size={26} className="animate-spin text-text" />
            <p className="text-xs text-text-2">Menyiapkan rincian pembayaran...</p>
          </div>
        )}

        {/* ── CHANNEL 1: QRIS (DEFAULT) ── */}
        {!isSwitchingMethod && isQris && (
          currentQrDataUrl ? (
            <div className="space-y-3 relative z-10 animate-fade-in">
              <div className="mx-auto bg-white rounded-2xl p-3 w-fit shadow-lg shadow-black/40 border border-white/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentQrDataUrl} alt="QRIS Code" width={260} height={260} className="block rounded-lg" />
              </div>

              <p className="text-xs text-text-2 leading-relaxed max-w-xs mx-auto">
                Pindai QR ini dengan GoPay, OVO, DANA, ShopeePay, BCA, Livin&apos;, atau aplikasi perbankan apa saja.
              </p>

              {currentDetails?.qrString?.startsWith("http") && (
                <div className="pt-1">
                  <a
                    href={currentDetails.qrString}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-blue/80 hover:bg-blue border border-white/20 transition-all shadow-lg shadow-blue/25"
                  >
                    Buka Halaman Pembayaran DOKU →
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center gap-3 relative z-10 animate-fade-in">
              <Loader2 size={28} className="animate-spin text-blue" />
              <p className="text-xs text-text-2">Membuat kode QRIS pembayaran...</p>
            </div>
          )
        )}

        {/* ── CHANNEL 2: VIRTUAL ACCOUNT (BCA, BNI, BRI, Permata) ── */}
        {!isSwitchingMethod && isVA && (
          <div className="space-y-4 relative z-10 text-left">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-3 uppercase tracking-wider">
                  Nomor Virtual Account {currentDetails?.bank || ""}
                </span>
                <span className="text-[11px] font-medium text-text glass-strong px-1 py-0.5 rounded-full border border-white/20">
                  Otomatis Terverifikasi
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xl md:text-2xl font-mono font-bold text-text tracking-wider select-all break-all">
                  {currentDetails?.vaNumber || "Memuat nomor VA..."}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentDetails?.vaNumber || "", "va")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold glass border border-white/20 hover:bg-white/15 text-text transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "va" ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-text-2 space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="font-semibold text-text">Petunjuk Transfer:</p>
              <ul className="list-disc pl-4 space-y-1 text-text-2">
                <li>Buka aplikasi Mobile Banking atau ATM bank pilihanmu.</li>
                <li>Pilih menu <strong>Transfer &gt; Virtual Account</strong>.</li>
                <li>Masukkan nomor VA di atas dan pastikan nominal tepat <strong>Rp {amountIdr.toLocaleString("id-ID")}</strong>.</li>
                <li>Konfirmasi pembayaran dan simpan bukti transfer.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── CHANNEL 3: MANDIRI BILL ── */}
        {!isSwitchingMethod && isMandiri && (
          <div className="space-y-4 relative z-10 text-left">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15 space-y-3">
              {/* Biller Code */}
              <div>
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider block mb-1">
                  Kode Perusahaan (Biller Code)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-mono font-bold text-text tracking-wider">
                    {currentDetails?.billerCode || "70012"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentDetails?.billerCode || "70012", "biller")}
                    className="px-3 py-1 rounded-xl text-xs font-medium glass border border-white/20 hover:bg-white/15 text-text transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "biller" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === "biller" ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-2">
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider block mb-1">
                  Nomor Pembayaran (Bill Key)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg md:text-xl font-mono font-bold text-text tracking-wider select-all break-all">
                    {currentDetails?.billKey || "Memuat..."}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentDetails?.billKey || "", "billkey")}
                    className="px-3 py-1 rounded-xl text-xs font-medium glass border border-white/20 hover:bg-white/15 text-text transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "billkey" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === "billkey" ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-text-2 space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="font-semibold text-text">Petunjuk Livin&apos; by Mandiri:</p>
              <ul className="list-disc pl-4 space-y-1 text-text-2">
                <li>Buka aplikasi Livin&apos; by Mandiri &gt; Menu <strong>Bayar &gt; Pembayaran Baru</strong>.</li>
                <li>Pilih <strong>Multi Payment</strong> &gt; Masukkan penyedia jasa <strong>70012 (Midtrans)</strong>.</li>
                <li>Masukkan Bill Key di atas, lalu lakukan konfirmasi pembayaran.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── CHANNEL 4: GERAI RETAIL (Indomaret / Alfamart) ── */}
        {!isSwitchingMethod && isOtc && (
          <div className="space-y-4 relative z-10 text-left">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-3 uppercase tracking-wider">
                  Kode Pembayaran {activeMethod === "indomaret" ? "Indomaret" : "Alfamart"}
                </span>
                <span className="text-[11px] font-medium glass-strong rounded-full p-1.5 border border-text/20">
                  Bayar di Kasir
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xl md:text-2xl font-mono font-bold text-text tracking-wider select-all break-all">
                  {currentDetails?.paymentCode || "Memuat kode..."}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentDetails?.paymentCode || "", "otc")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold glass border border-white/20 hover:bg-white/15 text-text transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "otc" ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-text-2 space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="font-semibold text-text">Petunjuk Pembayaran Kasir:</p>
              <ul className="list-disc pl-4 space-y-1 text-text-2">
                <li>Kunjungi gerai <strong>{activeMethod === "indomaret" ? "Indomaret / Ceriamart" : "Alfamart / Alfamidi / Lawson"}</strong> terdekat.</li>
                <li>Sampaikan ke kasir ingin melakukan pembayaran <strong>Midtrans / Transaksi Online</strong>.</li>
                <li>Tunjukkan kode pembayaran di atas ke kasir.</li>
                <li>Bayar sesuai nominal yang tertera dan simpan struk pembayaran.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── CUSTOM LIQUID GLASS DROPDOWN (PILIHAN METODE PEMBAYARAN LAINNYA) ── */}
        <div className="pt-2 text-left relative z-20 border-t border-white/10" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
            Pilihan Metode Pembayaran Lainnya
          </label>

          <div className="relative">
            {/* Trigger Button */}
            <button
              type="button"
              disabled={isSwitchingMethod}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full px-4 py-3 rounded-2xl text-xs md:text-sm glass border border-white/15 hover:border-white/30 focus:border-blue/60 transition-all text-text flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span className="font-medium text-text">{getPaymentLabel(activeMethod)}</span>
              {isSwitchingMethod ? (
                <Loader2 size={15} className="animate-spin text-blue" />
              ) : (
                <ChevronDown
                  size={16}
                  className={`text-text-3 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {/* Custom Glass Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl glass-popover glass-scrollbar border border-white/20 p-1.5 space-y-1 animate-fade-in max-h-64 overflow-y-auto">
                {PAYMENT_OPTIONS.map((opt) => {
                  const isSelected = activeMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleSwitchPayment(opt.value);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${isSelected
                        ? "bg-white/[0.12] text-text font-semibold border border-text/20 shadow-sm"
                        : "text-text-2 hover:text-text-2 hover:bg-white/[0.06]"
                        }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="text-text shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Countdown Timer */}
        {countdown && (
          <p className="w-full text-xs md:text-sm text-text-2 border border-white/12 rounded-xl p-2.5 font-mono relative z-10 bg-white/[0.02]">
            Masa berlaku pembayaran: <span className="text-text font-bold text-blue">{countdown}</span>
          </p>
        )}

        {/* Action Buttons (Tombol Batalkan Pesanan dihapus sesuai permintaan) */}
        <div className="flex flex-wrap gap-2.5 justify-center relative z-10 pt-1">
          {/* Simpan QR (hanya jika QRIS) */}
          {isQris && currentQrDataUrl && (
            <button
              type="button"
              onClick={downloadQr}
              className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold glass border border-white/15 hover:bg-white/12 text-text transition-all cursor-pointer"
            >
              Simpan QR
            </button>
          )}

          {/* Cek Status Pembayaran */}
          <button
            type="button"
            onClick={handleReconcile}
            disabled={isChecking || cooldown > 0}
            className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold glass border border-blue/40 bg-blue/15 hover:bg-blue/25 text-text transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isChecking ? (
              <>
                <RefreshCw size={14} className="animate-spin text-text" />
                <span>Memeriksa status...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Cek lagi ({cooldown}s)</span>
            ) : (
              <span>Cek status pembayaran</span>
            )}
          </button>

          {/* WhatsApp Support */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium glass border border-white/12 hover:bg-white/10 text-text-2 hover:text-text transition-all inline-flex items-center"
          >
            Butuh bantuan?
          </a>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs text-left transition-all flex items-start gap-2.5 relative z-10 animate-fade-in ${feedback.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/35 text-emerald-300"
              : feedback.type === "pending"
                ? "bg-amber-500/15 border border-amber-500/35 text-amber-300"
                : feedback.type === "info"
                  ? "bg-blue/15 border border-blue/35 text-blue-300"
                  : "bg-rose-500/15 border border-rose-500/35 text-rose-300"
              }`}
          >
            <div className="shrink-0 mt-0.5">
              {feedback.type === "success" && <ShieldCheck size={16} className="text-emerald-400" />}
              {feedback.type === "pending" && <AlertTriangle size={16} className="text-amber-400" />}
              {feedback.type === "info" && <RefreshCw size={16} className="text-blue" />}
              {feedback.type === "error" && <AlertTriangle size={16} className="text-rose-400" />}
            </div>
            <div className="flex-1 leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* ── WATERMARK: POWERED BY MIDTRANS (Liquid Glass Aesthetic) ── */}
        <div className="pt-4 border-t border-white/[0.08] relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-text-3 text-[11px] select-none">
          <div className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
            <svg
              className="w-3.5 h-3.5 text-text shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V13H5V8.26l7-3.89v8.62z" />
            </svg>
            <span className="tracking-wide text-text">
              Powered by <strong className="font-semibold text-text-2 tracking-normal">Midtrans</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-text-3">
            <span>256-Bit SSL Secured</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Bank-Grade Encryption</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-3 text-center">
        Kode pesanan: <code className="font-mono text-text-2">{orderCode}</code>
      </p>
    </div>
  );
}

// ─── Helper function label metode (teks bersih tanpa icon/emoji) ───────────
function getPaymentLabel(m: PaymentMethod): string {
  switch (m) {
    case "qris":
      return "QRIS & E-Wallet";
    case "bca_va":
      return "BCA Virtual Account";
    case "mandiri_bill":
      return "Mandiri Bill";
    case "bni_va":
      return "BNI Virtual Account";
    case "bri_va":
      return "BRI Virtual Account";
    case "permata_va":
      return "Permata Virtual Account";
    case "indomaret":
      return "Indomaret";
    case "alfamart":
      return "Alfamart";
    default:
      return m;
  }
}

// ─── Helper hook: countdown ───────────────────────────────────────────────
function useCountdown(expiresAt: string | null): string | null {
  const [text, setText] = useState<string | null>(() => fmtCountdown(expiresAt));

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setText(fmtCountdown(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return text;
}

function fmtCountdown(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}
