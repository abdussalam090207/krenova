"use client";
// components/katalog/ProductGallery.tsx — Galeri media produk
import { useState } from "react";
import Image from "next/image";
import { publicMediaUrl } from "@/lib/catalog/queries";
import type { CatalogMedia } from "@/lib/catalog/types";

interface Props {
  media: CatalogMedia[];
  title: string;
}

export function ProductGallery({ media, title }: Props) {
  const [active, setActive] = useState(0);

  if (!media.length) return null;

  const current = media[active];
  const mainUrl = current.kind === "video"
    ? (current.poster_path ? publicMediaUrl(current.poster_path, current.storage_backend) : null)
    : publicMediaUrl(current.path, current.storage_backend);

  return (
    <div className="space-y-3">
      {/* Media utama */}
      <div className="relative rounded-2xl overflow-hidden bg-black/30" style={{ aspectRatio: "4/3" }}>
        {current.kind === "video" ? (
          <video
            key={current.id}
            src={publicMediaUrl(current.path, current.storage_backend)}
            poster={current.poster_path ? publicMediaUrl(current.poster_path, current.storage_backend) : undefined}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            aria-label={`Video ${title}`}
          />
        ) : mainUrl ? (
          <Image
            src={mainUrl}
            alt={`${title} — gambar ${active + 1}`}
            fill
            sizes="(max-width:1024px) 100vw, 55vw"
            className="object-contain"
            priority={active === 0}
          />
        ) : null}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Galeri">
          {media.map((m, i) => {
            const thumbUrl = m.kind === "video"
              ? (m.poster_path ? publicMediaUrl(m.poster_path, m.storage_backend) : null)
              : publicMediaUrl(m.path, m.storage_backend);
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Gambar ${i + 1}`}
                onClick={() => setActive(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  i === active ? "border-blue" : "border-white/10 hover:border-white/30"
                }`}
              >
                {thumbUrl ? (
                  <Image src={thumbUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-3" aria-hidden>
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                )}
                {m.kind === "video" && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center" aria-hidden>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
