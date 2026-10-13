/**
 * dummy-repo.ts
 * Repository mode dummy — tanpa postingan dummy (sesuai revisi Kerja.md).
 * Saat DATA_MODE = "dummy", halaman projects akan menampilkan state kosong.
 * Like dan komentar berjalan di memori browser.
 */

import type { ProjectComment } from "./types";
import type { ProjectsRepo } from "./repo";

// State memori browser
const likedProjectIds: Set<string> = new Set();
const likedCommentIds: Set<string> = new Set();
const commentStore: Record<string, ProjectComment[]> = {};
let commentIdCounter = 1000;
const DUMMY_USER_ID = "dummy-anon-visitor";

// ─── Implementasi DummyRepo ──────────────────────────────────────────────
export const dummyRepo: ProjectsRepo = {
  async list() {
    // Mode dummy: tidak ada postingan (karya asli dari admin/Supabase)
    return { items: [], hasMore: false };
  },

  async getBySlug() {
    return null;
  },

  async featured() {
    return [];
  },

  async related() {
    return { items: [], hasMore: false };
  },

  async comments(projectId, { offset, limit }) {
    const all = (commentStore[projectId] ?? []).slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items: all.slice(offset, offset + limit), hasMore: all.length > offset + limit };
  },

  async addComment(projectId, { authorName, body, avatarIndex, replyToId, replyToName }) {
    const comment: ProjectComment = {
      id: `dummy-cmt-${commentIdCounter++}`,
      projectId,
      userId: DUMMY_USER_ID,
      authorName: authorName.trim(),
      avatarIndex: avatarIndex ?? 0,
      body: body.trim(),
      replyToId: replyToId ?? null,
      replyToName: replyToName ?? null,
      likeCount: 0,
      isOwner: false,
      createdAt: new Date().toISOString(),
    };
    if (!commentStore[projectId]) commentStore[projectId] = [];
    commentStore[projectId]!.unshift(comment);
    return comment;
  },

  async deleteComment(commentId) {
    for (const pid of Object.keys(commentStore)) {
      const arr = commentStore[pid]!;
      const i = arr.findIndex(c => c.id === commentId && c.userId === DUMMY_USER_ID);
      if (i !== -1) { arr.splice(i, 1); return; }
    }
  },

  likedCommentIds() {
    return new Set(likedCommentIds);
  },

  async setCommentLike(commentId, liked) {
    if (liked) {
      likedCommentIds.add(commentId);
      // Update likeCount di memori
      for (const arr of Object.values(commentStore)) {
        const c = arr.find(c => c.id === commentId);
        if (c) { c.likeCount += 1; return c.likeCount; }
      }
    } else {
      likedCommentIds.delete(commentId);
      for (const arr of Object.values(commentStore)) {
        const c = arr.find(c => c.id === commentId);
        if (c) { c.likeCount = Math.max(0, c.likeCount - 1); return c.likeCount; }
      }
    }
    return 0;
  },

  async myLikedIds() {
    return new Set(likedProjectIds);
  },

  async setLike(projectId, liked) {
    if (liked) likedProjectIds.add(projectId);
    else likedProjectIds.delete(projectId);
    return 0;
  },

  async currentUserId() {
    return DUMMY_USER_ID;
  },
};
