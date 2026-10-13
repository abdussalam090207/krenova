interface ProjectCardSkeletonProps {
  aspect: string;
}

/**
 * Skeleton placeholder — blok semi-transparan dengan shimmer ringan.
 * prefers-reduced-motion: animasi shimmer dimatikan.
 */
export function ProjectCardSkeleton({ aspect }: ProjectCardSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      {/* Area media */}
      <div
        className="w-full rounded-2xl bg-white/5 motion-safe:animate-skeleton"
        style={{ aspectRatio: aspect }}
      />
      {/* Area teks */}
      <div className="pt-2.5 pb-1 flex flex-col gap-1.5">
        <div className="h-3 w-4/5 rounded bg-white/5 motion-safe:animate-skeleton" style={{ animationDelay: "0.1s" }} />
        <div className="h-2.5 w-1/2 rounded bg-white/5 motion-safe:animate-skeleton" style={{ animationDelay: "0.2s" }} />
      </div>
    </div>
  );
}
