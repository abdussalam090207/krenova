import { publicMediaUrl, type StorageBackend } from "@/lib/storage/urls";

const BUCKET = "project-media";

export const storageUrl = (path?: string | null, backend?: StorageBackend | null): string | null => {
  if (!path) return null;
  return publicMediaUrl(backend, BUCKET, path);
};

/** Ekstrak YouTube video ID dari berbagai format URL */
export function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // watch?v=ID
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    // youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] ?? null;
    // /shorts/ID atau /embed/ID
    const m = u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
    if (m) return m[2] ?? null;
  } catch {
    // URL bukan format valid, coba regex simpel
    const m = url.match(/[?&]v=([^&]+)/);
    if (m) return m[1] ?? null;
  }
  return null;
}

export const youtubeThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;

export const fallbackAspect = (t: "image" | "video"): string =>
  t === "video" ? "16/9" : "4/5";
