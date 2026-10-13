export const siteConfig = {
  name: "KRENOVA STUDIO",
  expansion: "Kreatif Inovatif Studio",
  tagline: "Desain grafis dan video editing untuk bisnis, kreator, dan acara.",
  contacts: [
    { display: "0895 3260 98189", wa: "62895326098189" },
    { display: "0859 6015 8194",  wa: "6285960158194" },
  ],
  // Kontak & lokasi (lihat ABOUT.md §2)
  email: "krenovastudio26@gmail.com", // DUMMY. Ganti dengan email asli sebelum live
  socials: [] as { label: string; href: string }[],
  address:
    "Jalan Rorotan Lama RT.1/RW.10, Cakung Timur, Kec. Cakung, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13910",
  addressShort: "Jl. Rorotan Lama, Cakung Timur, Jakarta Timur", // untuk footer
  mapsUrl: "https://maps.app.goo.gl/rXo1Bu4wr7dnzkKz6", // tombol "Buka di Google Maps"
  // Titik embed peta. Untuk titik persis: buka mapsUrl, ambil koordinat "@lat,lng", isi "-6.xxxxx,106.xxxxx"
  mapQuery: "Jalan Rorotan Lama, Cakung Timur, Cakung, Jakarta Timur 13910",
} as const;

export const waLink = (
  wa: string,
  text = "Halo KRENOVA STUDIO, saya mau tanya soal jasa desain/video editing.",
) => `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
