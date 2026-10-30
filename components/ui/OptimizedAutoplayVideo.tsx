"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface OptimizedAutoplayVideoProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
  aspect?: string;
}

/**
 * Koordinator Global Playback Video
 * Mencegah decorder video HP kelebihan beban (hardware decoder limit).
 * Pada layar HP (< 768px): HANYA 1 video yang boleh autoplay pada saat bersamaan (yang paling dekat dengan tengah layar).
 * Pada desktop: Memperbolehkan maksimal 2 video aktif sekaligus.
 */
class VideoPlaybackCoordinator {
  private registered = new Map<
    string,
    {
      element: HTMLVideoElement;
      container: HTMLElement;
      ratio: number;
      distanceToCenter: number;
      requestPlay: () => void;
      requestPause: () => void;
    }
  >();

  private updateTimer: number | null = null;

  register(
    id: string,
    element: HTMLVideoElement,
    container: HTMLElement,
    requestPlay: () => void,
    requestPause: () => void
  ) {
    this.registered.set(id, {
      element,
      container,
      ratio: 0,
      distanceToCenter: Infinity,
      requestPlay,
      requestPause,
    });
  }

  unregister(id: string) {
    this.registered.delete(id);
    this.scheduleEvaluation();
  }

  updateVisibility(id: string, ratio: number) {
    const item = this.registered.get(id);
    if (!item) return;

    item.ratio = ratio;
    if (ratio > 0.15) {
      const rect = item.container.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      item.distanceToCenter = Math.abs(viewportCenter - elementCenter);
    } else {
      item.distanceToCenter = Infinity;
    }

    this.scheduleEvaluation();
  }

  scheduleEvaluation() {
    if (this.updateTimer !== null) return;
    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;
      this.evaluate();
    }, 80);
  }

  evaluate() {
    if (typeof window === "undefined") return;

    // Cek apakah tab sedang disembunyikan
    if (document.hidden) {
      for (const item of this.registered.values()) {
        item.requestPause();
      }
      return;
    }

    const isMobile = window.innerWidth < 768;
    const maxActive = isMobile ? 1 : 2;

    // Ambil semua video yang cukup terlihat di viewport (rasio >= 0.3)
    const visibleItems = Array.from(this.registered.values())
      .filter((item) => item.ratio >= 0.3 && item.distanceToCenter !== Infinity)
      .sort((a, b) => a.distanceToCenter - b.distanceToCenter);

    const activeSet = new Set(visibleItems.slice(0, maxActive));

    for (const item of this.registered.values()) {
      if (activeSet.has(item)) {
        item.requestPlay();
      } else {
        item.requestPause();
      }
    }
  }

  pauseAll() {
    for (const item of this.registered.values()) {
      item.requestPause();
    }
  }
}

const coordinator =
  typeof window !== "undefined" ? new VideoPlaybackCoordinator() : (null as unknown as VideoPlaybackCoordinator);

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      coordinator.pauseAll();
    } else {
      coordinator.scheduleEvaluation();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      coordinator.scheduleEvaluation();
    },
    { passive: true }
  );
}

export function OptimizedAutoplayVideo({
  src,
  poster,
  className = "w-full h-auto block",
  ariaLabel,
  aspect,
}: OptimizedAutoplayVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canAutoplay, setCanAutoplay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ID unik per instance
  const instanceIdRef = useRef<string>("");
  if (!instanceIdRef.current) {
    instanceIdRef.current = "vid_" + Math.random().toString(36).slice(2, 9);
  }

  // Play / Pause terkontrol aman dari AbortError browser
  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || !canAutoplay) return;

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browser autoplay policy / play interrupt
            setIsPlaying(false);
          });
      }
    }
  }, [canAutoplay]);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Deteksi Data Saver & Reduced Motion
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cek Data Saver pada koneksi HP
    const nav = navigator as unknown as { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) {
      setCanAutoplay(false);
      return;
    }

    // Cek reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCanAutoplay(false);
    }
  }, []);

  // Daftarkan ke VideoPlaybackCoordinator & IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !coordinator) return;

    const id = instanceIdRef.current;
    coordinator.register(id, video, container, playVideo, pauseVideo);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          coordinator.updateVisibility(id, entry.intersectionRatio);
        }
      },
      {
        threshold: [0, 0.15, 0.35, 0.6, 0.85],
        rootMargin: "50px 0px 50px 0px",
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      coordinator.unregister(id);
    };
  }, [playVideo, pauseVideo]);

  // Hover desktop: prioritaskan video yang di-hover
  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      playVideo();
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      coordinator.scheduleEvaluation();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full overflow-hidden"
      style={{
        contain: "paint layout",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        ...(aspect ? { aspectRatio: aspect } : {}),
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoaded(true)}
        className={className}
        aria-label={ariaLabel}
        style={{
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: isPlaying ? "transform" : "auto",
        }}
      />

      {/* Indikator Halus jika video sedang di-pause karena data saver / hemat daya */}
      {!canAutoplay && !isPlaying && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCanAutoplay(true);
            playVideo();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer backdrop-blur-[1px] transition-opacity duration-200"
          title="Klik untuk memutar video"
        >
          <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/90 shadow-lg">
            <svg className="w-4 h-4 ml-0.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
