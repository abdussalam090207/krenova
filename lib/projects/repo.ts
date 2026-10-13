import type { Project, ProjectComment, ListQuery, Page } from "./types";

export interface ProjectsRepo {
  list(q: ListQuery): Promise<Page<Project>>;
  getBySlug(slug: string): Promise<Project | null>;
  featured(limit: number): Promise<Project[]>;
  related(projectId: string, o: { offset: number; limit: number }): Promise<Page<Project>>;

  comments(projectId: string, o: { offset: number; limit: number }): Promise<Page<ProjectComment>>;
  addComment(projectId: string, input: {
    authorName: string;
    body: string;
    avatarIndex: number;
    replyToId?: string | null;
    replyToName?: string | null;
  }): Promise<ProjectComment>;
  deleteComment(commentId: string): Promise<void>;

  /** Like/unlike sebuah komentar */
  setCommentLike(commentId: string, liked: boolean): Promise<number>;
  /** ID komentar yang sudah di-like user (dari localStorage) */
  likedCommentIds(): Set<string>;

  myLikedIds(): Promise<Set<string>>;
  setLike(projectId: string, liked: boolean): Promise<number>;
  currentUserId(): Promise<string | null>;
}

// ─── Pemilih mode ──────────────────────────────────────────────────────────
export { DATA_MODE } from "@/lib/data-mode";
