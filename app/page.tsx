import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";

// [PERF] Komponen di bawah fold — lazy load untuk kurangi initial bundle
// ServicesExplorer menggunakan motion/react (framer) yang cukup berat
const ServicesExplorer = dynamic(
  () => import("@/components/home/ServicesExplorer").then((m) => ({ default: m.ServicesExplorer })),
  { ssr: true }
);

// AudienceList dan seterusnya — server component, lazy chunk
const AudienceList = dynamic(
  () => import("@/components/home/AudienceList").then((m) => ({ default: m.AudienceList })),
  { ssr: true }
);

const FeaturedWork = dynamic(
  () => import("@/components/home/FeaturedWork").then((m) => ({ default: m.FeaturedWork })),
  { ssr: true }
);

const ProcessTimeline = dynamic(
  () => import("@/components/home/ProcessTimeline").then((m) => ({ default: m.ProcessTimeline })),
  { ssr: true }
);

export default function HomePage() {
  return (
    <>
      {/* Hero di-render langsung (above fold, LCP element) */}
      <Hero />
      {/* Komponen di bawah fold: lazy chunk, tetap SSR untuk SEO */}
      <ServicesExplorer />
      <AudienceList />
      <FeaturedWork />
      <ProcessTimeline />
    </>
  );
}
