"use client";

/**
 * AdModalLazy — Wrapper Client Component untuk lazy-load AdModal.
 * Diperlukan karena next/dynamic dengan ssr:false hanya boleh dipakai
 * di dalam Client Component, bukan Server Component (layout.tsx).
 */
import dynamic from "next/dynamic";

const AdModal = dynamic(
  () => import("@/components/home/AdModal").then((m) => ({ default: m.AdModal })),
  { ssr: false }
);

export function AdModalLazy() {
  return <AdModal />;
}
