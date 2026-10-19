"use client";
// components/katalog/CopyButton.tsx — Salin ke clipboard dengan fallback
import { useState, useRef } from "react";

interface Props {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Salin" }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback untuk browser lama
        const el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Tersalin!" : label}
      aria-live="polite"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        border border-white/10 bg-white/5 hover:bg-white/10 text-text-2 hover:text-text cursor-pointer"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Tersalin!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
