"use client";

import { motion, AnimatePresence } from "motion/react";

/**
 * template.tsx — transisi antar halaman
 * Fade opacity 200ms. Tanpa slide.
 * Dipanggil otomatis Next.js App Router saat navigasi antar rute.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={typeof window !== "undefined" ? window.location.pathname : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
