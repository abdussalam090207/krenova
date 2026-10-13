import type { MediaKind } from "@/config/services";

interface MediaPlaceholderProps {
  kind: MediaKind;
  aspect: string;
  alt: string;
}

export function MediaPlaceholder({ kind, aspect, alt }: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${alt} (dummy)`}
      className="relative w-full h-full overflow-hidden"
      style={{ aspectRatio: aspect }}
    >
      {/* Chip "Dummy" */}
      <span className="absolute top-2 left-2 z-10 glass rounded-full px-2 py-0.5 text-[11px] font-medium text-[--text-2] leading-none">
        Dummy
      </span>

      {/* Konten per jenis */}
      <PlaceholderInner kind={kind} />
    </div>
  );
}

function PlaceholderInner({ kind }: { kind: MediaKind }) {
  switch (kind) {
    /* ── Desain Grafis ─────────────────────────── */

    case "flyer":
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "linear-gradient(160deg,#4b94d6 0%,#7ab8e1 60%,#3a7bbf 100%)" }}>
          <div className="flex-1 flex flex-col justify-center px-5 gap-3">
            <div className="h-8 w-4/5 rounded bg-white/30" />
            <div className="h-3 w-3/4 rounded bg-white/20" />
            <div className="h-3 w-1/2 rounded bg-white/20" />
          </div>
          <div className="px-5 pb-5">
            <div className="h-8 w-28 rounded-full bg-white/25 border border-white/30" />
          </div>
        </div>
      );

    case "banner":
      return (
        <div className="w-full h-full flex items-center" style={{ background: "linear-gradient(90deg,#06060B 0%,#0E1020 40%,#7ab8e1 100%)" }}>
          <div className="flex-1 px-5 space-y-2">
            <div className="h-5 w-3/4 rounded bg-white/30" />
            <div className="h-3 w-1/2 rounded bg-white/20" />
          </div>
          <div className="w-2/5 h-4/5 mr-4 rounded-full opacity-40" style={{ background: "radial-gradient(circle,#7ab8e1,transparent)" }} />
        </div>
      );

    case "certificate":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#06060B] border-2 border-[--glass-border]" style={{ boxShadow: "inset 0 0 0 6px rgba(122,184,225,.08)" }}>
          <div className="h-3 w-1/3 rounded bg-[--text-3]" />
          <div className="h-6 w-3/5 rounded bg-[--text-2]" />
          <div className="h-px w-3/4 bg-[--glass-border]" />
          <div className="h-2 w-2/5 rounded bg-[--text-3]" />
          <div className="flex gap-8 mt-2">
            <div className="h-px w-16 bg-[--text-3]" />
            <div className="h-px w-16 bg-[--text-3]" />
          </div>
        </div>
      );

    case "id-card":
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "linear-gradient(180deg,#0E1020 70%,#4b94d6 100%)" }}>
          <div className="flex justify-center pt-5">
            <div className="w-14 h-14 rounded-xl bg-white/15 border border-white/20" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
            <div className="h-3 w-3/5 rounded bg-white/30" />
            <div className="h-2 w-2/5 rounded bg-white/20" />
          </div>
          <div className="h-7 w-full" style={{ background: "rgba(75,148,214,.5)" }} />
        </div>
      );

    case "brochure":
      return (
        <div className="w-full h-full flex gap-[1px] bg-[--glass-border]" style={{ background: "#0E1020" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 flex flex-col gap-2 p-2" style={{ background: i === 1 ? "rgba(75,148,214,.12)" : "rgba(255,255,255,.03)" }}>
              <div className="h-2/5 rounded" style={{ background: `rgba(122,184,225,${0.15 + i * 0.05})` }} />
              <div className="h-2 w-4/5 rounded bg-white/20" />
              <div className="h-2 w-3/5 rounded bg-white/15" />
              <div className="h-2 w-2/3 rounded bg-white/15" />
            </div>
          ))}
        </div>
      );

    case "invitation":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: "linear-gradient(160deg,#0E1020 0%,#4b94d6 60%,#7ab8e1 100%)" }}>
          {/* Ornamen atas */}
          <div className="flex gap-1 opacity-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-px h-4 bg-white/60" style={{ transform: `rotate(${(i - 2) * 8}deg)` }} />
            ))}
          </div>
          <div className="h-3 w-2/5 rounded bg-white/30" />
          <div className="h-5 w-3/5 rounded bg-white/40" />
          <div className="h-3 w-2/5 rounded bg-white/25" />
          {/* Ornamen bawah */}
          <div className="flex gap-1 opacity-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-px h-4 bg-white/60" style={{ transform: `rotate(${(i - 2) * -8}deg)` }} />
            ))}
          </div>
        </div>
      );

    case "logo":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#06060B]">
          {/* Bentuk geometris sederhana */}
          <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
            <polygon points="32,4 60,52 4,52" fill="none" stroke="rgba(122,184,225,0.6)" strokeWidth="2.5" />
            <circle cx="32" cy="34" r="10" fill="none" stroke="rgba(75,148,214,0.5)" strokeWidth="2" />
          </svg>
          <div className="h-2 w-2/5 rounded bg-[--text-2]" />
        </div>
      );

    /* ── Video Editing ──────────────────────────── */

    case "video-social":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ background: "linear-gradient(180deg,#0E1020 0%,#4b94d6 100%)" }}>
          {/* Play button */}
          <div className="glass rounded-full w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="rgba(255,255,255,.9)" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          {/* Caption bar */}
          <div className="absolute bottom-4 left-3 right-3 space-y-1">
            <div className="h-2 w-4/5 rounded bg-white/30" />
            <div className="h-2 w-3/5 rounded bg-white/20" />
          </div>
          {/* Ikon aksi sisi kanan */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-60">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-white/25" />
            ))}
          </div>
        </div>
      );

    case "video-youtube":
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "#06060B" }}>
          <div className="flex-1 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0E1020 0%,#4b94d6 100%)" }}>
            <div className="glass rounded-full w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="rgba(255,255,255,.9)" aria-hidden="true">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
          {/* Timeline */}
          <div className="px-3 py-2 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[10px] text-[--text-3]">00:00</span>
              <span className="text-[10px] text-[--text-3]">04:32</span>
            </div>
            <div className="relative h-1 rounded-full bg-white/15">
              <div className="absolute left-0 top-0 h-full w-1/3 rounded-full" style={{ background: "#4b94d6" }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white" style={{ left: "calc(33% - 5px)" }} />
            </div>
          </div>
        </div>
      );

    case "vlog":
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "#06060B" }}>
          <div className="flex-1 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0e20 0%,#7ab8e1 100%)" }}>
            <div className="glass rounded-full w-11 h-11 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,.9)" aria-hidden="true">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-2 space-y-1.5">
            <div className="relative h-1 rounded-full bg-white/15">
              <div className="absolute left-0 top-0 h-full w-1/2 rounded-full" style={{ background: "#7ab8e1" }} />
            </div>
          </div>
        </div>
      );

    case "trim":
      return (
        <div className="w-full h-full flex flex-col justify-center px-4 gap-3 bg-[#06060B]">
          <div className="h-2 w-1/4 rounded bg-[--text-3]" />
          {/* Timeline dengan segmen dipotong */}
          <div className="relative h-8 rounded-lg bg-white/8 overflow-hidden flex">
            <div className="h-full w-1/3 rounded-l-lg" style={{ background: "rgba(75,148,214,.4)" }} />
            <div className="h-full w-1/5 border-x-2 border-dashed border-red-400/60 bg-red-400/10 flex items-center justify-center">
              <span className="text-[8px] text-red-300/80">potong</span>
            </div>
            <div className="h-full flex-1 rounded-r-lg" style={{ background: "rgba(122,184,225,.3)" }} />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-[--text-3]">00:00</span>
            <span className="text-[10px] text-[--text-3]">02:18</span>
          </div>
        </div>
      );

    case "captions":
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "linear-gradient(180deg,#06060B 60%,#0E1020 100%)" }}>
          <div className="flex-1 flex items-center justify-center">
            <div className="glass rounded-full w-10 h-10 flex items-center justify-center opacity-60">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="rgba(255,255,255,.7)" aria-hidden="true">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
          {/* Caption bars + CC icon */}
          <div className="px-3 pb-4 space-y-1.5">
            <div className="flex items-center gap-2 glass rounded-lg px-2 py-1.5">
              <span className="text-[10px] font-bold text-[--aqua]">CC</span>
              <div className="flex-1 space-y-1">
                <div className="h-2 w-full rounded bg-white/25" />
                <div className="h-2 w-3/4 rounded bg-white/18" />
              </div>
            </div>
          </div>
        </div>
      );

    case "slideshow":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#06060B] overflow-hidden">
          {/* Tiga bingkai foto bertumpuk */}
          <div className="relative w-3/4 h-3/5">
            {[{ rot: "-6deg", z: 0, top: "8px", left: "0" }, { rot: "3deg", z: 1, top: "0", left: "8px" }, { rot: "0deg", z: 2, top: "-4px", left: "16px" }].map((s, i) => (
              <div
                key={i}
                className="absolute w-4/5 h-4/5 rounded-lg border border-white/20"
                style={{
                  transform: `rotate(${s.rot})`,
                  zIndex: s.z,
                  top: s.top,
                  left: s.left,
                  background: `rgba(${i === 2 ? "75,148,214" : "122,184,225"},.${15 + i * 5})`,
                }}
              />
            ))}
          </div>
          {/* Bar musik */}
          <div className="absolute bottom-3 left-3 right-3 glass rounded-lg px-2 py-1.5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[--aqua] opacity-60" />
            <div className="flex-1 h-1 rounded bg-white/20">
              <div className="h-full w-2/5 rounded" style={{ background: "#7ab8e1" }} />
            </div>
          </div>
        </div>
      );

    case "audio":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#06060B] px-4">
          {/* Waveform */}
          <div className="flex items-end gap-[3px] h-12">
            {[4, 8, 12, 18, 24, 28, 22, 16, 30, 20, 14, 26, 18, 10, 8, 22, 28, 24, 16, 12].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-sm"
                style={{
                  height: `${h}px`,
                  background: i < 10 ? "#4b94d6" : "rgba(122,184,225,.4)",
                }}
              />
            ))}
          </div>
          {/* Ikon speaker */}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(122,184,225,.6)" strokeWidth="1.5" aria-hidden="true">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-[--bg-ink]">
          <span className="text-xs text-[--text-3]">Media</span>
        </div>
      );
  }
}
