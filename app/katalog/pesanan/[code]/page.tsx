// app/katalog/pesanan/[code]/page.tsx — Status pesanan / pengiriman produk
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { ChevronLeft } from "lucide-react";
import { loadOrder } from "@/lib/server/orders";
import { getDeliverables } from "@/lib/server/delivery";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { publicMediaUrl } from "@/lib/catalog/queries";
import { OrderPending } from "@/components/katalog/OrderPending";
import { OrderDelivery } from "@/components/katalog/OrderDelivery";
import { OrderBackButton } from "@/components/katalog/OrderBackButton";
import type { OrderView, PaymentDetails } from "@/lib/catalog/types";
import { catalogConfig } from "@/config/catalog";

export const dynamic = "force-dynamic";

// Halaman pesanan: noindex, no-store, no-referrer
export const metadata: Metadata = {
  title: "Pesanan — KRENOVA STUDIO",
  robots: { index: false, follow: false },
};

interface PageProps {
  params:       Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function OrderPage({ params, searchParams }: PageProps) {
  const { code }    = await params;
  const { t: token } = await searchParams;

  // loadOrder verifikasi token — kembalikan null untuk semua kasus gagal (404 generik)
  const order = await loadOrder(code, token ?? "").catch(() => null);
  if (!order) notFound();

  // Parsing payment details (QRIS, Virtual Account, Mandiri Bill, OTC)
  let paymentDetails: PaymentDetails | null = null;
  let qrDataUrl: string | null = null;

  if (order.status === "pending" && order.qr_string) {
    if (order.qr_string.startsWith("{")) {
      try {
        const parsed = JSON.parse(order.qr_string);
        paymentDetails = (parsed.activeDetails || parsed) as PaymentDetails;
      } catch {
        paymentDetails = null;
      }
    } else if (!order.gateway_payment_type || order.gateway_payment_type === "qris") {
      paymentDetails = {
        method: "qris",
        qrString: order.qr_string,
      };
    }

    // Jika metode QRIS, generate Data URL gambar QR
    const isQris = paymentDetails?.method === "qris" || order.gateway_payment_type === "qris" || !order.gateway_payment_type;
    if (isQris) {
      const rawQr = paymentDetails?.qrString || (!order.qr_string.startsWith("{") ? order.qr_string : null);
      if (rawQr) {
        try {
          qrDataUrl = await QRCode.toDataURL(rawQr, {
            margin: 2,
            width: 280,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#FFFFFF" },
          });
        } catch {
          qrDataUrl = null;
        }
      }
    }
  }

  // Produk hanya diambil bila status paid — tidak pernah untuk status lain
  const deliverables = order.status === "paid"
    ? await getDeliverables(order).catch(() => null)
    : null;

  // Ambil primary media dari produk yang dibeli
  const { data: mediaRows } = await supabaseAdmin
    .from("catalog_product_media")
    .select("kind,path,poster_path,storage_backend,sort_order")
    .eq("product_id", order.product_id)
    .order("sort_order", { ascending: true })
    .limit(1);

  const primaryMedia = mediaRows?.[0];
  const productMedia = primaryMedia
    ? {
        kind: primaryMedia.kind as "image" | "video",
        url: publicMediaUrl(primaryMedia.poster_path ?? primaryMedia.path, primaryMedia.storage_backend) ?? "",
        videoUrl: primaryMedia.kind === "video" ? publicMediaUrl(primaryMedia.path, primaryMedia.storage_backend) : null,
      }
    : null;

  const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";
  const waSupport = catalogConfig.supportWhatsapp;
  const waMsg     = encodeURIComponent(`Halo KRENOVA STUDIO, saya butuh bantuan untuk pesanan ${order.order_code} (${order.product_title}).`);
  const waUrl     = `https://wa.me/${waSupport}?text=${waMsg}`;

  // Buat OrderView aman untuk komponen client
  const orderView: OrderView = {
    id:               order.id,
    orderCode:        order.order_code,
    productTitle:     order.product_title,
    productSlug:      order.product_slug,
    orderType:        order.order_type,
    amountIdr:        order.amount_idr,
    status:           order.status,
    expiresAt:        order.expires_at,
    paidAt:           order.paid_at,
    qrDataUrl:        qrDataUrl,
    deliverables:     deliverables,
    paymentDetails:   paymentDetails,
    paymentMethod:    order.gateway_payment_type,
    buyerEmailMasked: order.buyer_email,
    emailBuyerSentAt: order.email_buyer_sent_at,
    licenseText:      null, // baca dari produk bila diperlukan
    productMedia:     productMedia,
  };

  return (
    <>
      {/* Header khusus: Referrer-Policy no-referrer, Cache-Control no-store, noindex */}
      <main className="min-h-screen pt-12 md:pt-16 pb-24 px-4">
        {/* Tombol Kembali ke Katalog dengan handling Auto-Cancel jika pending */}
        <div className="max-w-xl mx-auto mb-6">
          <OrderBackButton
            orderCode={order.order_code}
            token={token ?? ""}
            isPending={order.status === "pending"}
          />
        </div>

        <div className="max-w-xl mx-auto">
          {/* Pending */}
          {order.status === "pending" && (
            <OrderPending
              orderCode={order.order_code}
              token={token ?? ""}
              productTitle={order.product_title}
              amountIdr={order.amount_idr}
              qrDataUrl={qrDataUrl}
              paymentDetails={paymentDetails}
              paymentMethod={order.gateway_payment_type || "qris"}
              expiresAt={order.expires_at}
              isSandbox={isSandbox}
            />
          )}

          {/* Paid */}
          {order.status === "paid" && (
            <OrderDelivery order={orderView} token={token ?? ""} />
          )}

          {/* Expired */}
          {order.status === "expired" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/8 border border-white/12 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="text-text-3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-text">Waktu pembayaran habis</h1>
              <p className="text-text-3 text-sm">QR ini sudah tidak berlaku lagi.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href={`/katalog/${order.product_slug}`}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue text-white hover:bg-blue/90 transition-all">
                  Buat pesanan baru
                </Link>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]">
                  Butuh bantuan?
                </a>
              </div>
            </div>
          )}

          {/* Failed / canceled */}
          {(order.status === "failed" || order.status === "canceled") && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose/10 border border-rose/25 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="text-rose" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-text">Pembayaran tidak berhasil</h1>
              <p className="text-text-3 text-sm">
                {order.status === "canceled" ? "Pembayaran dibatalkan." : "Terjadi masalah dengan pembayaran."}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href={`/katalog/${order.product_slug}`}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue text-white hover:bg-blue/90 transition-all">
                  Coba lagi
                </Link>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]">
                  Butuh bantuan?
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
