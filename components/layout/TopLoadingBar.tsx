"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * RouteWatcher — Memantau perubahan rute (pathname & searchParams).
 * Menggunakan Suspense boundary sesuai rekomendasi resmi Next.js App Router.
 */
function RouteWatcher({ onComplete }: { onComplete: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Abaikan render pertama agar tidak memicu animasi saat halaman pertama kali dibuka
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Rute telah berubah -> selesaikan animasi bar
    onCompleteRef.current();
  }, [pathname, searchParams]);

  return null;
}

/**
 * TopLoadingBar — Bar progress animasi halus di bagian atas layar saat transisi antar halaman.
 * Menggunakan variabel warna dari globals.css (--blue, --violet, --aqua) dengan efek shimmer & glow.
 */
export function TopLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const trickleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
  }, []);

  const done = useCallback(() => {
    if (!isNavigatingRef.current) return;
    clearAllTimers();
    isNavigatingRef.current = false;

    setIsFinishing(true);
    setProgress(100);

    // Tampilkan 100% sejenak, lalu fade out secara halus
    finishTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
        setIsFinishing(false);
      }, 300);
    }, 180);
  }, [clearAllTimers]);

  const start = useCallback(() => {
    // Jalankan di microtask/macrotask terpisah agar tidak pernah bentrok dengan siklus render React 19
    setTimeout(() => {
      clearAllTimers();
      isNavigatingRef.current = true;
      setIsFinishing(false);
      setVisible(true);
      setProgress(20);

      // Trickle progress secara dinamis agar bar terlihat responsif dan hidup
      trickleTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
            return 88;
          }
          const remaining = 88 - prev;
          const step = Math.max(1, Math.round(remaining * 0.14));
          return Math.min(88, prev + step);
        });
      }, 200);

      // Timeout pengaman agar bar tidak menggantung jika navigasi dibatalkan
      safetyTimerRef.current = setTimeout(() => {
        if (isNavigatingRef.current) {
          done();
        }
      }, 8000);
    }, 0);
  }, [clearAllTimers, done]);

  useEffect(() => {
    // 1. Delegasi klik pada semua tag <a> internal
    const handleAnchorClick = (e: MouseEvent) => {
      // Abaikan jika bukan klik kiri biasa (e.g. klik tengah, ctrl+klik, cmd+klik untuk tab baru)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Abaikan target="_blank", download, link protokol khusus (mailto, tel, javascript)
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        return;
      }

      // Validasi origin URL tujuan
      let targetUrl: URL;
      try {
        targetUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (targetUrl.origin !== window.location.origin) return;

      // Abaikan jika hanya berupa anchor hash di halaman yang sama (misal #kontak)
      const isSamePageAnchor =
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search &&
        targetUrl.hash !== "";
      if (isSamePageAnchor) return;

      // Abaikan jika URL tujuan sama persis dengan URL saat ini
      if (targetUrl.href === window.location.href) return;

      // Mulai bar loading saat navigasi halaman terdeteksi
      start();
    };

    // 2. Navigasi tombol Back / Forward browser
    const handlePopState = () => {
      start();
    };

    // 3. Listener kustom jika ada navigasi programmatic yang ingin memicu loading bar
    const handleCustomStart = () => start();
    const handleCustomDone = () => done();

    document.addEventListener("click", handleAnchorClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("krenova:nav-start", handleCustomStart);
    window.addEventListener("krenova:nav-done", handleCustomDone);

    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("krenova:nav-start", handleCustomStart);
      window.removeEventListener("krenova:nav-done", handleCustomDone);
      clearAllTimers();
    };
  }, [start, done, clearAllTimers]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher onComplete={done} />
      </Suspense>

      <div
        className="top-loading-bar-container"
        style={{
          opacity: visible ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div
          className={`top-loading-bar ${isFinishing ? "top-loading-bar-finishing" : ""}`}
          style={{
            transform: `translate3d(-${100 - progress}%, 0, 0)`,
          }}
        >
          {/* Ujung pendar cahaya (glow peg) */}
          <div className="top-loading-bar-peg" />
        </div>
      </div>
    </>
  );
}
