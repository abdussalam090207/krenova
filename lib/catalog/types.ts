// lib/catalog/types.ts — Tipe aman untuk client (tidak memuat storage_path, link_url, dll.)

/** Media promosi (dari bucket publik catalog-media) */
export interface CatalogMedia {
  id: string;
  kind: "image" | "video";
  /** Path Storage publik — dipakai untuk konstruksi URL gambar */
  path: string;
  poster_path: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  sort_order: number;
  storage_backend?: "supabase" | "r2";
}

/** Produk digital — data publik saja */
export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  description: string | null;
  highlights: string[];
  tags: string[];
  formats: string[];
  license_text: string | null;
  product_date: string;             // ISO date string YYYY-MM-DD
  purchase_mode: "paid" | "free" | "whatsapp";
  price_idr: number | null;
  is_published: boolean;
  sold_count: number;
  claim_count: number;
  created_at: string;
  updated_at: string;
  catalog_product_media?: CatalogMedia[];
}

/** Item yang diterima pembeli — TIDAK memuat storage_path */
export interface DeliverableFile {
  id: string;
  label: string;
  fileName: string;
  fileSizeBytes: number | null;
}

export interface DeliverableLink {
  id: string;
  label: string;
  url: string;
  note: string | null;
}

export interface Deliverables {
  files: DeliverableFile[];
  links: DeliverableLink[];
}

export type PaymentMethod =
  | "qris"
  | "bca_va"
  | "bni_va"
  | "bri_va"
  | "mandiri_bill"
  | "permata_va"
  | "indomaret"
  | "alfamart";

export interface PaymentDetails {
  method: PaymentMethod;
  qrString?: string | null;
  vaNumber?: string | null;
  bank?: string | null;
  billerCode?: string | null;
  billKey?: string | null;
  paymentCode?: string | null;
  store?: string | null;
}

/** Status pesanan — hanya field yang aman untuk ditampilkan ke client */
export interface OrderView {
  id: string;
  orderCode: string;
  productTitle: string;
  productSlug: string;
  orderType: "paid" | "free";
  amountIdr: number;
  status: "pending" | "paid" | "expired" | "canceled" | "failed";
  expiresAt: string | null;
  paidAt: string | null;
  qrDataUrl: string | null;         // data URL hasil render QR — hanya untuk status pending
  paymentDetails?: PaymentDetails | null;
  paymentMethod?: PaymentMethod | string | null;
  deliverables: Deliverables | null; // hanya untuk status paid
  buyerEmailMasked: string;
  emailBuyerSentAt: string | null;
  licenseText: string | null;
  productMedia?: {
    kind: "image" | "video";
    url: string;
    videoUrl?: string | null;
  } | null;
}

/** Filter untuk daftar katalog */
export interface CatalogFilters {
  q?: string;
  kategori?: string;
  mode?: "paid" | "free" | "whatsapp" | "";
  format?: string;
  urut?: "terbaru" | "terlaris" | "harga-terendah" | "harga-tertinggi";
  page?: number;
}
