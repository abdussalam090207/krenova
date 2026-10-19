export const nav = [
  { label: "Beranda",     href: "/",         matchExact: true  },
  { label: "Proyek", href: "/projects", matchExact: false }, // aktif untuk /projects dan /projects/[slug]
  { label: "Katalog",  href: "/katalog",  matchExact: false }, // aktif untuk /katalog dan /katalog/**
  { label: "Tentang",    href: "/about",    matchExact: false },
] as const;

export type NavItem = (typeof nav)[number];

/** Cek apakah item nav aktif untuk pathname saat ini */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.matchExact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
