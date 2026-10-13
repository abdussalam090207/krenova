"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AD_SEEN_KEY = "krenova:ad-shown";
const AD_DELAY_MS = 5000; // 5 detik setelah intro selesai

export function AdModal() {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    // Pastikan hanya muncul 1 kali per sesi
    try {
      if (sessionStorage.getItem(AD_SEEN_KEY) === "true") {
        return;
      }
    } catch {
      // jika sessionStorage disabled
    }

    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const startAdCountdown = () => {
      if (delayTimer) return;
      delayTimer = setTimeout(() => {
        // Tandai sudah ditampilkan
        try {
          sessionStorage.setItem(AD_SEEN_KEY, "true");
        } catch {
          /* noop */
        }
        setIsOpen(true);
      }, AD_DELAY_MS);
    };

    const root = document.documentElement;
    const isIntroPending = root.dataset.intro === "pending";

    if (isIntroPending) {
      // Tunggu hingga animasi intro KRENOVA STUDIO selesai
      const onIntroComplete = () => {
        startAdCountdown();
      };

      window.addEventListener("krenova:intro-complete", onIntroComplete, { once: true });

      // Fallback: MutationObserver untuk memeriksa atribut data-intro
      const observer = new MutationObserver(() => {
        if (root.dataset.intro === "seen") {
          observer.disconnect();
          startAdCountdown();
        }
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-intro"] });

      return () => {
        window.removeEventListener("krenova:intro-complete", onIntroComplete);
        observer.disconnect();
        if (delayTimer) clearTimeout(delayTimer);
      };
    } else {
      // Intro sudah selesai atau tidak ada splash, langsung hitung 5 detik
      startAdCountdown();
      return () => {
        if (delayTimer) clearTimeout(delayTimer);
      };
    }
  }, []);

  // Kunci scroll saat popup iklan aktif & pasang listener tombol ESC
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Iklan Promosi KRENOVA STUDIO"
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Latar belakang blur selayar penuh */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeModal}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-all cursor-pointer"
            aria-hidden="true"
          />

          {/* Kontainer modal iklan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 max-w-[92vw] sm:max-w-[460px] md:max-w-[500px] max-h-[88vh] overflow-hidden glass glass-strong shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_40px_rgba(75,148,214,0.3)] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tombol close di sudut kanan atas */}
            <button
              onClick={closeModal}
              aria-label="Tutup iklan"
              className="absolute top-1 right-1 sm:top-1 sm:right-1 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/65 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/30 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={20} strokeWidth={2.2} />
            </button>

            {/* Gambar Iklan add.png */}
            <div className="relative w-full overflow-hidden flex items-center justify-center bg-black/30">
              <Image
                src="/add.png"
                alt="Iklan Promosi KRENOVA STUDIO"
                width={893}
                height={1263}
                priority
                className="w-auto h-auto max-h-[82vh] max-w-full object-contain block select-none"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
