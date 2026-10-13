"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MasonryGrid } from "./MasonryGrid";
import { ProjectCard } from "./ProjectCard";
import { ProjectCardSkeleton } from "./ProjectCardSkeleton";
import { DATA_MODE } from "@/lib/projects/repo";
import type { Project } from "@/lib/projects/types";

async function getRepo() {
  if (DATA_MODE === "dummy") {
    const { dummyRepo } = await import("@/lib/projects/dummy-repo");
    return dummyRepo;
  }
  if (DATA_MODE === "supabase") {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
    const sb = createSupabaseBrowserClient();
    return createSupabaseRepo(sb);
  }
  return null;
}

interface Props {
  projectId: string;
  initialRelated: Project[];
  initialHasMore: boolean;
}

export function RelatedProjects({ projectId, initialRelated, initialHasMore }: Props) {
  const [items, setItems] = useState(initialRelated);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialRelated.length);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const repo = await getRepo();
      if (!repo) return;
      const page = await repo.related(projectId, { offset, limit: 20 });
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setOffset((o) => o + page.items.length);
    } catch {
      // abaikan
    } finally {
      setLoading(false);
    }
  }, [projectId, offset, hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting && hasMore && !loading) loadMore(); },
      { rootMargin: "800px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  if (items.length === 0 && !hasMore) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display font-bold text-xl text-[--text] mb-6">
        Projek lainnya
      </h2>
      <MasonryGrid>
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </MasonryGrid>

      {loading && (
        <MasonryGrid>
          {[0, 1, 2, 3].map((i) => (
            <ProjectCardSkeleton key={i} aspect={i % 2 === 0 ? "4/5" : "16/9"} />
          ))}
        </MasonryGrid>
      )}

      <div ref={sentinelRef} aria-hidden />

      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-5 py-3 glass rounded-xl text-sm text-[--text-2] hover:text-[--text] transition-colors"
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </section>
  );
}
