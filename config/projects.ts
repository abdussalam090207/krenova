import type { MediaSpec } from "./services";

export interface Project {
  id: string;
  title: string;
  category: "design" | "video";
  serviceId: string;       // merujuk Service.id
  media: MediaSpec;
  featured?: boolean;      // tampil di Home
}

export const projects: Project[] = [
  {
    id: "d1", title: "Contoh video YouTube", category: "video", serviceId: "youtube", featured: true,
    media: { kind: "video-youtube", aspect: "16/9", alt: "Contoh video YouTube" },
  },
  {
    id: "d2", title: "Contoh flyer promo", category: "design", serviceId: "social-flyer", featured: true,
    media: { kind: "flyer", aspect: "4/5", alt: "Contoh flyer promo" },
  },
  {
    id: "d3", title: "Contoh logo", category: "design", serviceId: "logo", featured: true,
    media: { kind: "logo", aspect: "1/1", alt: "Contoh logo" },
  },
  {
    id: "d4", title: "Contoh video pendek", category: "video", serviceId: "social-video", featured: true,
    media: { kind: "video-social", aspect: "9/16", alt: "Contoh video pendek vertikal" },
  },
  {
    id: "d5", title: "Contoh sertifikat", category: "design", serviceId: "certificate", featured: true,
    media: { kind: "certificate", aspect: "7/5", alt: "Contoh sertifikat" },
  },
  {
    id: "d6", title: "Contoh undangan", category: "design", serviceId: "invitation", featured: true,
    media: { kind: "invitation", aspect: "3/4", alt: "Contoh undangan" },
  },
];
