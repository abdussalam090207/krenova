"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface Props {
  title: string;
}

export function ShareButton({ title }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // dibatalkan user — tidak perlu handle
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard gagal — abaikan
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Bagikan projek ini"
        className="flex items-center justify-center w-10 h-10 rounded-xl glass transition-opacity hover:opacity-80"
        style={{ color: "var(--text-2)" }}
      >
        {copied ? <Check size={16} strokeWidth={2.5} /> : <Share2 size={16} />}
      </button>
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          Link disalin
        </div>
      )}
    </>
  );
}
