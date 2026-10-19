"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Heart, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { nav } from "@/config/nav";
import { siteConfig, waLink } from "@/config/site";

interface StatsData {
  clients: string;
  likes: number;
  comments: number;
  visitors: number;
}

export function SiteFooter() {
  // Inisialisasi langsung — aman di client component (tidak menyebabkan cascading render)
  const [year] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<StatsData>({
    clients: "58+",
    likes: 0,
    comments: 0,
    visitors: 0,
  });

  useEffect(() => {

    // Cek pengunjung unik per browser (jika browser sama, tidak dihitung ulang)
    const VISITOR_KEY = "krenova:visitor_id";
    let vid = "";
    try {
      vid = localStorage.getItem(VISITOR_KEY) || "";
    } catch {
      /* noop */
    }

    const isNewVisitor = !vid;
    if (isNewVisitor) {
      vid = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try {
        localStorage.setItem(VISITOR_KEY, vid);
      } catch {
        /* noop */
      }
    }

    const fetchStats = async () => {
      try {
        let res: Response;
        if (isNewVisitor) {
          res = await fetch("/api/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId: vid }),
          });
        } else {
          res = await fetch("/api/stats");
        }
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Gagal memuat stats footer:", err);
      }
    };

    fetchStats();
  }, []);

  const wa0 = waLink(siteConfig.contacts[0].wa);
  const wa1 = waLink(siteConfig.contacts[1].wa);
  const waCta = waLink(
    siteConfig.contacts[0].wa,
    "Halo KRENOVA STUDIO, saya punya project dan ingin ceritakan kebutuhannya.",
  );

  const pathname = usePathname();

  // Sembunyikan footer di halaman pesanan / penerimaan produk
  if (pathname?.startsWith("/katalog/pesanan")) {
    return null;
  }

  return (
    <footer className="px-4 pb-8 pt-4 md:px-8">
      <GlassCard className="rounded-[32px] overflow-hidden">

        {/* ── Band ajakan ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-6 py-8 md:px-10 border-b border-[--glass-border]">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[--text] uppercase flex-1 leading-none select-none">
            KRENOVA STUDIO
          </h2>
          <Button
            asChild
            href={waCta}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="lg"
            className="shrink-0 border border-white/20 shadow-md"
          >
            <span className="flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              Chat via WhatsApp
            </span>
          </Button>
        </div>

        {/* ── Grid utama: Pesan, Dashboard, Halaman, Kontak ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6 py-8 md:px-10">

          {/* Kolom 1: Pesan */}
          <div className="space-y-3">
            <p className="font-display font-medium text-base sm:text-lg text-[--text] leading-snug">
              Punya project desain atau video?{" "}
              <span className="text-[--text-2] font-normal block mt-1 text-sm leading-relaxed">
                Ceritakan kebutuhanmu, kami balas lewat WhatsApp.
              </span>
            </p>
          </div>

          {/* Kolom 2: Dashboard */}
          <div>
            <h3 className="text-sm text-[--text-2] font-semibold mb-4">Dashboard</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-[--text-3]">
                <Users className="w-4 h-4 text-[--aqua] shrink-0" />
                <span>Client : <strong className="text-[--text] font-semibold">{stats.clients}</strong></span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[--text-3]">
                <Heart className="w-4 h-4 text-[--rose] shrink-0" />
                <span> : <strong className="text-[--text] font-semibold">{stats.likes}</strong></span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[--text-3]">
                <MessageSquare className="w-4 h-4 text-[--aqua] shrink-0" />
                <span> : <strong className="text-[--text] font-semibold">{stats.comments}</strong></span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[--text-3]">
                <Eye className="w-4 h-4 text-[--text] shrink-0" />
                <span> : <strong className="text-[--text] font-semibold">{stats.visitors}</strong></span>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Halaman */}
          <div>
            <h3 className="text-sm text-[--text-2] font-semibold mb-4">Halaman</h3>
            <ul className="space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[--text-3] hover:text-[--text] transition-colors duration-150"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/katalog/syarat"
                  className="text-sm text-[--text-3] hover:text-[--text] transition-colors duration-150"
                >
                  Syarat Katalog
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Kontak (naik ke atas) */}
          <div>
            <h3 className="text-sm text-[--text-2] font-semibold mb-3">Kontak</h3>
            <div className="space-y-2">
              <WAButton href={wa0} display={siteConfig.contacts[0].display} />
              <WAButton href={wa1} display={siteConfig.contacts[1].display} />
            </div>
            {/* Email/sosial/alamat — hanya muncul kalau terisi */}
            {siteConfig.email && (
              <a
                href={`mailto:${siteConfig.email}`}
                className="block mt-2 text-sm text-[--text-3] hover:text-[--text] transition-colors"
              >
                {siteConfig.email}
              </a>
            )}
            {siteConfig.addressShort && (
              <p className="mt-2 text-sm text-[--text-3]">
                {siteConfig.addressShort}
                {siteConfig.mapsUrl && (
                  <>
                    {" · "}
                    <a
                      href={siteConfig.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[--text] transition-colors"
                    >
                      Lihat peta
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* ── Bar bawah ───────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-10 border-t border-[--glass-border]">
          <p className="text-xs text-[--text-3]">
            © {year} KRENOVA STUDIO. Hak cipta dilindungi.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Kembali ke atas"
            className="text-xs text-[--text-3] hover:text-[--text] transition-colors flex items-center gap-1.5 focus-visible:rounded"
          >
            Ke atas ↑
          </button>
        </div>
      </GlassCard>
    </footer>
  );
}

function WAButton({ href, display }: { href: string; display: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-[--text-2] hover:text-[--text] transition-colors min-h-[44px]"
    >
      <WhatsAppIcon className="w-4 h-4 shrink-0" />
      {display}
    </a>
  );
}
