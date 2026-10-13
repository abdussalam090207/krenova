"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Media } from "@/components/ui/Media";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { services, designServices, videoServices, type Service } from "@/config/services";
import { siteConfig, waLink } from "@/config/site";

type Tab = "design" | "video";

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: "design", label: "Desain Grafis",  count: designServices.length },
  { id: "video",  label: "Video Editing",  count: videoServices.length  },
];

export function ServicesExplorer() {
  const [activeTab, setActiveTab]         = useState<Tab>("design");
  const [activeServiceId, setActiveServiceId] = useState<string>(designServices[0].id);
  const [openAccordion, setOpenAccordion]     = useState<string | null>(null);
  const tabPanelId = useId();

  const currentGroup = activeTab === "design" ? designServices : videoServices;
  const activeService: Service = services.find((s) => s.id === activeServiceId) ?? currentGroup[0];

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    const first = tab === "design" ? designServices[0] : videoServices[0];
    setActiveServiceId(first.id);
    setOpenAccordion(null);
  }

  function selectService(id: string) {
    setActiveServiceId(id);
    setOpenAccordion(null);
  }

  function toggleAccordion(id: string) {
    setOpenAccordion((prev) => (prev === id ? null : id));
  }


  return (
    <section
      id="layanan"
      className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28"
      aria-labelledby="layanan-heading"
    >
      <SectionHeading
        id="layanan-heading"
        title="Apa yang bisa dikerjakan"
        description="Dua bidang kerja. Pilih layanan untuk melihat penjelasan dan contoh tampilannya."
        className="mb-8"
      />

      <GlassCard className="rounded-[32px] p-4 md:p-8" strong sheen>

        {/* ── Tab kontrol ─────────────────────────── */}
        <div
          role="tablist"
          aria-label="Bidang layanan"
          className="relative flex gap-1 p-1 rounded-full glass mb-6 w-full sm:w-fit"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`${tabPanelId}-${tab.id}`}
              onClick={() => switchTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") switchTab(tab.id === "design" ? "video" : "design");
                if (e.key === "ArrowLeft")  switchTab(tab.id === "design" ? "video" : "design");
              }}
              className={[
                "relative z-10 flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-medium transition-colors duration-150 whitespace-nowrap",
                activeTab === tab.id ? "text-[--text]" : "text-[--text-2] hover:text-[--text]",
              ].join(" ")}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full glass glass-strong"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">
                {tab.label}{" "}
                <span className="text-[--text-3] font-normal">({tab.count})</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Panel konten ────────────────────────── */}
        {TABS.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${tabPanelId}-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
          >
            {/* Desktop: 2 kolom */}
            <div className="hidden md:grid md:grid-cols-2 gap-6">
              {/* Kiri: daftar layanan */}
              <div className="flex flex-col gap-1">
                {currentGroup.map((svc) => {
                  const isActive = svc.id === activeServiceId;
                  return (
                    <button
                      key={svc.id}
                      aria-pressed={isActive}
                      onClick={() => selectService(svc.id)}
                      className={[
                        "group w-full text-left px-4 py-3 rounded-2xl transition-all duration-150",
                        "flex flex-col gap-0.5 relative overflow-hidden",
                        isActive
                          ? "bg-black/6 dark:bg-white/10"
                          : "hover:bg-black/4 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      {/* Garis aktif aqua di kiri */}
                      {isActive && (
                        <motion.span
                          layoutId="service-indicator"
                          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[--aqua]"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <span
                        className="font-display font-semibold text-[--text] leading-snug"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {svc.name}
                      </span>
                      <span
                        className="text-[--text-2] leading-relaxed line-clamp-2"
                        style={{ fontSize: "0.875rem" }}
                      >
                        {svc.desc}
                      </span>
                    </button>
                  );
                })}

                {/* Baris penutup: dan lainnya */}
                <div className="px-4 py-3 text-sm text-[--text-3]">
                  <span className="font-medium text-[--text-2]">dan lainnya</span>
                  {", Butuh yang tidak ada di daftar? "}
                  <a
                    href={waLink(siteConfig.contacts[0].wa)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[--aqua] hover:underline"
                  >
                    Ceritakan lewat WhatsApp.
                  </a>
                </div>
              </div>

              {/* Kanan: panggung preview */}
              <div className="flex flex-col gap-4">
                <div className="sticky top-28">
                  {/* Panel preview ukuran tetap aspect-[4/3] — isi di-contain */}
                  <div
                    className="w-full rounded-2xl glass overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: "4/3" }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeService.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full flex items-center justify-center p-4"
                      >
                        <div
                          className="max-w-full max-h-full"
                          style={{
                            aspectRatio: activeService.media.aspect,
                            width: parseAspectRatio(activeService.media.aspect) > 1 ? "100%" : "auto",
                            height: parseAspectRatio(activeService.media.aspect) <= 1 ? "100%" : "auto",
                          }}
                        >
                          <Media spec={activeService.media} contain className="w-full h-full" />
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>


                </div>
              </div>
            </div>

            {/* HP: accordion */}
            <div className="flex flex-col gap-1 md:hidden">
              {currentGroup.map((svc) => {
                const isOpen = openAccordion === svc.id;
                const panelId = `accordion-${svc.id}`;
                return (
                  <div key={svc.id} className={`rounded-2xl overflow-hidden transition-colors ${isOpen ? "bg-black/5 dark:bg-white/8" : ""}`}>
                    <button
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleAccordion(svc.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-display font-semibold text-[--text] text-base leading-snug">
                          {svc.name}
                        </span>
                        {!isOpen && (
                          <span className="text-sm text-[--text-2] line-clamp-1">{svc.desc}</span>
                        )}
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="shrink-0 text-[--text-3]"
                      >
                        <ChevronDown size={18} strokeWidth={1.5} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          key="content"
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 flex flex-col gap-3">
                            <p className="text-sm text-[--text-2] leading-relaxed">{svc.desc}</p>
                            <div className="max-h-[380px] overflow-hidden flex items-center justify-center">
                              <Media spec={svc.media} contain className="w-full max-h-[360px]" />
                            </div>
                   
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Baris penutup: dan lainnya */}
              <div className="px-4 py-3 text-sm text-[--text-3]">
                <span className="font-medium text-[--text-2]">dan lainnya</span>
                {" — "}
                <a
                  href={waLink(siteConfig.contacts[0].wa)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[--aqua] hover:underline"
                >
                  Ceritakan lewat WhatsApp.
                </a>
              </div>
            </div>
          </div>
        ))}
      </GlassCard>
    </section>
  );
}

/** Hitung rasio numerik dari string "w/h" */
function parseAspectRatio(aspect: string): number {
  const [w, h] = aspect.split("/").map(Number);
  return (w ?? 1) / (h ?? 1);
}
