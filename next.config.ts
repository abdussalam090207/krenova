import type { NextConfig } from "next";

let supabaseHost: string | null = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  }
} catch {
  // abaikan jika parsing URL gagal saat init
}

let r2Host: string | null = null;
let r2Origin: string = "https://*.r2.dev";
try {
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    const u = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
    r2Host = u.hostname;
    r2Origin = u.origin;
  }
} catch {
  // abaikan jika parsing URL gagal saat init
}

// CSP directives — mode Report-Only dulu agar bisa diuji tanpa memblokir.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // QR dirender lokal (data URL) — media dari Supabase Storage dan Cloudflare R2
  `img-src 'self' data: blob: https://*.supabase.co ${r2Origin} https://*.r2.dev https://img.youtube.com https://i.pinimg.com`,
  `media-src 'self' https://*.supabase.co ${r2Origin} https://*.r2.dev blob:`,
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
            // Spesifik catalog-media (§4 KATALOG_User.md)
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/catalog-media/**",
            },
          ]
        : []),
      ...(r2Host
        ? [
            {
              protocol: "https" as const,
              hostname: r2Host,
              pathname: "/projects/**",
            },
            {
              protocol: "https" as const,
              hostname: r2Host,
              pathname: "/products/**",
            },
          ]
        : [
            {
              protocol: "https" as const,
              hostname: "*.r2.dev",
              pathname: "/projects/**",
            },
            {
              protocol: "https" as const,
              hostname: "*.r2.dev",
              pathname: "/products/**",
            },
          ]),
      {
        protocol: "https" as const,
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https" as const,
        hostname: "i.pinimg.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",               value: "DENY" },
          { key: "X-Content-Type-Options",         value: "nosniff" },
          { key: "Referrer-Policy",                value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",             value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
      // Halaman pesanan: privat, tidak boleh diindeks, tidak bocor via Referer
      {
        source: "/katalog/pesanan/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control",   value: "no-store, no-cache, must-revalidate" },
          { key: "X-Robots-Tag",    value: "noindex, nofollow" },
        ],
      },
      // API katalog: tidak boleh di-cache
      {
        source: "/api/katalog/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
