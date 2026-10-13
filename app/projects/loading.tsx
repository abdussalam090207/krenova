import { MasonryGrid } from "@/components/projects/MasonryGrid";
import { ProjectCardSkeleton } from "@/components/projects/ProjectCardSkeleton";

const SKELETONS = ["4/5", "3/4", "16/9", "1/1", "9/16", "4/3", "3/4", "4/5"];

export default function ProjectsLoading() {
  return (
    <div className="pt-28 md:pt-36 mx-auto max-w-7xl px-5 md:px-8">
      <div className="mb-8">
        <div className="h-10 w-28 rounded-xl animate-skeleton mb-2" />
        <div className="h-5 w-80 rounded-lg animate-skeleton" />
      </div>
      <MasonryGrid>
        {SKELETONS.map((a, i) => (
          <ProjectCardSkeleton key={i} aspect={a} />
        ))}
      </MasonryGrid>
    </div>
  );
}
