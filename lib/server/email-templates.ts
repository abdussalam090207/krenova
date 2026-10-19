// lib/server/email-templates.ts — HTML & teks email notifikasi (semua nilai di-escape)
import "server-only";
import { env } from "./env";
import { catalogConfig } from "@/config/catalog";
import { formatRupiah, formatBytes } from "@/lib/catalog/format";
import type { DeliverableLink } from "@/lib/catalog/types";

export interface EmailDeliverableFile {
  id: string;
  label: string;
  fileName: string;
  fileSizeBytes: number | null;
  downloadUrl: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Gaya. Ubah di sini saja; seluruh email mengikuti.
   Prinsip: latar terang, satu warna aksen (biru KRENOVA), sisanya netral.
   Font web (Bricolage Grotesque/Figtree) tidak dimuat oleh Gmail/Outlook, jadi
   memakai font sistem: serif untuk judul (elegan), sans bersih untuk isi.
   ────────────────────────────────────────────────────────────────────────── */
const C = {
  page: "#F5F6F8",   // latar luar
  card: "#FFFFFF",   // kartu email
  ink: "#12141B",    // teks utama & tombol
  text: "#3D4352",   // paragraf
  muted: "#7A8091",  // label & keterangan
  line: "#E6E8EE",   // garis tipis
  accent: "#3B63E8", // satu-satunya warna aksen (tautan)
} as const;

const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "'Avenir Next','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

/** Escape karakter HTML untuk mencegah XSS di template email. */
function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL aman untuk atribut href: hanya http(s); relatif dilengkapi dengan SITE_URL. */
function href(u: string | null | undefined): string {
  try {
    const x = new URL(String(u ?? ""), env.SITE_URL);
    return x.protocol === "https:" || x.protocol === "http:" ? esc(x.toString()) : "#";
  } catch {
    return "#";
  }
}

function waLink(text: string): string {
  return esc(`https://wa.me/${catalogConfig.supportWhatsapp}?text=${encodeURIComponent(text)}`);
}

/* ─── Potongan HTML yang dipakai berulang ───────────────────────────────── */

/** Tombol utama (tabel, agar tampil benar di Outlook juga). */
function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${C.ink}" style="background:${C.ink};border-radius:10px;">
      <a href="${href(url)}" style="display:inline-block;padding:15px 30px;background:${C.ink};font-family:${SANS};font-size:15px;font-weight:600;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(label)}</a>
    </td>
  </tr>
</table>`;
}

/** Tabel rincian ala struk: label di kiri, nilai di kanan, garis tipis antar baris. */
function details(rows: Array<[label: string, valueHtml: string]>): string {
  const body = rows
    .map(([label, value], i) => {
      const bottom = i === rows.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
      return `<tr>
      <td style="padding:13px 0;border-top:1px solid ${C.line};${bottom}font-family:${SANS};font-size:14px;line-height:1.4;color:${C.muted};">${label}</td>
      <td align="right" style="padding:13px 0 13px 16px;border-top:1px solid ${C.line};${bottom}font-family:${SANS};font-size:14px;line-height:1.4;color:${C.ink};">${value}</td>
    </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin:0 0 8px;font-family:${SANS};font-size:15px;font-weight:600;line-height:1.4;color:${C.ink};">${esc(text)}</p>`;
}

/** Kerangka email. `preheader` = teks pratinjau di daftar inbox (tersembunyi di isi email). */
function base(content: string, preheader: string): string {
  const year = new Date().getFullYear();
  const site = esc(env.SITE_URL);
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>KRENOVA STUDIO</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    @media (max-width: 600px) {
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};font-size:1px;line-height:1px;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:36px 12px 44px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
          <tr>
            <td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Wordmark -->
                <tr>
                  <td class="px" style="padding:34px 44px 22px;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:15px;letter-spacing:.18em;color:${C.ink};">
                    <span style="font-weight:700;">KRENOVA</span><span style="font-weight:300;color:${C.muted};">&nbsp;STUDIO</span>
                  </td>
                </tr>
                <!-- Isi -->
                <tr>
                  <td class="px" style="padding:36px 44px 40px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.text};">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:26px 20px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted};">
              &copy; ${year} KRENOVA STUDIO. Semua hak dilindungi.<br />
              <a href="${site}/katalog" style="color:${C.muted};text-decoration:underline;">Katalog</a>
              &nbsp;&nbsp;&middot;&nbsp;&nbsp;
              <a href="${site}/katalog/syarat" style="color:${C.muted};text-decoration:underline;">Syarat &amp; Ketentuan</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email ke pembeli (Customer) ──────────────────────────────────────────

interface BuyerEmailParams {
  name: string;
  title: string;
  orderCode: string;
  amountIdr: number;
  orderLink: string;
  downloadUrl: string;
  files?: EmailDeliverableFile[];
  links?: DeliverableLink[];
  paidAt: string;
}

export function buyerEmailHtml(p: BuyerEmailParams): string {
  const isFree = p.amountIdr === 0;

  const rows: Array<[string, string]> = [
    ["Kode pesanan", `<span style="font-family:${MONO};font-size:13px;letter-spacing:.02em;">#${esc(p.orderCode)}</span>`],
    ["Total", isFree
      ? `<span style="font-weight:600;">Gratis</span>`
      : `<span style="font-weight:600;">${esc(formatRupiah(p.amountIdr))}</span>`],
    [isFree ? "Waktu" : "Waktu lunas", esc(p.paidAt)],
    ["Status", isFree ? "Selesai" : "Lunas"],
  ];

  const filesBlock = p.files && p.files.length > 0
    ? `<div style="margin:34px 0 0;">
        ${sectionTitle("Berkas produk")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${p.files.map((f, i) => {
            const bottom = i === p.files!.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
            const meta = [esc(f.fileName), f.fileSizeBytes ? esc(formatBytes(f.fileSizeBytes)) : ""].filter(Boolean).join(" &middot; ");
            return `<tr>
            <td style="padding:14px 0;border-top:1px solid ${C.line};${bottom}">
              <div style="font-family:${SANS};font-size:15px;font-weight:600;line-height:1.4;color:${C.ink};">${esc(f.label)}</div>
              <div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};word-break:break-all;">${meta}</div>
            </td>
            <td align="right" valign="middle" style="padding:14px 0 14px 16px;border-top:1px solid ${C.line};${bottom}white-space:nowrap;">
              <a href="${href(f.downloadUrl)}" style="font-family:${SANS};font-size:14px;font-weight:600;color:${C.accent};text-decoration:underline;">Unduh</a>
            </td>
          </tr>`;
          }).join("")}
        </table>
      </div>`
    : "";

  const linksBlock = p.links && p.links.length > 0
    ? `<div style="margin:30px 0 0;">
        ${sectionTitle("Tautan akses")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${p.links.map((l, i) => {
            const bottom = i === p.links!.length - 1 ? `border-bottom:1px solid ${C.line};` : "";
            return `<tr>
            <td style="padding:14px 0;border-top:1px solid ${C.line};${bottom}">
              <div style="font-family:${SANS};font-size:15px;font-weight:600;line-height:1.4;color:${C.ink};">${esc(l.label)}</div>
              <a href="${href(l.url)}" style="font-family:${SANS};font-size:13px;line-height:1.5;color:${C.accent};word-break:break-all;text-decoration:underline;">${esc(l.url)}</a>
              ${l.note ? `<div style="margin-top:4px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};">${esc(l.note)}</div>` : ""}
            </td>
          </tr>`;
          }).join("")}
        </table>
      </div>`
    : "";

  const help = `Halo KRENOVA STUDIO, saya butuh bantuan untuk pesanan #${p.orderCode} (${p.title}).`;

  return base(`
    <p style="margin:0 0 10px;font-family:${SANS};font-size:14px;font-weight:600;line-height:1.4;color:${C.accent};">
      ${isFree ? "Pesanan berhasil" : "Pembayaran berhasil"}
    </p>
    <h1 class="h1" style="margin:0 0 14px;font-family:${SERIF};font-size:30px;font-weight:400;line-height:1.2;letter-spacing:-.01em;color:${C.ink};">
      Halo, ${esc(p.name)}.
    </h1>
    <p style="margin:0 0 30px;font-size:15px;line-height:1.65;color:${C.text};">
      Terima kasih sudah berbelanja di KRENOVA STUDIO. Pesananmu sudah terverifikasi dan produk digitalmu siap diunduh.
    </p>

    <p style="margin:0 0 2px;font-size:13px;line-height:1.4;color:${C.muted};">Produk</p>
    <p style="margin:0 0 20px;font-family:${SERIF};font-size:21px;font-weight:400;line-height:1.3;color:${C.ink};">${esc(p.title)}</p>

    ${details(rows)}

    <div style="margin:32px 0 0;">
      ${button(p.downloadUrl, "Unduh produk")}
      <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:${C.muted};">
        Tautan ini aman dan langsung menuju produk privatmu.
      </p>
    </div>

    ${filesBlock}
    ${linksBlock}

    <p style="margin:30px 0 0;font-size:14px;line-height:1.6;">
      <a href="${href(p.orderLink)}" style="color:${C.accent};text-decoration:underline;">Buka halaman pesanan</a>
    </p>

    <div style="margin:34px 0 0;padding-top:22px;border-top:1px solid ${C.line};">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;line-height:1.5;color:${C.ink};">Butuh bantuan dengan produknya?</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${C.text};">
        Chat kami di WhatsApp:
        <a href="${waLink(help)}" style="color:${C.accent};font-weight:600;text-decoration:underline;">+${esc(catalogConfig.supportWhatsapp)}</a>
      </p>
    </div>

    <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:${C.muted};">
      Tautan di email ini bersifat pribadi, jadi jangan dibagikan ke orang lain. Simpan email ini untuk mengakses produkmu kembali kapan saja.
    </p>
  `, isFree
    ? `Pesanan #${p.orderCode} berhasil. Produk digitalmu siap diunduh.`
    : `Pembayaran #${p.orderCode} berhasil. Produk digitalmu siap diunduh.`);
}

export function buyerEmailText(p: BuyerEmailParams): string {
  const isFree = p.amountIdr === 0;
  const amount = isFree ? "Gratis" : formatRupiah(p.amountIdr);

  const filesText = p.files && p.files.length > 0
    ? `\nBERKAS PRODUK:\n` +
      p.files.map((f) => `- ${f.label} (${f.fileName}${f.fileSizeBytes ? ` · ${formatBytes(f.fileSizeBytes)}` : ""}):\n  ${f.downloadUrl}`).join("\n") + `\n`
    : "";

  const linksText = p.links && p.links.length > 0
    ? `\nTAUTAN AKSES:\n` +
      p.links.map((l) => `- ${l.label}: ${l.url}${l.note ? ` (${l.note})` : ""}`).join("\n") + `\n`
    : "";

  return `Halo, ${p.name}.

Terima kasih sudah berbelanja di KRENOVA STUDIO. Pesananmu sudah terverifikasi dan produk digitalmu siap diunduh.

RINCIAN PESANAN
- Produk        : ${p.title}
- Kode pesanan  : #${p.orderCode}
- Total         : ${amount}
- ${isFree ? "Waktu         " : "Waktu lunas   "} : ${p.paidAt}
- Status        : ${isFree ? "Selesai" : "Lunas"}

UNDUH PRODUK
${p.downloadUrl}
${filesText}${linksText}
HALAMAN PESANAN
${p.orderLink}

Tautan di email ini bersifat pribadi, jangan dibagikan ke orang lain. Simpan email ini untuk mengakses produkmu kembali kapan saja.

Butuh bantuan? Chat WhatsApp kami:
https://wa.me/${catalogConfig.supportWhatsapp}?text=${encodeURIComponent("Halo KRENOVA STUDIO, saya butuh bantuan untuk pesanan #" + p.orderCode)}

--
KRENOVA STUDIO
${env.SITE_URL}/katalog`;
}

// ─── Email ke Admin (Laporan Pesanan Baru) ─────────────────────────────────

interface AdminEmailParams {
  title: string;
  orderCode: string;
  orderType: string;
  amountIdr: number;
  buyerName: string;
  buyerEmail: string;
  paidAt: string;
}

export function adminEmailHtml(p: AdminEmailParams): string {
  const isFree = p.amountIdr === 0;
  const amount = isFree ? "Gratis" : formatRupiah(p.amountIdr);

  const rows: Array<[string, string]> = [
    ["Kode pesanan", `<span style="font-family:${MONO};font-size:13px;letter-spacing:.02em;">#${esc(p.orderCode)}</span>`],
    ["Produk", esc(p.title)],
    ["Total", `<span style="font-weight:600;">${esc(amount)}</span>`],
    ["Nama pembeli", esc(p.buyerName)],
    ["Email pembeli", `<a href="mailto:${esc(p.buyerEmail)}" style="color:${C.accent};text-decoration:underline;">${esc(p.buyerEmail)}</a>`],
    ["Tipe pesanan", esc(p.orderType)],
    [isFree ? "Waktu" : "Waktu lunas", esc(p.paidAt)],
  ];

  return base(`
    <p style="margin:0 0 10px;font-size:14px;font-weight:600;line-height:1.4;color:${C.accent};">
      Pesanan baru
    </p>
    <h1 class="h1" style="margin:0 0 14px;font-family:${SERIF};font-size:28px;font-weight:400;line-height:1.25;letter-spacing:-.01em;color:${C.ink};">
      ${isFree ? "Produk gratis diklaim" : "Pesanan"} #${esc(p.orderCode)}${isFree ? "" : " lunas"}
    </h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${C.text};">
      ${isFree
        ? "Ada pembeli yang mengklaim produk gratis di KRENOVA STUDIO."
        : "Ada transaksi baru yang berhasil diverifikasi di KRENOVA STUDIO."}
    </p>

    ${details(rows)}

    <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:${C.muted};">
      Email konfirmasi dan tautan unduhan sudah dikirim otomatis ke pembeli.
    </p>
  `, isFree
    ? `${p.buyerName} mengklaim ${p.title}.`
    : `${p.buyerName} membeli ${p.title} (${amount}).`);
}

export function adminEmailText(p: AdminEmailParams): string {
  const isFree = p.amountIdr === 0;
  const amount = isFree ? "Gratis" : formatRupiah(p.amountIdr);

  return `${isFree ? "Produk gratis diklaim" : "Pesanan lunas"} #${p.orderCode}

LAPORAN PESANAN BARU
- Kode pesanan  : #${p.orderCode}
- Produk        : ${p.title}
- Total         : ${amount}
- Nama pembeli  : ${p.buyerName}
- Email pembeli : ${p.buyerEmail}
- Tipe pesanan  : ${p.orderType.toUpperCase()}
- ${isFree ? "Waktu         " : "Waktu lunas   "} : ${p.paidAt}

Email konfirmasi dan tautan unduhan sudah dikirim otomatis ke pembeli.

--
KRENOVA STUDIO`;
}