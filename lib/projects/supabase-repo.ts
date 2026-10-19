/**
 * supabase-repo.ts
 * Implementasi ProjectsRepo menggunakan Supabase.
 * Dipakai saat DATA_MODE === "supabase".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectComment, ListQuery, MediaType } from "./types";
import type { ProjectsRepo } from "./repo";
import { storageUrl, parseYouTubeId, youtubeThumb, fallbackAspect } from "./media";
import { ensureSession, AnonAuthError } from "@/lib/supabase/session";
export { AnonAuthError };

// ─── Like komentar: disimpan di localStorage browser ─────────────────────
const LIKED_COMMENTS_KEY = "krenova:liked_comments";
function getLikedComments(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_COMMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function setLikedComments(set: Set<string>) {
  try { localStorage.setItem(LIKED_COMMENTS_KEY, JSON.stringify([...set])); } catch {}
}

// ─── Like projek: disimpan di localStorage browser ───────────────────────
const LIKED_PROJECTS_KEY = "krenova:liked_projects";
function getLikedProjects(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_PROJECTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function setLikedProjects(set: Set<string>) {
  try { localStorage.setItem(LIKED_PROJECTS_KEY, JSON.stringify([...set])); } catch {}
}

// ─── Sanitasi input pencarian ─────────────────────────────────────────────
function sanitizeSearch(q: string): string {
  return q.replace(/[,()"\\\%*]/g, "").slice(0, 60).trim();
}

// ─── Peta kolom snake_case → camelCase ───────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProject(row: any): Project {
  const backend = (row.storage_backend as import("@/lib/storage/urls").StorageBackend) || "supabase";
  const youtubeId = row.external_url ? parseYouTubeId(row.external_url) : null;
  const mediaPath = row.media_path as string | null;
  const thumbPath = row.thumb_path as string | null;

  // Deteksi video secara tangguh: media_type, category, atau ekstensi file
  const isVideo =
    row.media_type === "video" ||
    row.category === "video" ||
    /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(mediaPath || "") ||
    /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(thumbPath || "");

  const resolvedMediaType: MediaType = isVideo ? "video" : "image";

  const aspect = row.width && row.height
    ? `${row.width}/${row.height}`
    : fallbackAspect(resolvedMediaType);

  const thumbSrc =
    storageUrl(thumbPath ?? mediaPath, backend) ?? (youtubeId ? youtubeThumb(youtubeId) : null) ?? undefined;
  const fullSrc =
    storageUrl(mediaPath, backend) ?? (youtubeId ? youtubeThumb(youtubeId) : null) ?? undefined;

  // Kumpulkan semua URL media
  const mediaUrls: string[] = [];
  if (Array.isArray(row.media_urls) && row.media_urls.length > 0) {
    for (const u of row.media_urls) {
      const url = u.startsWith("http") ? u : (storageUrl(u, backend) ?? u);
      if (url) mediaUrls.push(url);
    }
  } else if (fullSrc) {
    mediaUrls.push(fullSrc);
  }

  // Tentukan URL video untuk videoSrc
  let videoSrc: string | null = null;
  if (isVideo) {
    if (mediaPath) {
      videoSrc = storageUrl(mediaPath, backend) ?? (mediaPath.startsWith("http") ? mediaPath : null);
    }
    if (!videoSrc && mediaUrls.length > 0) {
      const vid = mediaUrls.find((u) => /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(u));
      if (vid) videoSrc = vid;
    }
  }

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    description: row.description as string | null,
    category: row.category as "design" | "video",
    serviceId: (row.service_id as string) ?? "other",
    mediaType: resolvedMediaType,
    aspect,
    thumb: { kind: undefined, aspect, alt: row.title as string, src: thumbSrc },
    full:  { kind: undefined, aspect, alt: row.title as string, src: fullSrc },
    mediaUrls,
    videoSrc,
    youtubeId,
    externalUrl: (row.external_url as string | null) ?? null,
    durationSeconds: row.duration_seconds as number | null,
    tags: (row.tags ?? []) as string[],
    isFeatured: row.is_featured as boolean,
    likeCount: row.like_count as number,
    commentCount: row.comment_count as number,
    createdAt: row.created_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(row: any): ProjectComment {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    authorName: row.author_name,
    avatarIndex: (row.avatar_index as number) ?? 0,
    body: row.body,
    replyToId: row.reply_to_id ?? null,
    replyToName: row.reply_to_name ?? null,
    likeCount: (row.like_count as number) ?? 0,
    isOwner: row.is_owner,
    createdAt: row.created_at,
  };
}


// ─── Pemeriksaan kecocokan multi-field untuk pencarian ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchesProject(row: any, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = rawQuery.toLowerCase().trim();
  const terms = query.split(/\s+/).filter(Boolean);

  const title = String(row.title || "").toLowerCase();
  const subtitle = String(row.subtitle || "").toLowerCase();
  const desc = String(row.description || "").toLowerCase();
  const slug = String(row.slug || "").toLowerCase();
  const serviceId = String(row.service_id || "").toLowerCase();
  const mediaType = String(row.media_type || "").toLowerCase();
  const extUrl = String(row.external_url || "").toLowerCase();

  // Tags (semua tag dalam huruf kecil)
  const tags: string[] = Array.isArray(row.tags)
    ? row.tags.map((t: string) => String(t).toLowerCase())
    : [];

  // Kategori & sinonim bahasa Indonesia
  const cat = String(row.category || "").toLowerCase();
  const catSynonyms: string[] = [];
  if (cat === "design") {
    catSynonyms.push("design", "desain", "grafis", "desain grafis", "graphic design");
  } else if (cat === "video") {
    catSynonyms.push("video", "editing", "video editing", "editor", "video editor");
  } else {
    catSynonyms.push(cat);
  }

  // Tanggal dalam format ISO & berbagai format lokal bahasa Indonesia
  const dateStrings: string[] = [];
  if (row.created_at) {
    try {
      const d = new Date(row.created_at);
      if (!isNaN(d.getTime())) {
        dateStrings.push(d.toISOString().slice(0, 10)); // 2026-10-09
        dateStrings.push(String(d.getFullYear()));       // 2026
        dateStrings.push(String(d.getDate()));           // 9

        const fullIndo = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(d).toLowerCase();
        const longIndo = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d).toLowerCase();
        const medIndo  = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d).toLowerCase();
        dateStrings.push(fullIndo, longIndo, medIndo);

        // Nama bulan bahasa Indonesia
        const MONTHS = [
          "januari", "februari", "maret", "april", "mei", "juni",
          "juli", "agustus", "september", "oktober", "november", "desember"
        ];
        const mIdx = d.getMonth();
        if (MONTHS[mIdx]) {
          dateStrings.push(MONTHS[mIdx]!);
        }
      }
    } catch {
      dateStrings.push(String(row.created_at).toLowerCase());
    }
  }

  // Tipe media
  const mediaTypes = mediaType === "video"
    ? ["video", "vidio", "film"]
    : ["image", "gambar", "foto", "desain"];

  // Gabungkan seluruh teks pencarian untuk project ini
  const searchPool = [
    title,
    subtitle,
    desc,
    slug,
    serviceId,
    extUrl,
    ...mediaTypes,
    ...tags,
    ...catSynonyms,
    ...dateStrings,
  ].join(" ");

  // Cocok jika seluruh string query ditemukan atau setiap kata (term) ditemukan
  if (searchPool.includes(query)) return true;
  return terms.every((term) => searchPool.includes(term));
}

// ─── Factory ─────────────────────────────────────────────────────────────
export function createSupabaseRepo(sb: SupabaseClient): ProjectsRepo {
  return {
    async list(q: ListQuery) {
      let req = sb.from("projects").select("*").eq("is_published", true);
      if (q.category)  req = req.eq("category", q.category);
      if (q.serviceId) req = req.eq("service_id", q.serviceId);

      // Jika ada kata kunci pencarian, ambil data dan filter multi-field secara komprehensif
      if (q.q && q.q.trim()) {
        const cleanQuery = sanitizeSearch(q.q);
        const { data, error } = await req;
        if (error) throw error;
        const allRows = data ?? [];

        const filtered = allRows.filter((row) => matchesProject(row, cleanQuery));

        // Urutkan sesuai sort
        filtered.sort((a, b) => {
          if (q.sort === "popular") {
            const diffLikes = (b.like_count || 0) - (a.like_count || 0);
            if (diffLikes !== 0) return diffLikes;
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        const paged = filtered.slice(q.offset, q.offset + q.limit);
        const hasMore = filtered.length > q.offset + q.limit;

        return {
          items: paged.map(mapProject),
          hasMore,
        };
      }

      // Query langsung terpaginasi jika tanpa filter pencarian teks
      req = q.sort === "popular"
        ? req.order("like_count", { ascending: false }).order("created_at", { ascending: false })
        : req.order("created_at", { ascending: false });
      req = req.order("id", { ascending: false }).range(q.offset, q.offset + q.limit);
      const { data, error } = await req;
      if (error) throw error;
      const rows = data ?? [];
      return { items: rows.slice(0, q.limit).map(mapProject), hasMore: rows.length > q.limit };
    },

    async getBySlug(slug) {
      const { data, error } = await sb.from("projects").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (error) throw error;
      return data ? mapProject(data) : null;
    },

    async featured(limit) {
      const { data, error } = await sb.from("projects").select("*")
        .eq("is_featured", true).eq("is_published", true)
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length > 0) {
        return rows.map(mapProject);
      }
      // Fallback: jika belum ada project yang diset is_featured khusus, tampilkan project terbaru yang dipublish
      const { data: fallbackData, error: fallbackErr } = await sb.from("projects").select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false }).limit(limit);
      if (fallbackErr) throw fallbackErr;
      return (fallbackData ?? []).map(mapProject);
    },

    async related(projectId, { offset, limit }) {
      const { data, error } = await sb.rpc("related_projects", {
        p_project_id: projectId,
        p_limit: limit + 1,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = data ?? [];
      return { items: rows.slice(0, limit).map(mapProject), hasMore: rows.length > limit };
    },

    async comments(projectId, { offset, limit }) {
      const { data, error } = await sb.from("project_comments")
        .select("id, project_id, user_id, author_name, avatar_index, body, reply_to_id, reply_to_name, like_count, is_owner, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit);
      if (error) throw error;
      const rows = data ?? [];
      return { items: rows.slice(0, limit).map(mapComment), hasMore: rows.length > limit };
    },

    async addComment(projectId, { authorName, body, avatarIndex, replyToId, replyToName }) {
      const userId = await ensureSession(sb);
      const { data, error } = await sb.from("project_comments")
        .insert({
          project_id: projectId,
          user_id: userId,
          author_name: authorName,
          body,
          avatar_index: avatarIndex ?? 0,
          reply_to_id: replyToId ?? null,
          reply_to_name: replyToName ?? null,
        })
        .select("id, project_id, user_id, author_name, avatar_index, body, reply_to_id, reply_to_name, like_count, is_owner, created_at")
        .single();
      if (error) throw error;
      return mapComment(data);
    },

    async deleteComment(commentId) {
      const { error } = await sb.from("project_comments").delete().eq("id", commentId);
      if (error) throw error;
    },

    // ─── Comment likes (localStorage + Supabase) ──────────────────────────
    likedCommentIds() {
      return getLikedComments();
    },

    async setCommentLike(commentId, liked) {
      const userId = await ensureSession(sb);

      const likes = getLikedComments();
      if (liked) {
        if (userId) {
          const { error } = await sb.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
          if (error && error.code !== "23505") throw error;
        }
        likes.add(commentId);
      } else {
        if (userId) {
          await sb.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
        }
        likes.delete(commentId);
      }
      setLikedComments(likes);

      // Hitung exact count langsung dari tabel comment_likes
      const { count } = await sb
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId);

      if (typeof count === "number") {
        return count;
      }

      const { data } = await sb.from("project_comments").select("like_count").eq("id", commentId).single();
      return (data?.like_count as number) ?? (liked ? 1 : 0);
    },

    // ─── Project likes (localStorage + Supabase) ──────────────────────────
    async myLikedIds() {
      // Prioritas: localStorage (browser storage = persisten lintas sesi)
      const local = getLikedProjects();
      if (local.size > 0) return local;

      // Fallback: Supabase (jika ada sesi)
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return new Set<string>();
      const { data } = await sb.from("project_likes").select("project_id").eq("user_id", session.user.id);
      const ids = new Set((data ?? []).map((r: { project_id: string }) => r.project_id));
      // Simpan ke localStorage
      setLikedProjects(ids);
      return ids;
    },

    async setLike(projectId, liked) {
      const userId = await ensureSession(sb);

      const local = getLikedProjects();
      if (liked) {
        if (userId) {
          const { error } = await sb.from("project_likes").insert({ project_id: projectId, user_id: userId });
          if (error && error.code !== "23505") throw error;
        }
        local.add(projectId);
      } else {
        if (userId) {
          await sb.from("project_likes").delete().eq("project_id", projectId).eq("user_id", userId);
        }
        local.delete(projectId);
      }
      setLikedProjects(local);

      // Hitung exact count langsung dari tabel project_likes
      const { count } = await sb
        .from("project_likes")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (typeof count === "number") {
        return count;
      }

      const { data } = await sb.from("projects").select("like_count").eq("id", projectId).single();
      return (data?.like_count as number) ?? (liked ? 1 : 0);
    },

    async currentUserId() {
      const { data: { session } } = await sb.auth.getSession();
      return session?.user.id ?? null;
    },
  };
}
