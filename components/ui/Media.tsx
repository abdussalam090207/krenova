import Image from "next/image";
import type { MediaSpec } from "@/config/services";
import { MediaPlaceholder } from "./MediaPlaceholder";

interface MediaProps {
  spec: MediaSpec;
  priority?: boolean;
  className?: string;
  /** Dipakai di panggung ServicesExplorer — contain bukan cover */
  contain?: boolean;
}

/**
 * Media — wrapper universal.
 * - src ada    → next/image (fill, object-cover atau object-contain)
 * - src kosong → MediaPlaceholder (CSS/SVG only, tanpa request jaringan)
 * Wrapper selalu style={{ aspectRatio }}, rounded-2xl, overflow-hidden,
 * border tipis glass-border — sehingga tidak ada layout shift saat src diisi.
 */
export function Media({ spec, priority = false, className = "", contain = false }: MediaProps) {
  const { src, aspect, alt, kind } = spec;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 50vw"
          className={contain ? "object-contain" : "object-cover"}
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      ) : (
        <MediaPlaceholder kind={kind ?? "flyer"} aspect={aspect} alt={alt} />
      )}
    </div>
  );
}
