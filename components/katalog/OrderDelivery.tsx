// components/katalog/OrderDelivery.tsx — Tampilan produk setelah lunas / klaim gratis
import Image from "next/image";
import { CopyButton } from "./CopyButton";
import { formatRupiah, formatWaktu, maskEmail } from "@/lib/catalog/format";
import type { OrderView } from "@/lib/catalog/types";
import { catalogConfig } from "@/config/catalog";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Button } from "@/components/ui/Button";

interface Props {
  order: OrderView;
  token: string;
}

export function OrderDelivery({ order, token }: Props) {
  const isFree = order.amountIdr === 0 || order.orderType === "free";

  const waMsg = encodeURIComponent(
    `Halo KRENOVA STUDIO, saya butuh bantuan untuk pesanan ${order.orderCode} (${order.productTitle}).`,
  );
  const waUrl = `https://wa.me/${catalogConfig.supportWhatsapp}?text=${waMsg}`;

  return (
    <>
      {/* ── 1. Media Preview 4:3 (Gambar / Video) ── */}
      {order.productMedia?.url && (
        <div className="max-w-xl mx-auto mb-5 glass rounded-3xl p-3 border border-white/15 shadow-2xl backdrop-blur-2xl">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/15 shadow-lg bg-black/40">
            {order.productMedia.kind === "video" && order.productMedia.videoUrl ? (
              <video
                src={order.productMedia.videoUrl}
                poster={order.productMedia.url}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={order.productMedia.url}
                alt={order.productTitle}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 576px"
                priority
              />
            )}
          </div>
        </div>
      )}


      <div className="max-w-xl mx-auto space-y-6 glass rounded-3xl p-5 sm:p-7 border border-white/15 shadow-2xl backdrop-blur-2xl">
        {/* ── 1. Banner Sukses Liquid Glass ── */}
        <div className="glass glass-strong rounded-2xl p-5 border border-aqua/30 shadow-md">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-full glass border border-text/55 flex items-center justify-center flex-shrink-0 text-text">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base text-[--text] leading-snug">
                {isFree ? "Klaim produk berhasil!" : "Pembayaran berhasil!"}
              </p>
              <p className="text-xs text-[--text-3] mt-0.5">{formatWaktu(order.paidAt)}</p>
            </div>
          </div>

          {/* Ringkasan Rincian */}
          <table className="w-full text-xs text-[--text-2]">
            <tbody>
              <tr className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 w-28 text-[--text-3]">Kode pesanan</td>
                <td className="py-2 font-mono text-[--text] font-medium">{order.orderCode}</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 text-[--text-3]">Produk</td>
                <td className="py-2 text-[--text] font-medium">{order.productTitle}</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 text-[--text-3]">Nominal</td>
                <td className="py-2 text-[--text] font-bold">
                  {isFree ? "Gratis" : formatRupiah(order.amountIdr)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 3. File yang Dapat Diunduh ── */}
        {(order.deliverables?.files ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[--text-3] uppercase tracking-wider">
              File Produk
            </h2>
            {order.deliverables!.files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl glass border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[--text] truncate">{f.label}</p>
                  {f.fileSizeBytes && (
                    <p className="text-xs text-[--text-3] mt-0.5">
                      {(f.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                </div>
                <a
                  href={`/api/katalog/download?code=${encodeURIComponent(order.orderCode)}&t=${encodeURIComponent(token)}&asset=${encodeURIComponent(f.id)}`}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-blue via-[#5B8DFF] to-blue
                  hover:from-blue/90 hover:to-blue/90
                  border border-white/25 shadow-md transition-all active:scale-[0.98]"
                >
                  Unduh
                </a>
              </div>
            ))}
          </div>
        )}

        {/* ── 4. Tautan Produk Digital ── */}
        {(order.deliverables?.links ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[--text-3] uppercase tracking-wider">
              Link Akses
            </h2>
            {order.deliverables!.links.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-2xl glass border border-white/10 space-y-2.5"
              >
                <p className="text-sm font-semibold text-[--text]">{l.label}</p>
                <p className="text-xs font-mono text-[--aqua] break-all bg-white/[0.04] p-2.5 rounded-xl border border-white/5">
                  {l.url}
                </p>
                {l.note && <p className="text-xs text-[--text-3] italic">{l.note}</p>}
                <div className="flex gap-2 text-text-2 flex-wrap pt-1">
                  <CopyButton text={l.url} label="Salin link" />
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                    border border-white/15 bg-white/5 hover:bg-white/10 text-[--text] transition-all"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                    Buka
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 5. Status Notifikasi Email ── */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-[--text-3] space-y-1.5">
          {order.emailBuyerSentAt ? (
            <p className="leading-relaxed">
              Tautan akses pesanan juga telah dikirim ke{" "}
              <span className="text-[--text] font-semibold">
                {maskEmail(order.buyerEmailMasked)}
              </span>
            </p>
          ) : (
            <p className="text-yellow-400/90 leading-relaxed">
              Email belum terkirim, simpan halaman ini untuk mengakses produkmu sewaktu-waktu.
            </p>
          )}
          {order.licenseText && (
            <p className="text-[11px] pt-2 border-t border-white/8 text-[--text-3]">
              {order.licenseText}
            </p>
          )}
        </div>

        {/* ── 6. Tombol Bantuan WhatsApp (Desain Liquid Glass Konsisten) ── */}
        <div className="pt-2 flex justify-center">
          <Button
            asChild
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="lg"
            className="shrink-0 border border-white/20 shadow-md"
          >
            <span className="flex items-center justify-center gap-2">
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              Butuh bantuan? Chat via WhatsApp
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
