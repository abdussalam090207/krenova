"use client";

import { Heart } from "lucide-react";
import { useLikes } from "./LikesProvider";
import type { Project } from "@/lib/projects/types";

interface Props {
  project: Project;
  /** "card" = kecil (40×40), "preview" = lebih besar + teks */
  variant?: "card" | "preview";
}

export function LikeButton({ project, variant = "card" }: Props) {
  const { isLiked, getCount, toggle } = useLikes();
  const liked = isLiked(project.id);
  const count = getCount(project.id, project.likeCount);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(project);
  };

  if (variant === "preview") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        aria-label={`Suka projek ini, ${count} orang menyukai`}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass transition-transform active:scale-95"
        style={{ color: liked ? "var(--rose)" : "var(--text-2)" }}
      >
        <Heart
          size={18}
          fill={liked ? "currentColor" : "none"}
          strokeWidth={liked ? 0 : 2}
          className="transition-transform duration-200 motion-safe:active:scale-125"
        />
        <span className="text-sm font-medium tabular-nums">{count}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={`Suka Projek ini, ${count} orang menyukai`}
      className={[
        "relative z-10 flex items-center justify-center w-10 h-10 rounded-full glass",
        "transition-opacity duration-150",
        "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
        "[@media(hover:none)]:opacity-100",
      ].join(" ")}
      style={{ color: liked ? "var(--rose)" : "var(--text-2)" }}
    >
      <Heart
        size={16}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={liked ? 0 : 2}
        className="transition-transform duration-200 motion-safe:active:scale-125"
      />
    </button>
  );
}
