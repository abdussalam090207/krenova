"use client";
// app/katalog/pesanan/page.tsx — Lupa link akses
import { useState, useRef, useEffect } from "react";
import { catalogConfig } from "@/config/catalog";

export default function LupaLinkPage() {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const tRef = useRef<number>(0);

  useEffect(() => {
    tRef.current = Date.now();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/katalog/resend-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), website: "", t: tRef.current }),
      });
    } catch {
      // noop
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  const waUrl = `https://wa.me/${catalogConfig.supportWhatsapp}?text=${encodeURIComponent("Halo KRENOVA STUDIO, saya tidak menerima link akses pesanan saya.")}`;

  return (
    <main className="min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-display font-bold text-text mb-2">Lupa link akses?</h1>
        <p className="text-sm text-text-3 mb-8 leading-relaxed">
          Masukkan email yang kamu pakai saat membeli. Jika ada pesanan, kami kirim linknya.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl glass border border-aqua/20 text-sm text-text-2">
              Jika ada pesanan dengan email itu, kami kirim linknya.
            </div>
            <p className="text-xs text-text-3">
              Email tidak diterima?{" "}
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                Chat via WhatsApp
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot */}
            <input type="text" name="website" tabIndex={-1} aria-hidden="true"
              style={{ position: "absolute", left: "-9999px" }} autoComplete="off" defaultValue="" />

            <div>
              <label htmlFor="rl-email" className="block text-sm font-medium text-text-2 mb-1.5">Email</label>
              <input
                id="rl-email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                maxLength={254} autoComplete="email" placeholder="email@kamu.com"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/6 border border-white/12
                  text-text placeholder:text-text-3 focus:outline-none focus:border-blue/50 focus:bg-white/8 transition-all"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-blue hover:bg-blue/90
                disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white cursor-pointer">
              {loading ? "Mengirim…" : "Kirim link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
