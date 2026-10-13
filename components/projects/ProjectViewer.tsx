"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import type { Project } from "@/lib/projects/types";

interface Props {
  project: Project;
}

const SLIDE_INTERVAL = 5000; // 5 detik per slide

export function ProjectViewer({ project }: Props) {
  const { full, mediaType, youtubeId, videoSrc, title, aspect, mediaUrls } = project as Project & { mediaUrls?: string[] };

  // Kumpulkan semua URL media untuk slide
  const allMedia: string[] = [];
  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    allMedia.push(...mediaUrls);
  } else if (full.src) {
    allMedia.push(full.src);
  }

  const [slideIdx, setSlideIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo =
    mediaType === "video" ||
    !!videoSrc ||
    !!youtubeId ||
    /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(full.src || "") ||
    allMedia.some((u) => /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(u));

  const resolvedVideoSrc =
    videoSrc ||
    (full.src && /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(full.src) ? full.src : null) ||
    allMedia.find((u) => /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(u)) ||
    null;

  const isMultiSlide = !isVideo && allMedia.length > 1;
  const mediaCount = allMedia.length;

  const goNext = () => {
    setSlideIdx(i => (i + 1) % mediaCount);
  };

  const goPrev = () => {
    setSlideIdx(i => (i - 1 + mediaCount) % mediaCount);
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isMultiSlide) {
      intervalRef.current = setInterval(goNext, SLIDE_INTERVAL);
    }
  };

  // Auto slide setiap 5 detik untuk gambar dengan multi-media
  useEffect(() => {
    if (!isMultiSlide) return;
    intervalRef.current = setInterval(() => {
      setSlideIdx(i => (i + 1) % mediaCount);
    }, SLIDE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMultiSlide, mediaCount]);

  // Autoplay video saat pertama dibuka
  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Browser mencegah autoplay tanpa interaksi — biarkan user main sendiri
      });
    }
  }, [isVideo]);

  // Rasio dari data, dijepit
  const [w, h] = aspect.split("/").map(Number);
  const ratio = Math.max(0.3, Math.min(1.8, (h || 1) / (w || 1)));

  // ─── Render media ────────────────────────────────────────────────────────

  let mediaEl: React.ReactNode;

  if (isVideo) {
    if (youtubeId) {
      const ytSrc = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&autoplay=1`;
      mediaEl = (
        <iframe
          src={ytSrc}
          title={title}
          loading="lazy"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    } else if (resolvedVideoSrc) {
      const posterSrc =
        full.src && !/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(full.src) ? full.src : undefined;
      mediaEl = (
        <video
          ref={videoRef}
          controls
          playsInline
          autoPlay
          preload="metadata"
          poster={posterSrc}
          className="absolute inset-0 w-full h-full object-contain rounded-2xl"
        >
          <source src={resolvedVideoSrc} />
          Browser Anda tidak mendukung tag video.
        </video>
      );
    } else {
      mediaEl = (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <MediaPlaceholder kind={full.kind ?? "video-social"} aspect={aspect} alt={full.alt} />
        </div>
      );
    }
  } else {
    // Gambar — tampilkan slide jika ada lebih dari 1
    const currentSrc = allMedia[slideIdx] ?? full.src;

    if (currentSrc) {
      mediaEl = (
        <>
          <Image
            src={currentSrc}
            alt={`${title} — ${slideIdx + 1}`}
            fill
            priority={slideIdx === 0}
            sizes="(min-width:1024px) 55vw, 100vw"
            className="object-contain rounded-2xl transition-opacity duration-300"
          />
          {/* Slide indicator dots */}
          {isMultiSlide && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {allMedia.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSlideIdx(i);
                    resetTimer();
                  }}
                  aria-label={`Gambar ${i + 1}`}
                  className={[
                    "w-2 h-2 rounded-full transition-all duration-200",
                    i === slideIdx
                      ? "bg-white scale-110"
                      : "bg-white/40 hover:bg-white/70",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
        </>
      );
    } else {
      mediaEl = (
        <div className="absolute inset-0">
          <MediaPlaceholder kind={full.kind ?? "flyer"} aspect={aspect} alt={full.alt} />
        </div>
      );
    }
  }

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-2xl bg-black/30"
        style={{ paddingBottom: `${(ratio * 100).toFixed(2)}%`, maxHeight: "78vh" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {mediaEl}
        </div>
      </div>

      {/* Prev/Next arrows (hanya untuk multi-slide) */}
      {isMultiSlide && (
        <>
          <button
            type="button"
            onClick={() => {
              goPrev();
              resetTimer();
            }}
            aria-label="Gambar sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              glass text-white/80 hover:text-white hover:bg-white/10
              transition-all duration-150"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              goNext();
              resetTimer();
            }}
            aria-label="Gambar berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              glass text-white/80 hover:text-white hover:bg-white/10
              transition-all duration-150"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
