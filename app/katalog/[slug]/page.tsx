// app/katalog/[slug]/page.tsx — Halaman detail produk (UI selaras dengan Project Preview)
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProductBySlug, getRelatedProducts, publicMediaUrl } from "@/lib/catalog/queries";
import { ProductGallery } from "@/components/katalog/ProductGallery";
import { PurchaseCard } from "@/components/katalog/PurchaseCard";
import { CatalogCard } from "@/components/katalog/CatalogCard";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Produk tidak ditemukan — KRENOVA STUDIO" };

  const coverMedia = product.catalog_product_media?.[0];
  const coverUrl   = coverMedia ? publicMediaUrl(coverMedia.poster_path ?? coverMedia.path, coverMedia.storage_backend) : undefined;

  return {
    title: `${product.title} — KRENOVA STUDIO`,
    description: product.subtitle ?? product.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: product.title,
      description: product.subtitle ?? undefined,
      images: coverUrl ? [{ url: coverUrl }] : [],
    },
    alternates: { canonical: `${SITE_URL}/katalog/${slug}` },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product  = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category).catch(() => []);

  return (
    <main className="min-h-screen pt-28 md:pt-36 pb-20 mx-auto max-w-7xl px-5 md:px-8">
      {/* Navigasi Kembali */}
      <Link
        href="/katalog"
        className="inline-flex items-center gap-1 text-sm text-[--text-2] hover:text-[--text] transition-colors mb-8 cursor-pointer"
      >
        <ChevronLeft size={16} />
        Kembali ke Katalog
      </Link>

      {/* Panel Utama Liquid Glass — Menyamakan UI dengan Project Page */}
      <div className="glass-strong rounded-[32px] p-6 md:p-8 lg:p-10 border border-white/10 shadow-2xl">
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-8 lg:gap-12">
          {/* Kolom Kiri: Galeri Media (Sticky) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery
              media={product.catalog_product_media ?? []}
              title={product.title}
            />
          </div>

          {/* Kolom Kanan: Informasi Produk & Card Pembelian */}
          <div className="flex flex-col gap-6">
            {/* Kategori Badge Liquid Glass */}
            <div>
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold glass text-[--text]">
                {product.category || "Desain Grafis"}
              </span>
            </div>

            {/* Judul & Subjudul */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-text leading-tight mb-2">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="text-sm md:text-base text-[--text-2] leading-relaxed">
                  {product.subtitle}
                </p>
              )}
            </div>

            {/* Deskripsi */}
            {product.description && (
              <div className="text-sm md:text-base text-[--text-2] whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
            )}

            {/* Point-point Highlights (Tanpa heading "Yang kamu dapat") */}
            {product.highlights && product.highlights.length > 0 && (
              <ul className="space-y-2.5 my-1">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-1 w-4 h-4 rounded-full bg-[--input-bg] border border-[--text-2] flex items-center justify-center flex-shrink-0 text-[--text-2]" aria-hidden>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                    <span className="leading-snug text-[--text-2]">{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Tag-tag di bawah point-point */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {product.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/katalog?q=${encodeURIComponent(t)}`}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg border border-[--glass-border] text-xs text-[--text-3] hover:text-[--text] hover:border-[--text-3] transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            {/* Card Pembelian */}
            <PurchaseCard product={product} siteUrl={SITE_URL} />
          </div>
        </div>
      </div>

      {/* Produk Lainnya (Mirip Related Projects) */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-bold text-xl md:text-2xl text-[--text] mb-6">
            Produk lainnya
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <CatalogCard key={p.id} product={p} siteUrl={SITE_URL} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
