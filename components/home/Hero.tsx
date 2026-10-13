
import { Button } from "@/components/ui/Button";
import { HeroBanner } from "./HeroBanner";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { siteConfig, waLink } from "@/config/site";

export function Hero() {
  const waHref = waLink(siteConfig.contacts[0].wa);

  return (
    <section
      className="mx-auto max-w-6xl px-5 md:px-8 pt-24 sm:pt-28 md:pt-36 pb-8 md:pb-16"
      aria-label="Hero"
    >
      <div className="hero-layout min-h-[60svh] md:min-h-0 md:py-8 items-center">
        {/* ── 1. Judul: diperbesar dan menurun ke bawah mengikuti panjang banner ── */}
        <div className="hero-title self-center">
          <h1
            className="font-display font-bold text-[--text] tracking-tight leading-[1.08] sm:leading-[1.04] md:leading-[0.98] hero-in wait-intro"
            style={{
              fontSize: "clamp(1.65rem, 6.2vw, 5.25rem)",
              "--i": "0",
            } as React.CSSProperties}
          >
            Desain grafis dan video editing untuk tampilan yang lebih rapi.
          </h1>
        </div>

        {/* ── 2. Banner: diperbesar, 100% utuh tanpa terpotong ── */}
        <div className="hero-banner w-full flex justify-end md:justify-center items-center">
          <div className="w-full max-w-[195px] sm:max-w-[240px] md:max-w-[420px] lg:max-w-[480px]">
            <HeroBanner />
          </div>
        </div>

        {/* ── 3. Deskripsi: di HP di bawah judul & banner, desktop di kolom kiri baris 2 ── */}
        <div className="hero-desc">
          <p
            className="text-[--text-2] leading-relaxed max-w-prose hero-in wait-intro text-sm sm:text-base md:text-lg"
            style={{
              "--i": "1",
            } as React.CSSProperties}
          >
            KRENOVA STUDIO mengerjakan flyer, logo, undangan, sampai video YouTube
            dan vlog. Kirim brief lewat WhatsApp, kami bantu dari ide sampai file akhir.
          </p>
        </div>

        {/* ── 4. Tombol: di HP di bawah deskripsi, desktop di kolom kiri baris 3 ── */}
        <div className="hero-cta">
          <div
            className="flex flex-wrap gap-3 hero-in wait-intro pt-1 md:pt-2"
            style={{ "--i": "2" } as React.CSSProperties}
          >
            <Button asChild href={waHref} target="_blank" rel="noopener noreferrer" size="lg" variant="primary" className="border border-white/20 shadow-md">
              <span className="flex items-center gap-2">
                <WhatsAppIcon className="w-5 h-5 shrink-0" />
                Chat via WhatsApp
              </span>
            </Button>
            <Button asChild href="/projects" size="lg" variant="glass">
              Lihat karya
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
