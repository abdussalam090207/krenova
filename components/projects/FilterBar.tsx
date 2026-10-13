"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, Search } from "lucide-react";
import { services } from "@/config/services";
import type { ProjectCategory } from "@/lib/projects/types";

interface FilterBarProps {
  onFilterChange: (params: {
    category?: ProjectCategory;
    serviceId?: string;
    q?: string;
    sort: "new" | "popular";
  }) => void;
}

const CATEGORIES = [
  { value: "" as const, label: "Semua" },
  { value: "design" as const, label: "Desain Grafis" },
  { value: "video" as const, label: "Video Editing" },
];

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<"" | ProjectCategory>(
    (searchParams.get("type") as ProjectCategory) ?? ""
  );
  const [serviceId, setServiceId] = useState(searchParams.get("service") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<"new" | "popular">(
    (searchParams.get("sort") as "new" | "popular") ?? "new"
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredServices = category
    ? services.filter((s) => s.group === category)
    : [];

  const hasFilter = category !== "" || serviceId !== "" || q !== "" || sort !== "new";

  const updateURL = useCallback(
    (
      newCat: "" | ProjectCategory,
      newSvc: string,
      newQ: string,
      newSort: "new" | "popular"
    ) => {
      const params = new URLSearchParams();
      if (newCat) params.set("type", newCat);
      if (newSvc) params.set("service", newSvc);
      if (newQ) params.set("q", newQ);
      if (newSort !== "new") params.set("sort", newSort);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
      onFilterChange({
        category: newCat || undefined,
        serviceId: newSvc || undefined,
        q: newQ || undefined,
        sort: newSort,
      });
    },
    [router, onFilterChange]
  );

  const handleCategory = (val: "" | ProjectCategory) => {
    setCategory(val);
    setServiceId("");
    updateURL(val, "", q, sort);
  };

  const handleService = (id: string) => {
    const next = id === serviceId ? "" : id;
    setServiceId(next);
    updateURL(category, next, q, sort);
  };

  const handleQ = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateURL(category, serviceId, val, sort);
    }, 300);
  };

  const handleSort = (val: "new" | "popular") => {
    setSort(val);
    updateURL(category, serviceId, q, val);
  };

  const handleReset = () => {
    setCategory("");
    setServiceId("");
    setQ("");
    setSort("new");
    router.replace("?", { scroll: false });
    onFilterChange({ sort: "new" });
  };

  // Sync dari URL on mount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 mb-8">
      {/* Baris 1: Kategori + Sort */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Segmented control kategori */}
        <div className="flex items-center glass rounded-xl p-1 gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleCategory(c.value)}
              className={[
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px]",
                category === c.value
                  ? "bg-[--blue] text-white shadow-sm"
                  : "text-[--text-2] hover:text-[--text]",
              ].join(" ")}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Urutan + Reset */}
        <div className="flex items-center gap-2">
          <div className="relative glass rounded-xl">
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value as "new" | "popular")}
              aria-label="Urutan"
              className="appearance-none bg-transparent text-sm text-[--text-2] px-4 pr-8 py-2 min-h-[44px] cursor-pointer focus:outline-none"
            >
              <option value="new" className="bg-[--bg] text-[--text]">Terbaru</option>
              <option value="popular" className="bg-[--bg] text-[--text]">Terpopuler</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[--text-3]" />
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 min-h-[44px] rounded-xl text-sm text-[--text-3] hover:text-[--text] transition-colors"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Chip layanan (hanya saat kategori dipilih) */}
      {filteredServices.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
          {filteredServices.map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => handleService(svc.id)}
              className={[
                "flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 min-h-[36px] whitespace-nowrap",
                serviceId === svc.id
                  ? "border-[--blue] bg-[--blue]/20 text-[--text]"
                  : "border-[--glass-border] text-[--text-2] hover:border-[--text-3] hover:text-[--text]",
              ].join(" ")}
            >
              {svc.name}
            </button>
          ))}
        </div>
      )}

      {/* Pencarian */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-2] pointer-events-none shrink-0"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Cari Projek..."
          aria-label="Cari Projek"
          className="w-full glass rounded-xl pl-11 pr-10 py-3 text-sm text-[--text] placeholder:text-[--text-3] bg-transparent focus:outline-none focus:border-[--blue]/50 transition-colors"
        />
        {q && (
          <button
            type="button"
            onClick={() => handleQ("")}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-3] hover:text-[--text] p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
