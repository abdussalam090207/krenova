"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  orderCode: string;
  token: string;
  isPending: boolean;
}

export function OrderBackButton({ orderCode, token, isPending }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Kunci scroll body dan pasang listener Escape saat modal konfirmasi buka
  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cancelling) setShowModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showModal, cancelling]);

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!isPending) {
      router.push("/katalog");
      return;
    }
    // Jika pesanan masih pending, buka popup modal liquid glass
    setShowModal(true);
  }

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: orderCode, t: token }),
      });
    } catch (err) {
      console.error("[OrderBackButton] Gagal membatalkan pesanan:", err);
    } finally {
      setShowModal(false);
      router.push("/katalog");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBackClick}
        disabled={cancelling}
        className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors cursor-pointer disabled:opacity-50 group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Kembali ke Katalog</span>
      </button>

      {/* Liquid Glass Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop Liquid Glass */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (!cancelling) setShowModal(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl cursor-pointer"
              aria-hidden="true"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl glass glass-strong border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_45px_rgba(244,63,94,0.18)] bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-black/80 backdrop-blur-2xl text-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Radial Ambient Glow */}
              <div className="absolute -top-14 -left-14 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-14 -right-14 w-40 h-40 bg-blue/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={cancelling}
                aria-label="Tutup dialog"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>

              {/* Icon Warning Badge */}
              <div className="relative mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center bg-text-500/15 border border-text-500/30 text-text">
                <AlertTriangle size={26} className="animate-pulse" />
              </div>

              {/* Title & Description */}
              <h2
                id="cancel-modal-title"
                className="text-lg sm:text-xl font-bold font-display text-text mb-2 tracking-tight"
              >
                Batalkan Pesanan?
              </h2>

              <p className="text-xs sm:text-sm text-text-2 leading-relaxed mb-4">
                Apakah kamu ingin membatalkan pesanan ini dan kembali ke katalog? Sesi transaksi pembayaran akan dibatalkan.
              </p>

              {/* Order Code Chip */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-text glass px-3 py-1.5 mb-4">
                <span>Kode:</span>
                <span className="text-text-2 font-semibold">{orderCode}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-400/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Membatalkan Pesanan…</span>
                    </>
                  ) : (
                    <span>Ya, Batalkan Pesanan</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={cancelling}
                  className="w-full py-3 px-5 rounded-2xl font-semibold text-sm text-text-2 hover:text-text glass border border-white/15 hover:border-white/30 transition-all hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Tetap di Sini &amp; Lanjut Bayar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
