import { SectionHeading } from "@/components/ui/SectionHeading";
import { audience } from "@/config/audience";

/**
 * AudienceList — Section 3: "Biasanya dipakai untuk"
 * Tata letak sengaja tanpa kartu dan ikon — tenang setelah section ServicesExplorer.
 * Desktop: 2 kolom, judul sticky kiri, baris di kanan.
 * HP: judul di atas, baris di bawah.
 */
export function AudienceList() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28"
      aria-labelledby="audience-heading"
    >
      <div className="md:grid md:grid-cols-[35%_1fr] md:gap-12">

        {/* Kiri: judul sticky */}
        <div className="mb-8 md:mb-0">
          <div className="md:sticky md:top-28">
            <SectionHeading
              id="audience-heading"
              title="Biasanya dipakai untuk"
            />
          </div>
        </div>

        {/* Kanan: daftar baris */}
        <div>
          {audience.map((item, i) => (
            <div
              key={i}
              className={`py-6 ${i !== 0 ? "border-t border-[--glass-border]" : ""}`}
            >
              <p
                className="font-display font-semibold text-[--text] leading-tight mb-1.5"
                style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}
              >
                {item.who}
              </p>
              <p className="text-[--text-2] leading-relaxed text-base">
                {item.uses}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
