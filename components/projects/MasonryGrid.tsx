"use client";

/**
 * MasonryGrid — distribusi kolom via JavaScript.
 * Jumlah kolom: <768 → 2, 768-1279 → 3, 1280-1535 → 4, ≥1536 → 5.
 * Menerima `children` (array React nodes) dan mendistribusikannya ke kolom.
 * Item yang sudah ditempatkan TIDAK berpindah saat item baru ditambahkan.
 */

import { useSyncExternalStore, useEffect, useState, Children } from "react";

// ─── Kolom helper ─────────────────────────────────────────────────────────
const CAPTION = 0.28;

function getColCount(width: number): number {
  if (width < 768)  return 2;
  if (width < 1280) return 3;
  if (width < 1536) return 4;
  return 5;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** Ekstrak aspect ratio dari props anak. Fallback ke "4/5". */
function getAspect(child: React.ReactNode): string {
  if (
    child &&
    typeof child === "object" &&
    "props" in child
  ) {
    const props = (child as React.ReactElement<{ aspect?: string; project?: { aspect?: string } }>).props;
    if (props.aspect) return props.aspect;
    if (props.project?.aspect) return props.project.aspect;
  }
  return "4/5";
}

/** Distribusi anak ke kolom berdasarkan rasio item */
function distributeChildren(children: React.ReactNode[], cols: number): React.ReactNode[][] {
  const out: React.ReactNode[][] = Array.from({ length: cols }, () => []);
  const h = new Array<number>(cols).fill(0);
  for (const child of children) {
    const aspect = getAspect(child);
    const parts = aspect.split("/").map(Number);
    const w = parts[0] ?? 1;
    const ht = parts[1] ?? 1;
    const ratio = clamp(ht / w, 0.25, 3.5) + CAPTION;
    const i = h.indexOf(Math.min(...h));
    out[i]!.push(child);
    h[i]! += ratio;
  }
  return out;
}

// ─── useSyncExternalStore untuk lebar window ──────────────────────────────
let _listeners: Array<() => void> = [];
let _cachedWidth = typeof window !== "undefined" ? window.innerWidth : 768;

function subscribeWindowWidth(cb: () => void) {
  _listeners.push(cb);
  const handler = () => {
    _cachedWidth = window.innerWidth;
    _listeners.forEach((l) => l());
  };
  window.addEventListener("resize", handler, { passive: true });
  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
    window.removeEventListener("resize", handler);
  };
}

function getWindowWidth() { return _cachedWidth; }
function getServerWidth() { return 768; }

// ─── Component ────────────────────────────────────────────────────────────
interface MasonryGridProps {
  children: React.ReactNode;
}

export function MasonryGrid({ children }: MasonryGridProps) {
  const width = useSyncExternalStore(subscribeWindowWidth, getWindowWidth, getServerWidth);
  const cols  = getColCount(width);
  const [ready, setReady] = useState(false);

  // Fade in setelah hidrasi — eslint disable karena ini pola yang valid untuk deteksi mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setReady(true); }, []);

  const gap = width < 768 ? "12px" : "16px";
  const childArray = Children.toArray(children);
  const columns = distributeChildren(childArray, cols);

  return (
    <div
      className={`flex min-w-0 transition-opacity duration-150 ${ready ? "opacity-100" : "opacity-0"}`}
      style={{ gap }}
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-1 min-w-0 flex-col" style={{ gap }}>
          {col}
        </div>
      ))}
    </div>
  );
}

// ─── Export fungsi distribute untuk digunakan di tempat lain ─────────────
export function distribute<T extends { aspect: string }>(items: T[], cols: number): T[][] {
  const out: T[][] = Array.from({ length: cols }, () => []);
  const h = new Array<number>(cols).fill(0);
  for (const it of items) {
    const parts = it.aspect.split("/").map(Number);
    const w = parts[0] ?? 1;
    const ht = parts[1] ?? 1;
    const ratio = clamp(ht / w, 0.25, 3.5) + CAPTION;
    const i = h.indexOf(Math.min(...h));
    out[i]!.push(it);
    h[i]! += ratio;
  }
  return out;
}
