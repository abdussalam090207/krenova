import type { Metadata } from "next";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";
import { DATA_MODE } from "@/lib/projects/repo";
import type { ListQuery } from "@/lib/projects/types";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Kumpulan hasil kerja desain grafis dan video editing dari KRENOVA STUDIO.",
};

interface SearchParams {
  type?: string;
  service?: string;
  q?: string;
  sort?: string;
}

async function fetchInitial(sp: SearchParams) {
  if (DATA_MODE === "none") return { items: [], hasMore: false };

  const query: ListQuery = {
    category: (sp.type === "design" || sp.type === "video") ? sp.type : undefined,
    serviceId: sp.service || undefined,
    q: sp.q || undefined,
    sort: sp.sort === "popular" ? "popular" : "new",
    offset: 0,
    limit: 20,
  };

  try {
    if (DATA_MODE === "dummy") {
      const { dummyRepo } = await import("@/lib/projects/dummy-repo");
      return { ...(await dummyRepo.list(query)), query };
    }
    // supabase — server client (tanpa sesi)
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
    const sb = createSupabaseServerClient();
    const repo = createSupabaseRepo(sb);
    return { ...(await repo.list(query)), query };
  } catch {
    return { items: [], hasMore: false, query };
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { items, hasMore, query } = await fetchInitial(sp) as {
    items: Awaited<ReturnType<typeof fetchInitial>>["items"];
    hasMore: boolean;
    query?: ListQuery;
  };

  const initialQuery: ListQuery = query ?? { sort: "new", offset: 0, limit: 20 };
  const qs = new URLSearchParams(sp as Record<string, string>).toString();

  return (
    <main className="pt-28 md:pt-36 mx-auto max-w-7xl px-5 md:px-8 pb-20">
      <ProjectsExplorer
        initialItems={items}
        initialHasMore={hasMore}
        initialQuery={initialQuery}
        queryString={qs}
      />
    </main>
  );
}
