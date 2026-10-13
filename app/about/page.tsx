import type { Metadata } from "next";
import { ContactDetails } from "@/components/about/ContactDetails";
import { MapEmbed } from "@/components/about/MapEmbed";
import { FeedbackForm } from "@/components/about/FeedbackForm";

export const metadata: Metadata = {
  title: "About",
  description:
    "Kontak dan lokasi KRENOVA STUDIO, studio jasa desain grafis dan video editing, serta form feedback.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 md:px-8 pt-28 md:pt-36 pb-20 md:pb-28">
      {/* ── Pengantar Halaman ─────────────────────────────────── */}
      <div className="mb-12 md:mb-16 space-y-4">
        <h1
          className="font-display font-bold text-[--text] tracking-tight leading-none"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          About
        </h1>
        <p className="text-[--text-2] text-base md:text-lg max-w-prose leading-relaxed">
          KRENOVA STUDIO (Kreatif Inovatif Studio) adalah studio jasa desain grafis dan video
          editing. Hubungi kami lewat WhatsApp, atau tulis pertanyaan dan masukanmu lewat form.
        </p>
      </div>

      {/* ── Grid Dua Kolom (Desktop) / Tumpukan (Mobile) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-start">
        {/* Kolom Kiri: Kontak & Peta */}
        <div className="space-y-8">
          <ContactDetails />
          <MapEmbed />
        </div>

        {/* Kolom Kanan: Form Feedback */}
        <div>
          <FeedbackForm />
        </div>
      </div>
    </main>
  );
}
