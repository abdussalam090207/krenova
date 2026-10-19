// lib/server/delivery.ts — Pengiriman produk ke pembeli yang sudah lunas
import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { catalogConfig } from "@/config/catalog";
import type { OrderRow } from "./orders";
import type { Deliverables } from "@/lib/catalog/types";
import { presignGetPrivate } from "./r2";

/**
 * Ambil daftar aset produk (label + info publik saja).
 * TIDAK mengembalikan storage_path atau link_url ke client.
 * Hanya boleh dipanggil bila order.status === 'paid'.
 */
export async function getDeliverables(order: OrderRow): Promise<Deliverables> {
  if (order.status !== "paid") return { files: [], links: [] };

  const { data, error } = await supabaseAdmin
    .from("catalog_assets")
    .select("id,kind,label,file_name,file_size_bytes,link_url,link_note,sort_order")
    .eq("product_id", order.product_id)
    .order("sort_order");

  if (error || !data) return { files: [], links: [] };

  const files = data
    .filter((a: { kind: string }) => a.kind === "file")
    .map((a: { id: string; label: string; file_name: string; file_size_bytes: number | null }) => ({
      id: a.id,
      label: a.label,
      fileName: a.file_name ?? "file",
      fileSizeBytes: a.file_size_bytes ?? null,
    }));

  const links = data
    .filter((a: { kind: string }) => a.kind === "link")
    .map((a: { id: string; label: string; link_url: string; link_note: string | null }) => ({
      id: a.id,
      label: a.label,
      url: a.link_url,
      note: a.link_note ?? null,
    }));

  return { files, links };
}

/**
 * Buat signed URL unduhan untuk satu file.
 * Batas download_count diterapkan dengan update bersyarat (atomik).
 */
export async function signedDownload(
  order: OrderRow,
  assetId: string,
): Promise<{ url: string; fileName: string } | { error: string; status: number }> {
  if (order.status !== "paid") return { error: "Pesanan belum lunas.", status: 403 };

  // Verifikasi aset milik produk pesanan ini
  const { data: asset, error: aErr } = await supabaseAdmin
    .from("catalog_assets")
    .select("id,kind,storage_path,file_name,storage_backend")
    .eq("id", assetId)
    .eq("product_id", order.product_id)
    .eq("kind", "file")
    .single<{ id: string; kind: string; storage_path: string; file_name: string; storage_backend?: string }>();

  if (aErr || !asset) return { error: "File tidak ditemukan.", status: 404 };

  // Terapkan batas unduhan (atomik dengan update bersyarat)
  const { data: updated } = await supabaseAdmin
    .from("catalog_orders")
    .update({ download_count: order.download_count + 1, last_download_at: new Date().toISOString() })
    .eq("id", order.id)
    .lt("download_count", catalogConfig.maxDownloadsPerOrder)
    .select("download_count")
    .single();

  if (!updated) {
    return { error: "Batas unduhan tercapai. Hubungi kami via WhatsApp bila perlu bantuan.", status: 429 };
  }

  const fileName = asset.file_name ?? "file";

  // Jika backend r2: buat presigned URL dari Cloudflare R2 (umur aman sesuai konfigurasi, default 15 menit)
  if (asset.storage_backend === "r2") {
    try {
      const expiry = catalogConfig.signedUrlSeconds || 900;
      const url = await presignGetPrivate(asset.storage_path, fileName, expiry);
      return { url, fileName };
    } catch (err) {
      console.error("[delivery presignGetPrivate error]", err);
      return { error: "Gagal membuat link unduhan R2. Coba lagi.", status: 500 };
    }
  }

  // Fallback jalur Supabase Storage lama
  const { data: signed, error: sErr } = await supabaseAdmin.storage
    .from("catalog-private")
    .createSignedUrl(asset.storage_path, catalogConfig.signedUrlSeconds, {
      download: fileName,
    });

  if (sErr || !signed?.signedUrl) {
    return { error: "Gagal membuat link unduhan. Coba lagi.", status: 500 };
  }

  return { url: signed.signedUrl, fileName };
}
