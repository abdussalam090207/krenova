import { SectionHeading } from "@/components/ui/SectionHeading";
import { process as steps } from "@/config/process";

/**
 * ProcessTimeline — Section 5: Cara pesan
 * Desktop: 5 kolom horizontal, garis melewati penanda angka (lingkaran kaca 40px).
 * HP: vertikal, garis di kiri, penanda di garis, teks di kanan.
 * Penomoran 1–5 dibenarkan karena ini memang urutan (HOME.md §8.1).
 */
export function ProcessTimeline() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28"
      aria-labelledby="proses-heading"
    >
      <SectionHeading
        id="proses-heading"
        title="Cara pesan"
        description="Dari brief sampai file jadi."
        className="mb-12"
      />

      {/* ── Desktop: horizontal ──────────────────── */}
      <div className="hidden md:block relative">
        {/* Garis penghubung */}
        <div
          className="absolute top-5 left-[calc(10%)] right-[calc(10%)] h-px"
          style={{ background: "rgba(255,255,255,.12)" }}
          aria-hidden="true"
        />

        <ol className="grid grid-cols-5 gap-4">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col items-center text-center gap-3">
              {/* Penanda angka */}
              <div
                className="relative z-10 w-10 h-10 rounded-full glass glass-strong flex items-center justify-center shrink-0"
              >
                <span className="font-display font-bold text-[--text] text-sm">{i + 1}</span>
              </div>

              {/* Teks */}
              <div>
                <p className="font-display font-semibold text-[--text] text-base leading-snug mb-1.5">
                  {step.title}
                </p>
                <p className="text-sm text-[--text-2] leading-relaxed">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── HP: vertikal ────────────────────────── */}
      <div className="md:hidden relative pl-8">
        {/* Garis vertikal di kiri */}
        <div
          className="absolute left-[19px] top-0 bottom-4 w-px"
          style={{ background: "rgba(255,255,255,.12)" }}
          aria-hidden="true"
        />

        <ol className="flex flex-col gap-8">
          {steps.map((step, i) => (
            <li key={i} className="relative flex gap-4 items-start">
              {/* Penanda angka — di atas garis */}
              <div
                className="absolute -left-8 w-9 h-9 rounded-full glass glass-strong flex items-center justify-center shrink-0 z-10"
              >
                <span className="font-display font-bold text-[--text] text-sm">{i + 1}</span>
              </div>

              {/* Teks */}
              <div className="pt-1">
                <p className="font-display font-semibold text-[--text] text-base leading-snug mb-1.5">
                  {step.title}
                </p>
                <p className="text-sm text-[--text-2] leading-relaxed">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
