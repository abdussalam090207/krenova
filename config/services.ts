export type ServiceGroup = "design" | "video";

export type MediaKind =
  | "flyer" | "banner" | "certificate" | "id-card" | "brochure" | "invitation" | "logo"
  | "video-social" | "video-youtube" | "vlog" | "trim" | "captions" | "slideshow" | "audio";

export interface MediaSpec {
  kind?: MediaKind;
  aspect: string;
  src?: string;
  alt: string;
}

export interface Service {
  id: string;
  group: ServiceGroup;
  name: string;
  desc: string;
  media: MediaSpec;
}

export const services: Service[] = [
  // ===== Desain Grafis =====
  {
    id: "social-flyer", group: "design", name: "Social Media Flyer Design",
    desc: "Flyer untuk promo, event, dan pengumuman di Instagram, WhatsApp Status, dan platform lain. Ukuran disesuaikan: feed atau story.",
    media: { kind: "flyer", aspect: "1061/1500", src: "/Desain Service/Social Media Flyer Design.webp", alt: "Contoh flyer media sosial" },
  },
  {
    id: "banner", group: "design", name: "Banner Design",
    desc: "Banner untuk toko, acara, header media sosial, atau website.",
    media: { kind: "banner", aspect: "16/9", src: "/Desain Service/Banner Design.webp", alt: "Contoh banner" },
  },
  {
    id: "certificate", group: "design", name: "Certificate Design",
    desc: "Sertifikat untuk kursus, lomba, seminar, dan organisasi. Siap dicetak atau dibagikan digital.",
    media: { kind: "certificate", aspect: "2048/1428", src: "/Desain Service/Certificate Design.webp", alt: "Contoh sertifikat" },
  },
  {
    id: "id-card", group: "design", name: "ID Card Design",
    desc: "Kartu identitas untuk panitia, anggota, karyawan, atau siswa, dengan tata letak yang mudah dibaca.",
    media: { kind: "id-card", aspect: "1137/1395", src: "/Desain Service/ID Card Design.webp", alt: "Contoh kartu identitas" },
  },
  {
    id: "brochure", group: "design", name: "Brochure Design",
    desc: "Brosur lembaran atau lipat untuk memperkenalkan produk, jasa, atau acara.",
    media: { kind: "brochure", aspect: "1500/1159", src: "/Desain Service/Brochure Design.webp", alt: "Contoh brosur" },
  },
  {
    id: "invitation", group: "design", name: "Invitation Design",
    desc: "Undangan digital atau cetak untuk acara pribadi, kantor, dan komunitas.",
    media: { kind: "invitation", aspect: "9/16", src: "/Desain Service/Invitation Design.webp", alt: "Contoh undangan" },
  },
  {
    id: "logo", group: "design", name: "Logo Design",
    desc: "Logo untuk usaha, komunitas, atau channel, dengan variasi pemakaian yang rapi.",
    media: { kind: "logo", aspect: "4/5", src: "/Desain Service/Logo Design.webp", alt: "Contoh logo" },
  },

  // ===== Video Editing =====
  {
    id: "social-video", group: "video", name: "Social Media Video Editing",
    desc: "Video pendek vertikal untuk Reels, TikTok, dan Shorts: potongan rapi, teks, dan ritme yang enak ditonton.",
    media: { kind: "video-social", aspect: "686/810", src: "/Video Service/Social Media Video Editing.webp", alt: "Contoh video vertikal" },
  },
  {
    id: "youtube", group: "video", name: "YouTube Video Editing",
    desc: "Editing video panjang untuk kanal YouTube: potong, susun alur, teks, dan audio.",
    media: { kind: "video-youtube", aspect: "16/9", src: "/Video Service/YouTube Video Editing.webp", alt: "Contoh video YouTube" },
  },
  {
    id: "vlog", group: "video", name: "Vlog Video Editing",
    desc: "Rekaman harian dirapikan jadi cerita yang enak diikuti.",
    media: { kind: "vlog", aspect: "16/9", src: "/Video Service/Vlog Video Editing.webp", alt: "Contoh video vlog" },
  },
  {
    id: "trim", group: "video", name: "Video Trimming & Duration Reduction",
    desc: "Bagian yang tidak perlu dipotong dan durasi dipadatkan, tanpa menghilangkan inti video.",
    media: { kind: "trim", aspect: "16/9", src: "/Video Service/Video Trimming & Duration Reduction.webp", alt: "Contoh pemotongan durasi video" },
  },
  {
    id: "captions", group: "video", name: "Translations & Captions",
    desc: "Terjemahan dan teks (caption/subtitle) supaya video bisa dipahami lebih banyak orang.",
    media: { kind: "captions", aspect: "16/9", src: "/Video Service/Translations & Captions.webp", alt: "Contoh video dengan caption" },
  },
  {
    id: "slideshow", group: "video", name: "Photo Slideshow Videos",
    desc: "Kumpulan foto jadi video dengan transisi dan musik. Cocok untuk acara dan kenangan.",
    media: { kind: "slideshow", aspect: "16/9", src: "/Video Service/Photo Slideshow Videos.webp", alt: "Contoh video slideshow foto" },
  },
  {
    id: "music-sfx", group: "video", name: "Music & Sound Effects",
    desc: "Musik latar dan efek suara yang pas dengan suasana video.",
    media: { kind: "audio", aspect: "16/9", src: "/Video Service/Music & Sound Effects.webp", alt: "Contoh pengaturan musik dan efek suara" },
  },
];

export const designServices = services.filter((s) => s.group === "design");
export const videoServices  = services.filter((s) => s.group === "video");
