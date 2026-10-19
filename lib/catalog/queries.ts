// lib/catalog/queries.ts — Pembacaan publik dengan anon key (RLS aktif)
// TIDAK menggunakan service_role. Aman diimpor dari Server Component.

import { createClient } from "@supabase/supabase-js";
import type { CatalogProduct, CatalogFilters } from "./types";
import { catalogConfig } from "@/config/catalog";
import { publicMediaUrl as helperPublicMediaUrl, type StorageBackend } from "@/lib/storage/urls";

// Klien anon untuk pembacaan publik — bukan service_role
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const MEDIA_SELECT = `catalog_product_media(id,kind,path,poster_path,width,height,duration_seconds,sort_order,storage_backend)`;
const PRODUCT_SELECT = `id,slug,title,subtitle,category,description,highlights,tags,formats,license_text,product_date,purchase_mode,price_idr,is_published,sold_count,claim_count,created_at,updated_at,${MEDIA_SELECT}`;

/** Daftar produk dengan filter, urutan, paginasi */
export async function listProducts(filters: CatalogFilters = {}): Promise<{
  items: CatalogProduct[];
  total: number;
  categories: string[];
  allFormats: string[];
}> {
  const db = anonClient();
  const { q, kategori, mode, format, urut, page = 1 } = filters;
  const { pageSize } = catalogConfig;
  const from = (page - 1) * pageSize;

  let query = db
    .from("catalog_products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_published", true);

  if (q) {
    // Cari di judul, subjudul, dan tag
    query = query.or(`title.ilike.%${q}%,subtitle.ilike.%${q}%,tags.cs.{${q}}`);
  }
  if (kategori) query = query.eq("category", kategori);
  if (mode)     query = query.eq("purchase_mode", mode);
  if (format)   query = query.contains("formats", [format]);

  // Urutan
  switch (urut) {
    case "terlaris":        query = query.order("sold_count", { ascending: false }); break;
    case "harga-terendah":  query = query.order("price_idr",  { ascending: true,  nullsFirst: false }); break;
    case "harga-tertinggi": query = query.order("price_idr",  { ascending: false, nullsFirst: false }); break;
    default:                query = query.order("created_at", { ascending: false }); // terbaru
  }

  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`listProducts: ${error.message}`);

  // Urutkan media tiap produk
  const items = (data ?? []).map((p) => ({
    ...p,
    catalog_product_media: (p.catalog_product_media ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    ),
  })) as CatalogProduct[];

  // Ambil kategori dan format unik (untuk filter bar)
  const [catRes, fmtRes] = await Promise.all([
    db.from("catalog_products").select("category").eq("is_published", true),
    db.from("catalog_products").select("formats").eq("is_published", true),
  ]);
  const categories = [...new Set((catRes.data ?? []).map((r: { category: string }) => r.category))].sort();
  const allFormats = [
    ...new Set(
      (fmtRes.data ?? []).flatMap((r: { formats: string[] }) => r.formats ?? []),
    ),
  ].sort();

  return { items, total: count ?? 0, categories, allFormats };
}

/** Satu produk berdasarkan slug (hanya yang is_published) */
export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { data, error } = await anonClient()
    .from("catalog_products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error?.code === "PGRST116") return null; // tidak ditemukan
  if (error) throw new Error(`getProductBySlug: ${error.message}`);

  const product = {
    ...data,
    catalog_product_media: (data.catalog_product_media ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    ),
  } as CatalogProduct;

  return product;
}

/** Produk terkait (kategori sama atau produk lain yang tersedia, maks 8) */
export async function getRelatedProducts(
  productId: string,
  category: string,
  limit = 8,
): Promise<CatalogProduct[]> {
  const db = anonClient();
  let { data, error } = await db
    .from("catalog_products")
    .select(PRODUCT_SELECT)
    .eq("is_published", true)
    .eq("category", category)
    .neq("id", productId)
    .order("sold_count", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    // Fallback: tampilkan produk lain yang tersedia di katalog
    const fallback = await db
      .from("catalog_products")
      .select(PRODUCT_SELECT)
      .eq("is_published", true)
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit);
    data = fallback.data ?? [];
  }

  return ((data ?? []) as CatalogProduct[]).map((p) => ({
    ...p,
    catalog_product_media: (p.catalog_product_media ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    ),
  }));
}

/** URL publik media (bucket catalog-media) */
export function publicMediaUrl(path: string | null | undefined, backend?: StorageBackend | null): string {
  if (!path) return "";
  return helperPublicMediaUrl(backend || "supabase", "catalog-media", path) || "";
}
