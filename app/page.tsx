import { Hero } from "@/components/home/Hero";
import { ServicesExplorer } from "@/components/home/ServicesExplorer";
import { AudienceList } from "@/components/home/AudienceList";
import { FeaturedWork } from "@/components/home/FeaturedWork";
import { ProcessTimeline } from "@/components/home/ProcessTimeline";
import { AdModal } from "@/components/home/AdModal";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesExplorer />
      <AudienceList />
      <FeaturedWork />
      <ProcessTimeline />
      <AdModal />
    </>
  );
}
