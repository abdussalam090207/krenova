/**
 * session-cache.ts
 * Simpan dan pulihkan state grid /projects saat tombol Back ditekan.
 * Format kunci: "krenova:projects:<query string>"
 * Expire 10 menit.
 */

import type { Project } from "./types";

interface CacheEntry {
  items: Project[];
  offset: number;
  hasMore: boolean;
  scrollY: number;
  savedAt: number;
}

const PREFIX = "krenova:projects:";
const TTL_MS = 10 * 60 * 1000; // 10 menit

function key(query: string): string {
  return PREFIX + query;
}

export function saveGridCache(query: string, entry: Omit<CacheEntry, "savedAt">): void {
  try {
    const val: CacheEntry = { ...entry, savedAt: Date.now() };
    sessionStorage.setItem(key(query), JSON.stringify(val));
  } catch { /* noop */ }
}

export function loadGridCache(query: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(key(query));
    if (!raw) return null;
    const val = JSON.parse(raw) as CacheEntry;
    if (Date.now() - val.savedAt > TTL_MS) {
      sessionStorage.removeItem(key(query));
      return null;
    }
    sessionStorage.removeItem(key(query));
    return val;
  } catch {
    return null;
  }
}

export function clearGridCache(query: string): void {
  try {
    sessionStorage.removeItem(key(query));
  } catch { /* noop */ }
}

/** Alias untuk kemudahan: simpan hanya scrollY (items bisa kosong) */
export function saveGridState(query: string, partial: Omit<CacheEntry, "savedAt">): void {
  saveGridCache(query, partial);
}
