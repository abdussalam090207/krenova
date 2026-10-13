import type { MediaSpec } from "@/config/services";

export type ProjectCategory = "design" | "video";
export type MediaType = "image" | "video";

export interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;          // sub judul dari admin
  description: string | null;
  category: ProjectCategory;
  serviceId: string;
  mediaType: MediaType;
  aspect: string;                   // "lebar/tinggi", mis. "1600/1000"
  thumb: MediaSpec;                 // kartu grid
  full: MediaSpec;                  // preview (untuk video = poster)
  mediaUrls: string[];              // semua URL media (maks 5)
  videoSrc: string | null;          // URL file video di Storage
  youtubeId: string | null;         // kalau video dari YouTube
  externalUrl: string | null;       // link eksternal dari admin (Instagram, Behance, dll.)
  durationSeconds: number | null;
  tags: string[];
  isFeatured: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;                // ISO
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  authorName: string;
  avatarIndex: number;              // 0-4, pilihan foto profil
  body: string;
  replyToId: string | null;         // ID komentar yang dibalas
  replyToName: string | null;       // nama yang dibalas (snapshot)
  likeCount: number;                // like per komentar
  isOwner: boolean;
  createdAt: string;
}

export interface ListQuery {
  category?: ProjectCategory;
  serviceId?: string;
  q?: string;
  sort: "new" | "popular";
  offset: number;
  limit: number;                   // default 20
}

export interface Page<T> { items: T[]; hasMore: boolean; }
