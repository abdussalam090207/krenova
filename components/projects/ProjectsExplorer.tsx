"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { X, Search } from "lucide-react";
import { MasonryGrid } from "./MasonryGrid";
import { ProjectCard } from "./ProjectCard";
import { ProjectCardSkeleton } from "./ProjectCardSkeleton";
import type { Project, ListQuery } from "@/lib/projects/types";
import { DATA_MODE } from "@/lib/projects/repo";
import { loadGridCache, saveGridCache } from "@/lib/projects/session-cache";

// ─── Aspect ratios untuk 8 skeleton awal ─────────────────────────────────
const SKELETON_ASPECTS = ["4/5", "3/4", "16/9", "1/1", "9/16", "4/3", "3/4", "4/5"];

// ─── Ambil repo secara lazy ───────────────────────────────────────────────
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
  initialItems: Project[];
  initialHasMore: boolean;
  initialQuery: ListQuery;
  queryString: string;
}

// Baca cache sebelum render pertama (lazy initializer)
function initFromCache(
  queryString: string,
  initialItems: Project[],
  initialHasMore: boolean
) {
  const cached = loadGridCache(queryString);
  if (cached && cached.items.length > 0) {
    return {
      items: cached.items,
      offset: cached.offset,
      hasMore: cached.hasMore,
      scrollY: cached.scrollY,
      restored: true,
    };
  }
  return {
    items: initialItems,
    offset: initialItems.length,
    hasMore: initialHasMore,
    scrollY: 0,
    restored: false,
  };
}

export function ProjectsExplorer({ initialItems, initialHasMore, initialQuery, queryString }: Props) {
  const init = initFromCache(queryString, initialItems, initialHasMore);
  const [items, setItems] = useState<Project[]>(init.items);
  const [hasMore, setHasMore] = useState(init.hasMore);
  const [offset, setOffset] = useState(init.offset);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<ListQuery>(initialQuery);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State search
  const [q, setQ] = useState(initialQuery.q ?? "");

  // Pulihkan posisi scroll setelah grid siap (satu kali)
  useEffect(() => {
    if (init.restored && init.scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: init.scrollY, behavior: "instant" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simpan cache saat pagehide
  useEffect(() => {
    const onHide = () => {
      saveGridCache(queryString, { items, offset, hasMore, scrollY: window.scrollY });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [items, offset, hasMore, queryString]);

  const fetchPage = useCallback(async (query: ListQuery, reset: boolean) => {
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const repo = await getRepo();
      if (!repo) {
        setItems([]);
        setHasMore(false);
        return;
      }
      const page = await repo.list({ ...query, limit: 20 });
      if (reset) {
        setItems(page.items);
      } else {
        setItems((prev) => [...prev, ...page.items]);
      }
      setHasMore(page.hasMore);
      setOffset(query.offset + page.items.length);
      setError(null);
    } catch {
      setError("projek gagal dimuat. Periksa koneksi, lalu coba lagi.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const newQuery: ListQuery = {
        ...activeQuery,
        q: val || undefined,
        offset: 0,
      };
      setActiveQuery(newQuery);
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      fetchPage(newQuery, true);
    }, 300);
  }, [activeQuery, fetchPage]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchPage({ ...activeQuery, offset }, false);
  }, [fetchPage, activeQuery, offset, loadingMore, hasMore]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting && hasMore && !loadingMore) loadMore(); },
      { rootMargin: "800px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const isEmpty = !loading && items.length === 0;

  return (
    <div ref={gridRef}>
      {/* Search bar */}
      <div className="relative mb-8">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-2] pointer-events-none shrink-0"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari Projek..."
          aria-label="Cari projek"
          className="w-full glass rounded-xl pl-11 pr-10 py-3 text-sm text-[--text] placeholder:text-[--text-3] bg-transparent focus:outline-none focus:border-[--blue]/50 transition-colors"
        />
        {q && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-3] hover:text-[--text] p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* State kosong / none */}
      {DATA_MODE === "none" ? (
        <div className="py-20 text-center text-[--text-2]">
          <p>projek sedang disiapkan.</p>
        </div>
      ) : loading ? (
        <MasonryGrid>
          {SKELETON_ASPECTS.map((a, i) => (
            <ProjectCardSkeleton key={i} aspect={a} />
          ))}
        </MasonryGrid>
      ) : isEmpty ? (
        <div className="py-20 text-center text-[--text-2]">
          <p>
            {q
              ? "Tidak ada projek yang cocok. Coba kata kunci lain."
              : "projek sedang disiapkan."}
          </p>
        </div>
      ) : error && items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[--text-2] mb-4">{error}</p>
          <button
            type="button"
            onClick={() => fetchPage({ ...activeQuery, offset: 0 }, true)}
            className="px-4 py-2 glass rounded-xl text-sm"
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <MasonryGrid>
            {items.map((p, i) => (
              <ProjectCard key={p.id} project={p} priority={i < 6} />
            ))}
          </MasonryGrid>

          {/* Muat lebih */}
          {loadingMore && (
            <MasonryGrid>
              {Array.from({ length: 4 }).map((_, i) => (
                <ProjectCardSkeleton key={i} aspect={SKELETON_ASPECTS[i % SKELETON_ASPECTS.length]!} />
              ))}
            </MasonryGrid>
          )}

          {/* Sentinel infinite scroll */}
          <div ref={sentinelRef} aria-hidden />

          {/* Tombol fallback keyboard */}
          {hasMore && !loadingMore && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={loadMore}
                className="px-6 py-3 glass rounded-xl text-sm text-[--text-2] hover:text-[--text] transition-colors"
              >
                Muat lebih banyak
              </button>
            </div>
          )}

          {error && items.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[--text-2] mb-2">{error}</p>
              <button
                type="button"
                onClick={loadMore}
                className="px-4 py-2 glass rounded-xl text-sm"
              >
                Coba lagi
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
