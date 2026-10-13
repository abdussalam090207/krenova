"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_MS = 3500; // 3000ms teks + 500ms overlay memudar

export function IntroSplash() {
  const [visible, setVisible] = useState(true);
  // Ref untuk menyimpan flag awal — dievaluasi di effect, bukan saat render
  const shouldShowRef = useRef<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    // Cek flag SEKALI di effect, simpan ke ref
    if (shouldShowRef.current === null) {
      shouldShowRef.current = root.dataset.intro === "pending";
    }

    if (!shouldShowRef.current) {
      // Gunakan fungsi updater agar setState tidak "langsung" di body effect
      setVisible(() => false);
      return;
    }

    // Tandai sudah dilihat di sesi ini
    try { sessionStorage.setItem("krenova:intro", "1"); } catch { /* noop */ }

    // Kunci scroll selama splash
    document.body.style.overflow = "hidden";

    const t = setTimeout(() => {
      root.dataset.intro = "seen";
      window.dispatchEvent(new CustomEvent("krenova:intro-complete"));
      document.body.style.overflow = "";
      setVisible(() => false);
    }, TOTAL_MS);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="intro-splash"
      aria-hidden="true"
      className="fixed inset-0 z-[9999] items-center justify-center bg-black"
    >
      <p
        className="intro-text text-center font-display font-bold text-white tracking-tight leading-[0.95]"
        style={{ fontSize: "clamp(2.5rem, 11vw, 7rem)" }}
      >
        KRENOVA <br className="sm:hidden" />STUDIO
      </p>
    </div>
  );
}
