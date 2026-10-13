"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DATA_MODE } from "@/lib/projects/repo";
import type { Project } from "@/lib/projects/types";

async function loadFeatured(): Promise<Project[]> {
  if (DATA_MODE === "none") return [];

  if (DATA_MODE === "dummy") {
    const { dummyRepo } = await import("@/lib/projects/dummy-repo");
    return dummyRepo.featured(10);
  }

  // supabase
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
  const sb = createSupabaseBrowserClient();
  const repo = createSupabaseRepo(sb);
  return repo.featured(10);
}

/**
 * FeaturedWork — Section Karya di Home
 * Menampilkan maks. 10 karya dari Supabase/admin.
 * Gambar tampil sebagai thumbnail. Video autoplay muted.
 * Klik → redirect ke /projects.
 */
export function FeaturedWork() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatured()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && projects.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28"
      aria-labelledby="karya-heading"
    >
      {/* Judul + tombol "Lihat semua" di kanan (desktop) */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <SectionHeading id="karya-heading" title="Projek" />
          <p className="mt-2 text-[--text-2] text-base">
            Beberapa hasil kerja. Lihat semuanya di halaman Projek.
          </p>
        </div>
        <Button asChild href="/projects" variant="glass" size="md" className="hidden md:inline-flex">
          Lihat semua projek
        </Button>
      </div>

      {/* Skeleton saat loading */}
      {loading && (
        <div className="columns-2 md:columns-3 gap-4 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid mb-4 md:mb-5 rounded-[18px] glass animate-pulse"
              style={{ paddingBottom: ["75%","125%","100%","66%","133%","80%"][i % 6] }}
            />
          ))}
        </div>
      )}

      {/* Masonry grid */}
      {!loading && (
        <div className="columns-2 md:columns-3 gap-4 md:gap-5" style={{ columnFill: "balance" }}>
          {projects.map((project) => {
            const thumbSrc = project.mediaUrls[0] ?? project.thumb.src;
            const isVideo = project.mediaType === "video";

            return (
              <Link
                key={project.id}
                href="/projects"
                className="group block break-inside-avoid mb-4 md:mb-5 rounded-[18px] overflow-hidden glass transition-[border-color] duration-200 hover:border-[--text-3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--aqua] focus-visible:outline-offset-2"
                style={{ padding: "6px" }}
              >
                {/* Media */}
                <div className="relative w-full rounded-xl overflow-hidden bg-black/20">
                  {isVideo && (project.videoSrc || project.youtubeId) ? (
                    project.youtubeId ? (
                      // YouTube thumbnail
                      <Image
                        src={`https://img.youtube.com/vi/${project.youtubeId}/mqdefault.jpg`}
                        alt={project.title}
                        width={320}
                        height={180}
                        className="w-full h-auto block object-cover"
                      />
                    ) : (
                      // Video file — autoplay muted
                      <video
                        src={project.videoSrc!}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-auto block"
                        aria-label={project.title}
                      />
                    )
                  ) : thumbSrc ? (
                    <Image
                      src={thumbSrc}
                      alt={project.title}
                      width={400}
                      height={300}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-white/5 flex items-center justify-center">
                      <span className="text-xs text-[--text-3]">Media</span>
                    </div>
                  )}
                </div>

                {/* Strip keterangan — selalu tampil */}
                <div className="px-2 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[--text] leading-snug line-clamp-1 flex-1">
                    {project.title}
                  </span>
                  <span
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded-full text-[--text-3]"
                    style={{ background: "rgba(255,255,255,.07)" }}
                  >
                    {project.category === "design" ? "Desain" : "Video"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Tombol "Lihat semua" di bawah — hanya HP */}
      {!loading && (
        <div className="mt-6 md:hidden">
          <Button asChild href="/projects" variant="glass" size="md" className="w-full">
            Lihat semua project
          </Button>
        </div>
      )}
    </section>
  );
}
