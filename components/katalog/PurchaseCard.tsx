"use client";
// components/katalog/PurchaseCard.tsx — Kartu CTA Pembelian Liquid Glass
import { useState } from "react";
import { CheckoutDialog } from "./CheckoutDialog";
import { PriceTag } from "./PriceTag";
import { ShareButton } from "./ShareButton";
import type { CatalogProduct } from "@/lib/catalog/types";
import { formatTanggal } from "@/lib/catalog/format";
import { catalogConfig } from "@/config/catalog";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";


interface Props {
  product: CatalogProduct;
  siteUrl: string;
}

export function PurchaseCard({ product, siteUrl }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const productUrl = `${siteUrl}/katalog/${product.slug}`;

  const waText = encodeURIComponent(
    `Halo KRENOVA STUDIO, saya tertarik dengan produk "${product.title}" (${productUrl}). Bagaimana cara pembeliannya?`,
  );
  const waUrl = `https://wa.me/${catalogConfig.supportWhatsapp}?text=${waText}`;

  return (
    <>
      <div className="glass-strong rounded-3xl p-6 md:p-7 space-y-5 border border-white/15 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
        {/* Glow ambient highlight */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue/15 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

        {/* Baris 1: Judul, Subjudul & Icon Bagikan */}
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-[--text] leading-tight">
              {product.title}
            </h2>
            {product.subtitle && (
              <p className="text-xs md:text-sm text-[--text-3] mt-1 leading-relaxed">
                {product.subtitle}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <ShareButton title={product.title} url={productUrl} />
          </div>
        </div>

        {/* Baris 2: Harga di kiri, Detail & Lisensi di kanan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-t border-b border-white/10 relative z-10">
          {/* Harga */}
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-3] mb-1">
              Harga
            </span>
            <PriceTag
              mode={product.purchase_mode}
              price={product.price_idr}
              size="lg"
            />
          </div>

          {/* Mini Box: Format, Detail & Lisensi */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-[--text-2] space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[--text-3]">Format:</span>
              <span className="font-semibold text-[--text] text-right uppercase">
                {product.formats && product.formats.length > 0
                  ? product.formats.join(", ")
                  : "PSD"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[--text-3]">Detail:</span>
              <span className="font-medium text-[--text] text-right">{formatTanggal(product.product_date)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[--text-3]">Lisensi:</span>
              <span className="font-medium text-[--text] text-right">{product.license_text || "Komersial & Personal"}</span>
            </div>
          </div>
        </div>

        {/* Baris 3: Button CTA dengan tema Liquid Glass */}
        <div className="relative z-10 pt-1">
          {product.purchase_mode === "paid" && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white cursor-pointer
                bg-gradient-to-r from-blue via-[#5B8DFF] to-blue
                hover:from-blue/90 hover:to-blue/90
                border border-white/30 
                transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
              Beli sekarang
            </button>
          )}

          {product.purchase_mode === "free" && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white cursor-pointer
                bg-gradient-to-r from-blue via-[#5B8DFF] to-blue
                hover:from-blue/90 hover:to-blue/90
                border border-white/30 
                transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
              Dapatkan gratis
            </button>
          )}

          {product.purchase_mode === "whatsapp" && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-6 rounded-3xl font-bold text-sm text-text cursor-pointer
                glass w-full flex items-center justify-center gap-2
                transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              Chat via WhatsApp
            </a>
          )}
        </div>

        {/* Sold count jika ada */}
        {product.sold_count >= 1 && (
          <p className="text-xs text-[--text-3] text-right pt-1">
             Terjual {product.sold_count} kali
          </p>
        )}
      </div>

      {(product.purchase_mode === "paid" || product.purchase_mode === "free") && (
        <CheckoutDialog
          product={product}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
