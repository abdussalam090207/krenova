// app/katalog/page.tsx — Grid katalog marketplace
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/catalog/queries";
import { CatalogCard } from "@/components/katalog/CatalogCard";
import { CatalogFilters } from "@/components/katalog/CatalogFilters";
import type { CatalogFilters as Filters } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog | KRENOVA STUDIO",
  description: "Produk digital siap pakai: template, mockup, dan aset desain dari KRENOVA STUDIO.",
  openGraph: {
    title: "Katalog Produk Digital — KRENOVA STUDIO",
    description: "Produk digital siap pakai: template, mockup, dan aset desain dari KRENOVA STUDIO.",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

interface PageProps {
  searchParams: Promise<Record<string, string | string[]>>;
}

export default async function KatalogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "");

  const filters: Filters = {
    q:       get("q")       || undefined,
    kategori: get("kategori") || undefined,
    mode:    (get("mode")   as Filters["mode"]) || undefined,
    format:  get("format")  || undefined,
    urut:    (get("urut")   as Filters["urut"]) || undefined,
    page:    Number(get("page")) || 1,
  };

  let result: Awaited<ReturnType<typeof listProducts>>;
  try {
    result = await listProducts(filters);
  } catch {
    return (
      <main className="min-h-screen pt-32 pb-20 px-5 max-w-6xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-text mb-4">Katalog</h1>
        <p className="text-text-3">Katalog gagal dimuat.</p>
        <Link href="/katalog" className="mt-4 inline-block text-blue hover:underline text-sm">Coba lagi</Link>
      </main>
    );
  }

  const { items, total, categories, allFormats } = result;

  // Tentukan terlaris (sold_count tertinggi, hanya bila ≥ 1)
  const maxSold = items.reduce((m, p) => Math.max(m, p.sold_count), 0);
  const bestSellerId = maxSold >= 1 ? items.find((p) => p.sold_count === maxSold)?.id : undefined;

  const hasFilter = !!(filters.q || filters.kategori || filters.mode || filters.format);

  return (
    <main className="min-h-screen pt-32 pb-24 px-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-12 space-y-4">
        <h1 className="font-display font-bold text-[--text] tracking-tight leading-none"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          Katalog
        </h1>
        <p className="text-[--text-2] text-base md:text-lg max-w-prose leading-relaxed">
          Produk digital siap pakai: template, mockup, dan aset desain dari KRENOVA STUDIO.
        </p>
      </div>

      {/* Filter bar */}
      <Suspense>
        <CatalogFilters
          categories={categories}
          allFormats={allFormats}
          totalItems={total}
        />
      </Suspense>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-text-3">
          {hasFilter ? (
            <>
              <p className="mb-3">Tidak ada produk yang cocok. Coba filter lain.</p>
              <Link
                href="/katalog"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-text hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all shadow-sm"
              >
                Reset filter
              </Link>
            </>
          ) : (
            <p>Belum ada produk.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {items.map((p) => (
            <CatalogCard
              key={p.id}
              product={p}
              siteUrl={SITE_URL}
              isBestSeller={p.id === bestSellerId}
            />
          ))}
        </div>
      )}
    </main>
  );
}
