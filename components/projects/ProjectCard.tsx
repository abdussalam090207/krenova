"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart, MessageCircle } from "lucide-react";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { LikeButton } from "./LikeButton";
import { useLikes } from "./LikesProvider";
import type { Project } from "@/lib/projects/types";
import { saveGridState } from "@/lib/projects/session-cache";
import { OptimizedAutoplayVideo } from "@/components/ui/OptimizedAutoplayVideo";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}


interface Props {
  project: Project;
  priority?: boolean;
}

export function ProjectCard({ project, priority = false }: Props) {
  const { getCount } = useLikes();
  const { slug, title, subtitle, serviceId, thumb, mediaType, durationSeconds, likeCount, commentCount, aspect } = project;

  // Rasio: tinggi/lebar, dijepit 0.5–1.8
  const [w, h] = aspect.split("/").map(Number);

  const displayLikeCount = getCount(project.id, likeCount);
  const isVideo =
    mediaType === "video" ||
    !!project.videoSrc ||
    !!project.youtubeId ||
    /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(thumb.src || "");
  const videoSource =
    project.videoSrc ||
    (thumb.src && /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(thumb.src) ? thumb.src : null);

  const handleCardClick = () => {
    saveGridState(window.location.search, {
      items: [],      // caller isi; di sini hanya simpan scrollY
      offset: 0,
      hasMore: false,
      scrollY: window.scrollY,
    });
  };

  return (
    <article className="relative group pb-2 rounded-2xl glass">
      {/* Media — ukuran alami media terupload (Masonry Grid) */}
      <div className="relative overflow-hidden rounded-2xl transition-colors duration-200 group-hover:border-[--text-3] bg-black/15">
        {isVideo && (videoSource || project.youtubeId) ? (
          project.youtubeId ? (
            <Image
              src={`https://img.youtube.com/vi/${project.youtubeId}/hqdefault.jpg`}
              alt={thumb.alt}
              width={w || 480}
              height={h || 360}
              className="w-full h-auto block object-cover"
              priority={priority}
            />
          ) : (
            <OptimizedAutoplayVideo
              src={videoSource!}
              poster={thumb.src && !/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(thumb.src) ? thumb.src : undefined}
              className="w-full h-auto block"
              ariaLabel={thumb.alt}
            />
          )
        ) : thumb.src ? (
          <Image
            src={thumb.src}
            alt={thumb.alt}
            width={w || 600}
            height={h || 400}
            className="w-full h-auto block"
            priority={priority}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center bg-white/5"
            style={{ aspectRatio: aspect }}
          >
            <MediaPlaceholder kind={thumb.kind ?? "flyer"} aspect={aspect} alt={thumb.alt} />
          </div>
        )}

        {/* Chip durasi (video) */}
        {isVideo && durationSeconds != null && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg glass text-xs text-[--text] z-10 pointer-events-none">
            <Play size={10} fill="currentColor" strokeWidth={0} />
            {formatDuration(durationSeconds)}
          </div>
        )}

        {/* Tombol like — kanan atas */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <LikeButton project={project} variant="card" />
        </div>
      </div>

      {/* Teks */}
      <div className="m-2 px-0.5">
        <h2 className="text-sm font-semibold leading-snug line-clamp-2 text-[--text]">
          {/* Stretched link */}
          <Link
            href={`/projects/${slug}`}
            onClick={handleCardClick}
            className="after:absolute after:inset-0 hover:text-[--aqua] transition-colors duration-150"
          >
            {title}
          </Link>
        </h2>
        <div className="mt-1 flex items-center justify-between text-xs text-[--text-2]">
          <span className="truncate">{subtitle || (serviceId !== "other" ? serviceId.replace(/-/g, " ") : "")}</span>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="flex items-center gap-0.5">
              <Heart size={12} strokeWidth={1.5} />
              <span className="tabular-nums">{displayLikeCount}</span>
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle size={12} strokeWidth={1.5} />
              <span className="tabular-nums">{commentCount}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
