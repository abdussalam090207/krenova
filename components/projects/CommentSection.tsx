"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Send, Trash2, Heart, CornerDownRight } from "lucide-react";
import type { ProjectComment } from "@/lib/projects/types";
import { DATA_MODE } from "@/lib/projects/repo";

// ─── Avatar URLs ──────────────────────────────────────────────────────────
const AVATARS = [
  "https://i.pinimg.com/1200x/cd/4b/d9/cd4bd9b0ea2807611ba3a67c331bff0b.jpg", // default
  "https://i.pinimg.com/1200x/f8/de/91/f8de914f7c96d3e0bf48657d84578a85.jpg",
  "https://i.pinimg.com/736x/66/c5/b2/66c5b23a0cafbf780261faf303c3387c.jpg",
  "https://i.pinimg.com/736x/50/d4/29/50d429ea5c9afe0ef9cb3c96f784bea4.jpg",
  "https://i.pinimg.com/736x/39/42/01/39420149269ede36847932935b26f0b8.jpg",
];

async function getRepo() {
  if (DATA_MODE === "dummy") {
    const { dummyRepo } = await import("@/lib/projects/dummy-repo");
    return { repo: dummyRepo, userId: await dummyRepo.currentUserId() };
  }
  if (DATA_MODE === "supabase") {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const { createSupabaseRepo } = await import("@/lib/projects/supabase-repo");
    const sb = createSupabaseBrowserClient();
    const repo = createSupabaseRepo(sb);
    return { repo, userId: await repo.currentUserId() };
  }
  return null;
}

// ─── Persistent state di localStorage ────────────────────────────────────
const NICKNAME_KEY = "krenova:nickname";
const AVATAR_KEY   = "krenova:avatar";

function getStored(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function setStored(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}

// ─── Like komentar: simpan di localStorage per browser ───────────────────
const LIKED_KEY = "krenova:liked_comments";
function getLikedComments(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")); } catch { return new Set(); }
}
function setLikedComments(s: Set<string>) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch {}
}

// ─── Waktu relatif ────────────────────────────────────────────────────────
function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const fmt = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
  if (diff < 60) return fmt.format(-Math.round(diff), "second");
  if (diff < 3600) return fmt.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return fmt.format(-Math.round(diff / 3600), "hour");
  return fmt.format(-Math.round(diff / 86400), "day");
}

// ─── CommentItem ─────────────────────────────────────────────────────────
function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onLike,
  likedSet,
  isReply = false,
}: {
  comment: ProjectComment;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onReply: (nickname: string, commentId: string) => void;
  onLike: (id: string, liked: boolean) => void;
  likedSet: Set<string>;
  isReply?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwn = currentUserId !== null && comment.userId === currentUserId;
  const liked = likedSet.has(comment.id);
  const avatarSrc = AVATARS[comment.avatarIndex] ?? AVATARS[0]!;

  return (
    <div className={`flex gap-3 ${isReply ? "py-1" : ""}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isReply ? "w-8 h-8" : "w-9 h-9"} rounded-full overflow-hidden border border-[--glass-border]`}>
        <Image
          src={avatarSrc}
          alt={comment.authorName}
          width={isReply ? 32 : 36}
          height={isReply ? 32 : 36}
          className="object-cover w-full h-full"
          unoptimized
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-semibold text-[--text] ${isReply ? "text-xs" : "text-sm"}`}>{comment.authorName}</span>
          {comment.isOwner && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[--blue]/20 text-[--aqua]">
              KRENOVA STUDIO
            </span>
          )}
          <span className="text-xs text-[--text-3]" suppressHydrationWarning>{relativeTime(comment.createdAt)}</span>
        </div>

        {/* Mention reply */}
        {comment.replyToName && (
          <span className="text-xs text-[--blue] font-medium inline-block mr-1">@{comment.replyToName}</span>
        )}

        <p className="mt-0.5 text-sm text-[--text-2] whitespace-pre-wrap break-words">
          {comment.body}
        </p>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-3">
          {/* Like komentar */}
          <button
            type="button"
            onClick={() => onLike(comment.id, !liked)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked ? "text-[--rose]" : "text-[--text-3] hover:text-[--rose]"
            }`}
            aria-label={liked ? "Batal suka komentar" : "Suka komentar"}
          >
            <Heart
              size={12}
              strokeWidth={1.5}
              fill={liked ? "currentColor" : "none"}
            />
            <span>{comment.likeCount}</span>
          </button>

          {/* Balas */}
          <button
            type="button"
            onClick={() => onReply(comment.authorName, comment.id)}
            className="flex items-center gap-1 text-xs text-[--text-3] hover:text-[--aqua] transition-colors"
          >
            <CornerDownRight size={12} strokeWidth={1.5} />
            Balas
          </button>

          {/* Hapus */}
          {isOwn && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-[--text-3] hover:text-[--rose] transition-colors"
            >
              <Trash2 size={11} />
              Hapus
            </button>
          )}
          {isOwn && confirmDelete && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[--text-2]">Hapus?</span>
              <button type="button" onClick={() => { onDelete(comment.id); setConfirmDelete(false); }}
                className="text-[--rose] hover:underline font-medium">Ya</button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="text-[--text-3] hover:underline">Batal</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CommentForm ──────────────────────────────────────────────────────────
function CommentForm({
  projectId,
  onAdded,
  replyTo,
  onCancelReply,
}: {
  projectId: string;
  onAdded: (c: ProjectComment) => void;
  replyTo: { nickname: string; commentId: string } | null;
  onCancelReply: () => void;
}) {
  // Baca dari localStorage via lazy initializer — menghindari setState dalam useEffect
  const [nickname, setNickname] = useState(() => getStored(NICKNAME_KEY, ""));
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const idx = parseInt(getStored(AVATAR_KEY, "0"), 10);
    return isNaN(idx) ? 0 : idx;
  });

  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [nicknameErr, setNicknameErr] = useState("");
  const [bodyErr, setBodyErr] = useState("");
  const [serverErr, setServerErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;

    let ok = true;
    const trimNick = nickname.trim();
    const trimBody = body.trim();

    if (trimNick.length < 2 || trimNick.length > 40) {
      setNicknameErr("Nickname harus 2–40 karakter."); ok = false;
    } else setNicknameErr("");
    if (trimBody.length < 1 || trimBody.length > 500) {
      setBodyErr("Komentar harus 1–500 karakter."); ok = false;
    } else setBodyErr("");
    if (!ok) return;

    setSending(true);
    setServerErr("");
    try {
      const repoData = await getRepo();
      if (!repoData) { setServerErr("Fitur komentar tidak tersedia."); return; }
      const { repo } = repoData;
      const comment = await repo.addComment(projectId, {
        authorName: trimNick,
        body: trimBody,
        avatarIndex: selectedAvatar,
        replyToId: replyTo?.commentId ?? null,
        replyToName: replyTo?.nickname ?? null,
      });
      setStored(NICKNAME_KEY, trimNick);
      setStored(AVATAR_KEY, String(selectedAvatar));
      setBody("");
      onAdded(comment);
      onCancelReply();
      setStatusMsg("Komentar berhasil dikirim.");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setServerErr(msg || "Gagal mengirim komentar. Coba lagi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      {/* Honeypot */}
      <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden
        style={{ position: "absolute", left: "-9999px", opacity: 0 }} />

      {/* Pilih avatar */}
      <div>
        <p className="text-xs text-[--text-3] mb-2">Pilih foto profil</p>
        <div className="flex gap-2">
          {AVATARS.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedAvatar(i)}
              aria-label={`Foto profil ${i + 1}`}
              className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-150 ${
                selectedAvatar === i
                  ? "border-[--blue] scale-110"
                  : "border-transparent hover:border-[--glass-border]"
              }`}
            >
              <Image src={src} alt={`Avatar ${i + 1}`} width={36} height={36}
                className="object-cover w-full h-full" unoptimized />
            </button>
          ))}
        </div>
      </div>

      {/* Nickname */}
      <div>
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          minLength={2}
          maxLength={40}
          aria-label="Nickname"
          aria-invalid={!!nicknameErr}
          className="w-full glass rounded-xl px-4 py-3 text-sm text-[--text] placeholder:text-[--text-3] bg-transparent focus:outline-none"
        />
        {nicknameErr && <p className="mt-1 text-xs text-[--rose]">{nicknameErr}</p>}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[--blue]/10 border border-[--blue]/20 text-xs">
          <CornerDownRight size={12} className="text-[--blue]" />
          <span className="text-[--text-2]">Membalas <strong className="text-[--text]">@{replyTo.nickname}</strong></span>
          <button type="button" onClick={onCancelReply} className="ml-auto text-[--text-3] hover:text-[--text]">✕</button>
        </div>
      )}

      {/* Komentar — Tombol kirim hanya icon di pojok kiri bawah form */}
      <div>
        <div className="relative glass rounded-xl overflow-hidden focus-within:border-[--blue]/50 transition-colors">
          <textarea
            ref={bodyRef}
            placeholder={replyTo ? `Balas @${replyTo.nickname}…` : "Komentar"}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            aria-label="Komentar"
            aria-invalid={!!bodyErr}
            className="w-full px-4 pt-3 pb-12 text-sm text-[--text] placeholder:text-[--text-3] bg-transparent focus:outline-none resize-none block"
          />

          {/* Tombol kirim icon-only di pojok kiri bawah */}
          <button
            type="submit"
            disabled={sending || !nickname.trim() || !body.trim()}
            aria-label="Kirim Komentar"
            title="Kirim Komentar"
            className="absolute bottom-2.5 left-2.5 flex items-center justify-center w-8 h-8 rounded-lg bg-[--blue] text-white hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all duration-150 shadow-sm cursor-pointer"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} className="translate-x-[1px]" />
            )}
          </button>

          {/* Counter karakter di pojok kanan bawah */}
          <span className="absolute bottom-2.5 right-3 text-[11px] text-[--text-3] pointer-events-none tabular-nums">
            {body.length}/500
          </span>
        </div>

        {bodyErr && <p className="mt-1 text-xs text-[--rose]">{bodyErr}</p>}
      </div>

      {serverErr && <p className="text-xs text-[--rose]">{serverErr}</p>}
      {statusMsg && <p className="text-xs text-[--aqua]">{statusMsg}</p>}
      <div aria-live="polite" className="sr-only">{statusMsg}</div>
    </form>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────
interface SectionProps {
  projectId: string;
  initialComments: ProjectComment[];
  initialHasMore: boolean;
  initialCommentCount: number;
  currentUserId: string | null;
}

export function CommentSection({
  projectId,
  initialComments,
  initialHasMore,
  initialCommentCount,
  currentUserId,
}: SectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialComments.length);
  const [count, setCount] = useState(initialCommentCount);
  const [loadErr, setLoadErr] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [userId] = useState(currentUserId);
  // Baca liked comments dari localStorage via lazy initializer
  const [likedSet, setLikedSet] = useState<Set<string>>(() => getLikedComments());

  const [replyTo, setReplyTo] = useState<{ nickname: string; commentId: string } | null>(null);

  const handleAdded = (c: ProjectComment) => {
    setComments(prev => [c, ...prev]);
    setCount(n => n + 1);
    setOffset(o => o + 1);
  };

  const handleDelete = async (commentId: string) => {
    const backup = [...comments];
    setComments(prev => prev.filter(c => c.id !== commentId));
    setCount(n => Math.max(0, n - 1));
    try {
      const repoData = await getRepo();
      if (!repoData) return;
      await repoData.repo.deleteComment(commentId);
    } catch {
      setComments(backup);
      setCount(n => n + 1);
    }
  };

  const handleLike = async (commentId: string, liked: boolean) => {
    // Optimistic update
    const newSet = new Set(likedSet);
    if (liked) newSet.add(commentId); else newSet.delete(commentId);
    setLikedSet(newSet);
    setLikedComments(newSet);

    // Update likeCount di UI
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likeCount: Math.max(0, c.likeCount + (liked ? 1 : -1)) }
        : c
    ));

    try {
      const repoData = await getRepo();
      if (!repoData) return;
      await repoData.repo.setCommentLike(commentId, liked);
    } catch {
      // Rollback
      const rollback = new Set(likedSet);
      setLikedSet(rollback);
      setLikedComments(rollback);
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, likeCount: Math.max(0, c.likeCount + (liked ? -1 : 1)) }
          : c
      ));
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadErr("");
    try {
      const repoData = await getRepo();
      if (!repoData) return;
      const page = await repoData.repo.comments(projectId, { offset, limit: 20 });
      setComments(prev => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setOffset(o => o + page.items.length);
    } catch {
      setLoadErr("Komentar gagal dimuat.");
    } finally {
      setLoadingMore(false);
    }
  };

  // Bangun struktur thread komentar (parent & balasan berantai)
  const rootComments: ProjectComment[] = [];
  const repliesMap = new Map<string, ProjectComment[]>();

  const commentIds = new Set(comments.map(c => c.id));

  for (const c of comments) {
    if (c.replyToId && commentIds.has(c.replyToId)) {
      // Temukan root parent jika reply berantai
      let rootId = c.replyToId;
      let depth = 0;
      while (depth < 10) {
        const parent = comments.find(p => p.id === rootId);
        if (parent?.replyToId && commentIds.has(parent.replyToId)) {
          rootId = parent.replyToId;
          depth++;
        } else {
          break;
        }
      }

      if (!repliesMap.has(rootId)) {
        repliesMap.set(rootId, []);
      }
      repliesMap.get(rootId)!.push(c);
    } else {
      rootComments.push(c);
    }
  }

  // Balasan diurutkan secara kronologis (terlama ke terbaru)
  for (const reps of repliesMap.values()) {
    reps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return (
    <section aria-label="Komentar">
      <h2 className="text-base font-semibold text-[--text] mb-4">
        Komentar ({count})
      </h2>

      <CommentForm
        projectId={projectId}
        onAdded={handleAdded}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

      <div className="mt-6 flex flex-col gap-6">
        {comments.length === 0 ? (
          <p className="text-sm text-[--text-3]">
            Belum ada komentar. Jadi yang pertama memberi tanggapan.
          </p>
        ) : (
          rootComments.map(root => {
            const replies = repliesMap.get(root.id) || [];
            return (
              <div key={root.id} className="flex flex-col gap-3">
                {/* Komentar Utama */}
                <CommentItem
                  comment={root}
                  currentUserId={userId}
                  onDelete={handleDelete}
                  onReply={(nickname, commentId) => setReplyTo({ nickname, commentId })}
                  onLike={handleLike}
                  likedSet={likedSet}
                />

                {/* Thread Balasan (Garis | di bawah komentar utama) */}
                {replies.length > 0 && (
                  <div className="relative ml-4 pl-4 sm:ml-5 sm:pl-5 border-l-1 border-[--glass-border] flex flex-col gap-3 mt-1">
                    {replies.map(reply => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        currentUserId={userId}
                        onDelete={handleDelete}
                        onReply={(nickname) => setReplyTo({ nickname, commentId: root.id })}
                        onLike={handleLike}
                        likedSet={likedSet}
                        isReply={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {loadErr && (
        <div className="mt-4 text-sm text-[--text-2]">
          {loadErr}
          <button onClick={loadMore} className="ml-2 underline text-[--aqua]">
            Coba lagi
          </button>
        </div>
      )}

      {hasMore && !loadErr && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-6 text-sm text-[--text-2] hover:text-[--text] underline"
        >
          {loadingMore ? "Memuat…" : "Muat komentar lainnya"}
        </button>
      )}
    </section>
  );
}
