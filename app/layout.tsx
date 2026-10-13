import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Script from "next/script";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { IntroSplash } from "@/components/layout/IntroSplash";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const bodyFont = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
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
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
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
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* Anti-FOUC script — tentukan tema sebelum browser melakukan paint pertama */}
        <script
          id="theme-flag"
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
