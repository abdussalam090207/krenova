import Link from "next/link";
import { Tag, ExternalLink } from "lucide-react";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { siteConfig, waLink } from "@/config/site";
import { services } from "@/config/services";
import type { Project } from "@/lib/projects/types";

interface Props {
  project: Project;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(s: number) {
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec ? `${m} menit ${sec} detik` : `${m} menit`;
}

export function ProjectInfo({ project }: Props) {
  const {
    title,
    subtitle,
    description,
    category,
    serviceId,
    mediaType,
    durationSeconds,
    tags,
    externalUrl,
    createdAt,
  } = project;

  const service = services.find((s) => s.id === serviceId);
  const mediaLabel = mediaType === "video" ? "Video" : "Gambar";
  const waMsg = `Halo KRENOVA STUDIO, saya tertarik dengan projek "${title}" dan mau pesan yang serupa.`;
  const waHref = waLink(siteConfig.contacts[0]!.wa, waMsg);

  const rawLink = externalUrl?.trim();
  const normalizedHref = rawLink
    ? /^https?:\/\//i.test(rawLink)
      ? rawLink
      : `https://${rawLink}`
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Baris atas: tag kategori + chip layanan + aksi */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tag Kategori (Desain Grafis / Video Editing) — Liquid Glass UI */}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide text-[--text] bg-gradient-to-r from-white/12 via-white/8 to-white/5 dark:from-white/10 dark:via-white/6 dark:to-white/4 backdrop-blur-xl border border-white/25 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(0,0,0,0.12)]">
            {category === "video" ? "Video Editing" : "Desain Grafis"}
          </span>
          {service && (
            <Link
              href={`/projects?type=${category}&service=${serviceId}`}
              className="px-3 py-1 rounded-lg glass text-xs text-[--text-2] hover:text-[--text] transition-colors"
            >
              {service.name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <LikeButton project={project} variant="preview" />
          <ShareButton title={title} />
        </div>
      </div>

      {/* Judul */}
      <h1
        className="font-display font-bold text-[--text] leading-tight"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
      >
        {title}
      </h1>

      {/* Sub judul dari admin */}
      {subtitle && (
        <p className="text-base text-[--text-2] font-medium -mt-1">{subtitle}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[--text-2]">
        <span>{formatDate(createdAt)}</span>
        <span>
          {mediaLabel}
          {mediaType === "video" && durationSeconds != null && (
            <> · {formatDuration(durationSeconds)}</>
          )}
        </span>
      </div>

      {/* Deskripsi */}
      {description && (
        <p className="text-[--text-2] max-w-prose whitespace-pre-line leading-relaxed">
          {description}
        </p>
      )}

      {/* Tag */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/projects?q=${encodeURIComponent(tag)}`}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-[--glass-border] text-xs text-[--text-3] hover:text-[--text] hover:border-[--text-3] transition-colors"
            >
              <Tag size={10} />
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Button Link Terkait (hanya tampil jika admin menyertakan link) */}
      {normalizedHref && (
        <div>
          <a
            href={normalizedHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold glass border border-[--glass-border] text-[--text] hover:text-[--aqua] hover:border-[--aqua]/40 hover:bg-white/10 active:scale-[0.98] transition-all duration-200 group shadow-sm w-fit"
          >
            <ExternalLink size={15} className="shrink-0 text-[--text-2] group-hover:text-[--aqua] transition-colors" />
            <span>Kunjungi Tautan</span>
          </a>
        </div>
      )}

      {/* CTA WhatsApp */}
      <div className="glass rounded-2xl p-5 mt-2">
        <p className="font-semibold text-[--text] text-base mb-1">Butuh yang seperti ini?</p>
        <p className="text-sm text-[--text-2] mb-4">
          Ceritakan kebutuhanmu lewat WhatsApp. Lampirkan referensi kalau ada.
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm text-[--text] bg-[--blue] border border-white/30 shadow-md hover:brightness-110 hover:border-white/40 active:scale-[0.98] transition-all duration-200"
        >
          <WhatsAppIcon className="w-5 h-5 shrink-0" />
          <span >Chat via WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
