"use client";
// components/katalog/CheckoutDialog.tsx — Dialog beli / dapatkan gratis
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog/types";
import { catalogConfig } from "@/config/catalog";

interface Props {
  product: CatalogProduct;
  open: boolean;
  onClose: () => void;
}

type FieldErrors = { name?: string; email?: string; acceptTerms?: string; _global?: string };

export function CheckoutDialog({ product, open, onClose }: Props) {
  const router = useRouter();
  const firstRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false); // Guard: cegah double-submit meski klik cepat atau concurrent
  const [tOpen] = useState(() => Date.now());

  // Kunci scroll body dan tangani Escape saat modal terbuka
  useEffect(() => {
    if (!open) return;

    // Reset status guard saat modal dibuka
    submittedRef.current = false;
    setSubmitting(false);
    setErrors({});

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submittedRef.current) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => firstRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [open, onClose]);

  // Jika tidak dibuka, jangan render elemen apapun ke DOM
  if (!open) {
    return null;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard pertama: cegah double-submit dari state React
    if (submitting) return;
    // Guard kedua: cegah double-submit dari Ref (sebelum React re-render)
    if (submittedRef.current) return;

    const errs: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 80)
      errs.name = "Nama harus 2–80 karakter.";
    if (!trimmedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail) || trimmedEmail.length > 254)
      errs.email = "Alamat email tidak valid.";
    if (!accepted)
      errs.acceptTerms = "Kamu harus menyetujui syarat.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Kunci segera — sebelum await apapun
    submittedRef.current = true;
    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/katalog/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          name: trimmedName,
          email: trimmedEmail.toLowerCase(),
          acceptTerms: accepted,
          paymentMethod: "qris",
          website: "",  // honeypot kosong
          t: tOpen,
        }),
      });

      const data = await res.json();

      if (res.ok && data.redirectTo) {
        // Redirect sukses: biarkan tombol tetap disabled hingga halaman berganti
        router.push(data.redirectTo);
        return;
      }

      // Error: buka kunci agar user bisa coba lagi
      submittedRef.current = false;

      if (res.status === 429) {
        setErrors({ _global: "Terlalu banyak percobaan. Coba lagi nanti." });
      } else if (res.status === 502) {
        setErrors({ _global: "Pembayaran sedang tidak tersedia. Coba lagi sebentar, atau chat lewat WhatsApp." });
      } else if (data.fields) {
        setErrors(data.fields as FieldErrors);
      } else {
        setErrors({ _global: "Terjadi kesalahan. Coba lagi." });
      }
    } catch {
      submittedRef.current = false;
      setErrors({ _global: "Koneksi bermasalah. Coba lagi." });
    } finally {
      // Hanya reset submitting jika ref sudah dilepas (artinya ada error)
      if (!submittedRef.current) setSubmitting(false);
    }
  }, [submitting, name, email, accepted, product.slug, tOpen, router]);

  const isFree = product.purchase_mode === "free";
  const ctaText = isFree ? "Dapatkan sekarang" : "Lanjut ke pembayaran";
  const waUrl = `https://wa.me/${catalogConfig.supportWhatsapp}?text=${encodeURIComponent("Halo KRENOVA STUDIO, pembayaran sedang tidak tersedia, saya ingin membeli: " + product.title)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-white/[0.03] backdrop-blur-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient highlight */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue/20 rounded-full blur-3xl pointer-events-none -mr-8 -mt-8" />

        <div className="flex items-start justify-between mb-6 z-10">
          {/* Bungkus Title dan Harga jadi satu kolom di sebelah kiri */}
          <div className="space-y-2 pr-4">
            <h2 id="checkout-title" className="text-lg md:text-xl font-bold font-display text-text leading-snug">
              {isFree ? "Dapatkan " : "Beli "}{product.title}
            </h2>
            <div>
              <span className="inline-block text-xs md:text-sm font-semibold text-text glass rounded-xl px-2.5 py-1">
                {isFree ? "Gratis" : `Rp ${(product.price_idr ?? 0).toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>

          {/* Tombol Close di sebelah kanan */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer -mr-1 -mt-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 relative z-10">
          {/* Honeypot — disembunyikan dari bot */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
            autoComplete="off"
            defaultValue=""
          />

          {/* Nama */}
          <div>
            <label htmlFor="co-name" className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              id="co-name"
              ref={firstRef}
              type="text"
              required
              disabled={submitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              placeholder="Nama kamu"
              className={`w-full px-4 py-3 rounded-2xl text-sm bg-white/[0.06] border transition-all text-text
                placeholder:text-text-3 focus:outline-none focus:bg-white/[0.10] disabled:opacity-60 disabled:cursor-not-allowed ${errors.name ? "border-rose/60 focus:border-rose" : "border-white/15 focus:border-blue/60"
                }`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-rose">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="co-email" className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-1.5">
              Alamat Email
            </label>
            <input
              id="co-email"
              type="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              autoComplete="email"
              placeholder="email@kamu.com"
              className={`w-full px-4 py-3 rounded-2xl text-sm bg-white/[0.06] border transition-all text-text
                placeholder:text-text-3 focus:outline-none focus:bg-white/[0.10] disabled:opacity-60 disabled:cursor-not-allowed ${errors.email ? "border-rose/60 focus:border-rose" : "border-white/15 focus:border-blue/60"
                }`}
            />
            {errors.email && <p className="mt-1.5 text-xs text-rose">{errors.email}</p>}
            <p className="mt-1.5 text-[11px] text-text-2 leading-relaxed">
              Tautan unduh dan akses pesanan akan dikirimkan langsung ke email ini.
            </p>
          </div>

          {/* Syarat */}
          <div className="pt-1">
            <label className="flex items-start rounded-2xl gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="co-terms"
                disabled={submitting}
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-2xl accent-blue flex-shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-text-2 leading-relaxed">
                Saya menyetujui{" "}
                <a href="/katalog/syarat" target="_blank" rel="noopener noreferrer"
                  className="text-text underline hover:text-white transition-colors" tabIndex={0}>
                  Syarat & Ketentuan Lisensi
                </a>
              </span>
            </label>
            {errors.acceptTerms && <p className="mt-1.5 text-xs text-rose">{errors.acceptTerms}</p>}
          </div>

          {/* Error global */}
          {errors._global && (
            <div className="p-3.5 rounded-2xl bg-rose/15 border border-rose/30 text-xs text-rose">
              {errors._global}
              {errors._global.includes("WhatsApp") && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="block mt-2 underline text-white hover:text-aqua">
                  Chat via WhatsApp →
                </a>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              id="checkout-submit-btn"
              disabled={submitting}
              aria-busy={submitting}
              aria-label={submitting ? "Sedang memproses pesanan…" : ctaText}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-text glass-strong border border-white/20 transition-all duration-200
                ${ submitting
                  ? "opacity-60 cursor-not-allowed pointer-events-none select-none"
                  : "cursor-pointer hover:opacity-90 active:scale-[0.99]"
                }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses…
                </span>
              ) : ctaText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
