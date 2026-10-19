"use client";
// components/katalog/ShareButton.tsx — Tombol bagikan produk
import { useState } from "react";

interface Props {
  title: string;
  url: string; // URL halaman produk (BUKAN halaman pesanan)
  className?: string;
}

export function ShareButton({ title, url, className = "" }: Props) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    // Pastikan bukan URL pesanan (token tidak boleh dibagikan)
    if (url.includes("/pesanan/")) return;

    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Cek produk ini dari KRENOVA STUDIO: ${title}`, url });
      } else {
        // Fallback: salin ke clipboard
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // User canceled share — noop
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Bagikan produk ini"
      aria-live="polite"
      title={shared ? "Link disalin!" : "Bagikan"}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full
        glass border border-white/10 text-text-2 hover:text-text hover:border-white/25
        transition-all cursor-pointer ${className}`}
    >
      {shared ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
        </svg>
      )}
    </button>
  );
}
