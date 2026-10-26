"use client";
// components/katalog/CatalogCard.tsx — Kartu produk di grid
import Link from "next/link";
import Image from "next/image";
import { ShareButton } from "./ShareButton";
import { PriceTag } from "./PriceTag";
import { publicMediaUrl } from "@/lib/catalog/queries";
import type { CatalogProduct } from "@/lib/catalog/types";

interface Props {
  product: CatalogProduct;
  siteUrl: string;
  isBestSeller?: boolean;
}

export function CatalogCard({ product, siteUrl, isBestSeller }: Props) {
  const cover = product.catalog_product_media?.[0];
  const coverUrl = cover ? publicMediaUrl(cover.poster_path ?? cover.path, cover.storage_backend) : null;
  const hasVideo = cover?.kind === "video";
  const productUrl = `${siteUrl}/katalog/${product.slug}`;

  const visibleFormats = product.formats.slice(0, 3);
  const extraFormats   = product.formats.length > 3 ? product.formats.length - 3 : 0;

  return (
    <article className="relative group rounded-2xl overflow-hidden border border-white/10
      hover:border-white/20 transition-all duration-200 bg-white/[0.03]">
      {/* Thumbnail 4:3 */}
      <div className="relative" style={{ aspectRatio: "4/3" }}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={product.title}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-3/20">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
        )}

        {/* Video badge */}
        {hasVideo && (
          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center" aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        )}

        {/* Lencana Gratis */}
        {product.purchase_mode === "free" && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold
            glass text-text">
            Gratis
          </div>
        )}

        {/* Lencana Terlaris (hanya bila sold_count ≥ 1 dan ditandai) */}
        {isBestSeller && product.sold_count >= 1 && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold
            glass text-text">
            Terlaris
          </div>
        )}

        {/* Tombol bagikan — di atas stretched link */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.preventDefault()}>
          <ShareButton title={product.title} url={productUrl} />
        </div>
      </div>

      {/* Stretched link — seluruh kartu jadi tautan */}
      <Link
        href={`/katalog/${product.slug}`}
        className="absolute inset-0"
        aria-label={product.title}
      />

      {/* Konten kartu */}
      <div className="p-3 relative pointer-events-none">
        {/* Format chips */}
        {product.formats.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {visibleFormats.map((f) => (
              <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-text-2 font-medium">
                {f}
              </span>
            ))}
            {extraFormats > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-text-2">
                +{extraFormats}
              </span>
            )}
          </div>
        )}

        {/* Judul */}
        <h2 className="text-sm font-bold text-text leading-snug line-clamp-2 mb-0.5">
          {product.title}
        </h2>
        

        {/* Subjudul */}
        {product.subtitle && (
          <p className="text-xs text-text-2 line-clamp-1 mb-2">{product.subtitle}</p>
        )}

        {/* Footer: harga + terjual */}
        <div className="flex items-center justify-between gap-2">
          <PriceTag mode={product.purchase_mode} price={product.price_idr} size="sm" />
          {product.sold_count >= 1 && (
            <span className="text-[11px] text-text-3">Terjual {product.sold_count}</span>
          )}
        </div>
      </div>
    </article>
  );
}
