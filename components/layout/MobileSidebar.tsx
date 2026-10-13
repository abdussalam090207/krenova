"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { nav, isNavActive } from "@/config/nav";

interface MobileSidebarProps {
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function MobileSidebar({ onClose, triggerRef }: MobileSidebarProps) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fokus ke tombol tutup saat muncul
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Kunci fokus di dalam sidebar & scroll body
  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Beri inert ke main agar screen reader tidak menjelajahi konten di balik sidebar
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.setAttribute("inert", "");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;

      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    // Simpan ref ke variabel lokal agar cleanup mendapat nilai yang benar
    const triggerEl = triggerRef.current;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.removeAttribute("inert");
      // Kembalikan fokus ke hamburger saat tutup
      triggerEl?.focus();
    };
  }, [onClose, triggerRef]);

  return (
    <>
      {/* Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <motion.div
        key="sidebar"
        ref={sidebarRef}
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 bottom-0 z-[70] flex flex-col glass glass-strong shadow-2xl"
        style={{ width: "min(82vw, 320px)", borderRadius: "0 24px 24px 0" }}
      >
        {/* Header sidebar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Link href="/" onClick={onClose} className="text-[0.95rem]">
            <Logo />
          </Link>
          <button
            ref={closeRef}
            aria-label="Tutup menu"
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-[--text-2] hover:text-[--text] hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[--glass-border] mx-5" />

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1.5 px-3 pt-4" aria-label="Halaman">
          {nav.map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center px-4 rounded-xl min-h-[52px] font-display",
                  "text-[1.35rem] font-semibold tracking-tight transition-colors duration-150",
                  active
                    ? "bg-black/6 dark:bg-white/10 text-[--text]"
                    : "text-[--text-2] hover:text-[--text] hover:bg-black/4 dark:hover:bg-white/6",
                ].join(" ")}
              >
                {item.label}
                {active && (
                  <span
                    className="ml-auto w-1.5 h-6 rounded-full bg-[--aqua]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bagian Bawah: Menggantikan 'Kreatif Inovatif Studio' dan nomor kontak dengan Dark/Light Mode toggle */}
        <div className="px-5 pb-8 pt-4 space-y-3">
          <div className="h-px bg-[--glass-border] mb-3" />
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[--text-3] uppercase tracking-wider block">
              Tema Tampilan
            </span>
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </motion.div>
    </>
  );
}
