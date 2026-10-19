"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { nav, isNavActive } from "@/config/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Deteksi arah scroll untuk hide/show navbar
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY;

      setScrolled(currentY > 20);

      // Selalu munculkan jika dekat dengan bagian atas
      if (currentY <= 20) {
        setNavVisible(true);
      } else if (diff > 8) {
        // Scroll ke bawah -> sembunyikan
        setNavVisible(false);
      } else if (diff < -8) {
        // Scroll ke atas -> munculkan
        setNavVisible(true);
      }

      lastScrollY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tutup sidebar saat rute berubah — sinkronisasi state saat render sesuai dokumentasi resmi React
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  // Sembunyikan header navigasi di halaman pesanan / penerimaan produk
  if (pathname?.startsWith("/katalog/pesanan")) {
    return null;
  }

  return (
    <>
      {/* ── Desktop Header ─────────────────────────────── */}
      <header
        className={[
          "fixed top-4 inset-x-0 z-50 hidden md:flex justify-center px-5",
          "transition-all duration-300 ease-in-out",
          navVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-24 opacity-0 pointer-events-none",
        ].join(" ")}
        aria-label="Navigasi utama"
      >
        <nav
          className={[
            "grid grid-cols-[1fr_auto_1fr] items-center px-4 rounded-full glass glass-strong glass-sheen",
            "w-full max-w-5xl h-14",
            scrolled ? "shadow-[0_8px_32px_rgba(0,0,0,.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,.5)]" : "",
            "transition-shadow duration-300",
          ].join(" ")}
        >
          {/* Kolom Kiri: Logo */}
          <div className="flex items-center justify-start">
            <Link
              href="/"
              className="text-[1.05rem] focus-visible:rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--aqua]"
            >
              <Logo />
            </Link>
          </div>

          {/* Kolom Tengah: Nav Links (Tepat di tengah navbar) */}
          <div className="relative flex items-center justify-center gap-1" role="list">
            {nav.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <div key={item.href} role="listitem" className="relative">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full glass glass-strong"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      aria-hidden="true"
                    />
                  )}
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "relative z-10 px-4 py-1.5 rounded-full text-sm font-medium",
                      "transition-colors duration-150 select-none",
                      active ? "text-[--text] font-semibold" : "text-[--text-2] hover:text-[--text]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Kolom Kanan: Tombol Dark / Light Mode */}
          <div className="flex items-center justify-end">
            <ThemeToggle variant="icon" />
          </div>
        </nav>
      </header>

      {/* ── Mobile Top Bar ──────────────────────────────── */}
      {/* 
        Hanya hamburger (liquid glass lingkaran, selalu fixed)
        dan KRENOVA Studio di sampingnya (tanpa bg/glass, sembunyi saat scroll ke bawah).
        Ikon chat dihilangkan.
      */}
      <div
        className="fixed top-3.5 left-4 z-50 flex md:hidden items-center gap-3.5"
        aria-label="Navigasi mobile"
      >
        {/* Hamburger: liquid glass berbentuk lingkaran, fixed */}
        <button
          ref={hamburgerRef}
          id="hamburger-btn"
          aria-label="Buka menu"
          aria-expanded={sidebarOpen}
          aria-controls="mobile-sidebar"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center justify-center w-11 h-11 rounded-full glass glass-strong glass-sheen text-[--text] hover:scale-105 active:scale-95 transition-all shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--aqua] cursor-pointer shrink-0"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>

        {/* Title "KRENOVA Studio": tanpa bg, tanpa liquid glass, hanya teks, hide saat scroll ke bawah */}
        <Link
          href="/"
          aria-label="KRENOVA Studio - Beranda"
          className={[
            "text-[1.05rem] transition-all duration-300 ease-in-out select-none inline-flex items-center",
            navVisible
              ? "opacity-100 translate-x-0 pointer-events-auto"
              : "opacity-0 -translate-x-3 pointer-events-none",
          ].join(" ")}
        >
          <Logo />
        </Link>
      </div>

      {/* ── Mobile Sidebar ─────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <MobileSidebar
            onClose={() => setSidebarOpen(false)}
            triggerRef={hamburgerRef}
          />
        )}
      </AnimatePresence>
    </>
  );
}
