import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DATA_MODE } from "@/lib/projects/repo";
import { ProjectViewer } from "@/components/projects/ProjectViewer";
import { ProjectInfo } from "@/components/projects/ProjectInfo";
import { CommentSection } from "@/components/projects/CommentSection";
import { RelatedProjects } from "@/components/projects/RelatedProjects";
import type { Project } from "@/lib/projects/types";

// ─── Data fetching ────────────────────────────────────────────────────────
async function getServerRepo() {
  if (DATA_MODE === "dummy") {
    const { dummyRepo } = await import("@/lib/projects/dummy-repo");
    return dummyRepo;
  }
  if (DATA_MODE === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
    const sb = createSupabaseServerClient();
    return createSupabaseRepo(sb);
  }
  return null;
}

// ─── generateMetadata ─────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getServerRepo();
  if (!repo) return { title: "Project" };

  const project = await repo.getBySlug(slug);
  if (!project) return { title: "Project tidak ditemukan" };

  const desc =
    project.description
      ? project.description.slice(0, 160)
      : `Karya ${project.serviceId.replace(/-/g, " ")} dari KRENOVA STUDIO.`;

  return {
    title: project.title,
    description: desc,
    openGraph: {
      title: project.title,
      description: desc,
      images: project.thumb.src ? [{ url: project.thumb.src }] : [],
    },
    alternates: { canonical: `/projects/${slug}` },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = await getServerRepo();

  if (!repo) {
    // mode none
    notFound();
  }

  const [project] = await Promise.all([
    repo.getBySlug(slug),
  ]);

  if (!project) notFound();

  // Fetch related & comments dengan project.id
  const [related, comments, currentUserId] = await Promise.all([
    repo.related(project.id, { offset: 0, limit: 20 }).catch(() => ({ items: [] as Project[], hasMore: false })),
    repo.comments(project.id, { offset: 0, limit: 20 }).catch(() => ({ items: [], hasMore: false })),
    repo.currentUserId().catch(() => null),
  ]);

  return (
    <main className="pt-28 md:pt-36 pb-20 mx-auto max-w-7xl px-5 md:px-8">
      {/* Kembali */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-[--text-2] hover:text-[--text] transition-colors mb-8"
      >
        <ChevronLeft size={16} />
        Kembali ke Projects
      </Link>

      {/* Panel utama */}
      <div className="glass-strong rounded-[32px] p-6 md:p-8 lg:p-10">
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-8 lg:gap-12">
          {/* Kolom media */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProjectViewer project={project} />
          </div>

          {/* Kolom info */}
          <div className="flex flex-col gap-8">
            <ProjectInfo project={project} />
            <CommentSection
              projectId={project.id}
              initialComments={comments.items}
              initialHasMore={comments.hasMore}
              initialCommentCount={project.commentCount}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>

      {/* Karya lainnya */}
      <RelatedProjects
        projectId={project.id}
        initialRelated={related.items}
        initialHasMore={related.hasMore}
      />
    </main>
  );
}
