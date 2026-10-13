import { ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site";

export function MapEmbed() {
  if (!siteConfig.mapQuery) return null;

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(siteConfig.mapQuery)}&z=16&output=embed`;

  return (
    <div className="space-y-3">
      {/* Bingkai glass tipis */}
      <div className="glass glass-strong p-1.5 rounded-3xl overflow-hidden border border-[--glass-border]">
        <iframe
          src={src}
          width="100%"
          className="w-full h-64 md:h-80 rounded-2xl border-0 block"
          loading="lazy"
          title="Peta lokasi KRENOVA STUDIO"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen={false}
        />
      </div>

      {/* Fallback aksesibilitas tautan langsung */}
      {siteConfig.mapsUrl && (
        <div className="text-right">
          <a
            href={siteConfig.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[--text-3] hover:text-[--text] transition-colors"
          >
            <span>Buka peta di tab baru</span>
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          </a>
        </div>
      )}
    </div>
  );
}
