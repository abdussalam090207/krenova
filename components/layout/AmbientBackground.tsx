"use client";

/**
 * AmbientBackground
 * Fixed, behind all content, pointer-events-none.
 * Blob bergerak sangat pelan (30–40s). Di HP, gerakan dimatikan.
 * Palet blob:
 * - Dark Mode: #7ab8e1 (biru muda) dan #4b94d6 (biru tua) pada base #06060B.
 * - Light Mode: #5C5C5C dan #434343 pada base putih (#FFFFFF).
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-500"
    >
      {/* Gradien radial statis sebagai base */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: "var(--ambient-base)",
        }}
      />

      {/* Blob 1 — kiri atas */}
      <div
        className="ambient-blob absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full motion-safe:animate-blob-1 transition-all duration-500"
        style={{
          background: "var(--blob-color-1)",
          opacity: "var(--blob-opacity-1)",
        }}
      />

      {/* Blob 2 — kanan tengah */}
      <div
        className="ambient-blob absolute top-1/2 -right-24 w-[500px] h-[500px] rounded-full motion-safe:animate-blob-2 transition-all duration-500"
        style={{
          background: "var(--blob-color-2)",
          opacity: "var(--blob-opacity-2)",
        }}
      />

      {/* Blob 3 — bawah tengah */}
      <div
        className="ambient-blob absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full motion-safe:animate-blob-3 transition-all duration-500"
        style={{
          background: "var(--blob-color-3)",
          opacity: "var(--blob-opacity-3)",
        }}
      />

      {/* Noise overlay tipis — menghilangkan banding di gradien */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      <style>{`
        @keyframes blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(60px, -40px) scale(1.08); }
          66%       { transform: translate(-30px, 50px) scale(0.95); }
        }
        @keyframes blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-50px, 60px) scale(1.05); }
          66%       { transform: translate(40px, -30px) scale(0.97); }
        }
        @keyframes blob-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, 40px) scale(0.96); }
          66%       { transform: translate(-60px, -20px) scale(1.06); }
        }
        .animate-blob-1 { animation: blob-1 38s ease-in-out infinite; }
        .animate-blob-2 { animation: blob-2 34s ease-in-out infinite; }
        .animate-blob-3 { animation: blob-3 42s ease-in-out infinite; }

        /* Matikan gerakan blob di HP */
        @media (max-width: 767px) {
          .ambient-blob { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
