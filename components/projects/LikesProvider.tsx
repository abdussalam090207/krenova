"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Project } from "@/lib/projects/types";

interface LikesCtx {
  isLiked: (id: string) => boolean;
  getCount: (id: string, fallback: number) => number;
  toggle: (project: Project) => void;
  errorMsg: string | null;
}

const Ctx = createContext<LikesCtx>({
  isLiked: () => false,
  getCount: (_, f) => f,
  toggle: () => {},
  errorMsg: null,
});

export function useLikes() {
  return useContext(Ctx);
}

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pending = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Muat liked IDs: prioritas localStorage (persisten di browser), lalu Supabase
    (async () => {
      try {
        const { DATA_MODE } = await import("@/lib/projects/repo");
        if (DATA_MODE === "none") return;

        if (DATA_MODE === "dummy") {
          const { dummyRepo } = await import("@/lib/projects/dummy-repo");
          const ids = await dummyRepo.myLikedIds();
          setLiked(ids);
          return;
        }

        // Mode supabase: baca localStorage terlebih dahulu (instantaneous, lintas sesi)
        const LIKED_PROJECTS_KEY = "krenova:liked_projects";
        try {
          const raw = localStorage.getItem(LIKED_PROJECTS_KEY);
          if (raw) {
            const ids = new Set<string>(JSON.parse(raw));
            if (ids.size > 0) { setLiked(ids); return; }
          }
        } catch {}

        // Fallback: Supabase (jika ada sesi aktif)
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
        const sb = createSupabaseBrowserClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;
        const repo = createSupabaseRepo(sb);
        const ids = await repo.myLikedIds();
        setLiked(ids);
      } catch {
        // abaikan — tidak kritis
      }
    })();
  }, []);

  const isLiked = useCallback((id: string) => liked.has(id), [liked]);
  const getCount = useCallback(
    (id: string, fallback: number) => counts.get(id) ?? fallback,
    [counts]
  );

  const toggle = useCallback(async (project: Project) => {
    const id = project.id;
    if (pending.current.has(id)) return;
    pending.current.add(id);

    const wasLiked = liked.has(id);
    const prevCount = counts.get(id) ?? project.likeCount;

    const optimisticCount = Math.max(0, prevCount + (wasLiked ? -1 : 1));

    // Optimistis
    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setCounts((prev) => {
      const next = new Map(prev);
      next.set(id, optimisticCount);
      return next;
    });

    try {
      const { DATA_MODE } = await import("@/lib/projects/repo");
      let newCount: number;
      if (DATA_MODE === "dummy") {
        const { dummyRepo } = await import("@/lib/projects/dummy-repo");
        newCount = await dummyRepo.setLike(id, !wasLiked);
      } else if (DATA_MODE === "supabase") {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
        const sb = createSupabaseBrowserClient();
        const repo = createSupabaseRepo(sb);
        newCount = await repo.setLike(id, !wasLiked);
      } else {
        throw new Error("none");
      }
      const finalCount = (!wasLiked && newCount === 0) ? optimisticCount : newCount;
      setCounts((prev) => new Map(prev).set(id, finalCount));
      setErrorMsg(null);
    } catch (err: unknown) {
      // Kembalikan state
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) { next.add(id); } else { next.delete(id); }
        return next;
      });
      setCounts((prev) => new Map(prev).set(id, prevCount));

      const msg =
        err instanceof Error && err.message === "AnonAuthError"
          ? "Suka dan komentar sedang tidak tersedia."
          : "Gagal menyimpan suka. Coba lagi.";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      pending.current.delete(id);
    }
  }, [liked, counts]);

  return (
    <Ctx.Provider value={{ isLiked, getCount, toggle, errorMsg }}>
      {children}
      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl glass text-sm text-[--text]"
        >
          {errorMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
