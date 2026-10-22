import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Script from "next/script";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { IntroSplash } from "@/components/layout/IntroSplash";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopLoadingBar } from "@/components/layout/TopLoadingBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
// [PERF] AdModalLazy = Client Component wrapper dengan ssr:false agar tidak
// di-bundle ke initial JS chunk (modal hanya muncul 5 detik setelah page load)
import { AdModalLazy } from "@/components/home/AdModalLazy";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  // [PERF] preload font display utama agar tidak block first paint
  preload: true,
});

const bodyFont = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#06060B",
};

export const metadata: Metadata = {
  title: {
    default: "KRENOVA STUDIO | Jasa Desain Grafis & Video Editing",
    template: "%s | KRENOVA STUDIO",
  },
  description:
    "Portfolio KRENOVA STUDIO (Kreatif Inovatif Studio): jasa desain grafis dan video editing, mulai dari flyer, logo, undangan, sampai video YouTube dan vlog.",
  icons: {
    icon: [
      { url: "/logo.webp", type: "image/webp" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
  openGraph: {
    title: "KRENOVA STUDIO | Jasa Desain Grafis & Video Editing",
    description:
      "Portfolio KRENOVA STUDIO (Kreatif Inovatif Studio): jasa desain grafis dan video editing.",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="dark"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <head>
        {/* [PERF] Preconnect ke domain kritis — kurangi latensi handshake TLS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* [PERF] Icon menggunakan WebP (46% lebih kecil dari PNG) */}
        <link rel="icon" type="image/webp" href="/logo.webp" />
        <link rel="shortcut icon" href="/logo.webp" />
        <link rel="apple-touch-icon" href="/logo.webp" />

        {/* [PERF] LCP hint: preload banner pertama — elemen visual terbesar di viewport */}
        <link
          rel="preload"
          as="image"
          href="/banner 1.webp"
          // @ts-ignore — fetchpriority adalah valid HTML attribute, belum ada di TypeScript type
          fetchpriority="high"
        />

        {/* Anti-FOUC script — tentukan tema sebelum browser melakukan paint pertama */}
        <Script id="theme-flag" strategy="beforeInteractive">{`
          try {
            var t = localStorage.getItem("krenova:theme") || "dark";
            document.documentElement.setAttribute("data-theme", t);
            if (t === "light") {
              document.documentElement.classList.add("light");
              document.documentElement.classList.remove("dark");
            } else {
              document.documentElement.classList.add("dark");
              document.documentElement.classList.remove("light");
            }
          } catch (e) {}
        `}</Script>
      </head>
      <body>
        <ThemeProvider>
          <TopLoadingBar />
          {/* Flag intro ditulis sebelum browser paint — mencegah flash konten */}
          <Script id="intro-flag" strategy="beforeInteractive">{`
            try {
              document.documentElement.dataset.intro =
                sessionStorage.getItem("krenova:intro") ? "seen" : "pending";
            } catch (e) {
              document.documentElement.dataset.intro = "seen";
            }
          `}</Script>
          <AmbientBackground />
          <IntroSplash />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          {/* [PERF] AdModal di-lazy load tanpa SSR — tidak ikut bundle initial page */}
          <AdModalLazy />
        </ThemeProvider>
      </body>
    </html>
  );
}
