"use client";
// components/katalog/CatalogFilters.tsx — Filter bar Liquid Glass dengan URL sync
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition, useState, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Check,
  ArrowUpDown,
  X,
} from "lucide-react";

interface Props {
  categories: string[];
  allFormats: string[];
  totalItems: number;
}

const URUT_OPTIONS = [
  { value: "terbaru",        label: "Terbaru",         desc: "Produk rilisan paling baru" },
  { value: "terlaris",       label: "Terlaris",        desc: "Paling banyak dipesan" },
  { value: "harga-terendah", label: "Harga Terendah",  desc: "Mulai dari harga termurah" },
  { value: "harga-tertinggi",label: "Harga Tertinggi", desc: "Produk premium teratas" },
];

const MODE_OPTIONS = [
  { value: "",          label: "Semua",         },
  { value: "paid",      label: "Berbayar",      },
  { value: "free",      label: "Gratis",        },
  { value: "whatsapp",  label: "Via WhatsApp",  },
];

export function CatalogFilters({ categories, allFormats, totalItems }: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();
  const [, startTransition] = useTransition();

  const [sortOpen, setSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown saat klik di luar atau tekan Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSortOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const update = useCallback(
    (key: string, value: string) => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(key, value); else sp.delete(key);
      sp.delete("page"); // reset ke halaman 1
      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const reset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const currentUrut = params.get("urut") ?? "terbaru";
  const currentUrutLabel =
    URUT_OPTIONS.find((o) => o.value === currentUrut)?.label ?? "Terbaru";

  const hasFilters =
    params.has("q") ||
    params.has("kategori") ||
    params.has("mode") ||
    params.has("format") ||
    params.has("urut");

  return (
    <div className="space-y-4 mb-10">
      {/* ── Baris 1: Pencarian & Dropdown Timeline (Liquid Glass) ── */}
      <div className="flex flex-row sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Input Search Liquid Glass */}
        <div className="relative flex-1 group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-white transition-colors pointer-events-none"
            size={16}
          />
          <input
            type="search"
            placeholder="Cari produk, template, tag…"
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const target = e.target as HTMLInputElement & { _t?: ReturnType<typeof setTimeout> };
              clearTimeout(target._t);
              target._t = setTimeout(() => update("q", v), 300);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.12] text-sm text-text placeholder:text-text-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_4px_20px_rgba(0,0,0,0.25)] focus:outline-none focus:border-white/35 focus:from-white/[0.10] focus:shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_0_24px_rgba(255,255,255,0.08)] transition-all duration-300"
          />
        </div>

        {/* Custom Liquid Glass Dropdown: Urutan / Timeline */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setSortOpen((prev) => !prev)}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            className="w-full sm:w-auto inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-b from-white/[0.10] via-white/[0.05] to-white/[0.02] backdrop-blur-2xl border border-white/[0.15] text-sm font-medium text-text shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:border-white/30 hover:from-white/[0.14] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ArrowUpDown size={15} className="text-text-3" />
              <span className="text-text-3 text-xs">Urut:</span>
              <span className="text-white font-semibold">{currentUrutLabel}</span>
            </div>
            <ChevronDown
              size={15}
              className={`text-text-3 transition-transform duration-300 ${
                sortOpen ? "rotate-180 text-white" : ""
              }`}
            />
          </button>

          {/* Menu Dropdown Panel (Liquid Glass) */}
          {sortOpen && (
            <div
              role="listbox"
              className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 min-w-[230px] p-1.5 rounded-2xl bg-[#090b14]/90 backdrop-blur-2xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.25)] z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">
                Urutkan Berdasarkan
              </div>
              {URUT_OPTIONS.map((o) => {
                const isSelected = currentUrut === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      update("urut", o.value);
                      setSortOpen(false);
                    }}
                    className={`flex items-start justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-white/[0.16] to-white/[0.08] text-white border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
                        : "text-text-2 hover:text-white hover:bg-white/[0.07] border border-transparent"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-[11px] text-text-3">{o.desc}</div>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-white mt-0.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Baris 2: Mode Pembelian Liquid Glass (Semua, Berbayar, Gratis, Via WhatsApp) ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Segmented Control Liquid Glass Capsule */}
        <div className="inline-flex gap-3 p-1 overflow-x-auto max-w-full">
          {MODE_OPTIONS.map((m) => {
            const active = (params.get("mode") ?? "") === m.value;

            return (
              <button
                key={m.value}
                type="button"
                onClick={() => update("mode", m.value)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  active
                    ? "font-semibold text-white bg-gradient-to-b from-white/[0.22] via-white/[0.12] to-white/[0.05] backdrop-blur-md border border-white/30 ,inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.25)]"
                    : "font-medium text-text-3 hover:text-text hover:bg-white/[0.06] border border-transparent"
                }`}
              >
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Info Total & Reset Button */}
        <div className="flex items-center gap-3 text-xs text-text-3 ml-auto sm:ml-0">
          <span>{totalItems > 0 ? `${totalItems} produk tersedia` : ""}</span>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs text-text-2 hover:text-white bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 transition-all cursor-pointer"
            >
              <X size={12} />
              <span>Reset filter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
