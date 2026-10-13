/**
 * Logo / Wordmark
 * KRENOVA (Bricolage 800) + STUDIO (Bricolage 400), satu baris.
 * Menggunakan variabel warna agar selalu kontras di dark & light mode.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display select-none inline-flex items-baseline ${className}`}
      style={{ fontSize: "inherit" }}
    >
      <span className="font-extrabold text-[--text] tracking-tight">KRENOVA</span>
      <span className="font-normal tracking-tight ml-[0.35em] text-[--text-2]">
        STUDIO
      </span>
    </span>
  );
}
