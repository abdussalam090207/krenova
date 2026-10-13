import type { NextConfig } from "next";

let supabaseHost: string | null = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  }
} catch {
  // abaikan jika parsing URL gagal saat init
}

// CSP directives — mode Report-Only dulu agar bisa diuji tanpa memblokir.
// Setelah semua halaman diverifikasi berjalan normal, ganti ke Content-Security-Policy.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Next.js memerlukan 'unsafe-inline' untuk style injection dan inline scripts
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Supabase REST & Auth + WebSocket realtime
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Gambar dari Supabase Storage, YouTube thumbnail, blob/data (next/image)
  "img-src 'self' data: blob: https://*.supabase.co https://img.youtube.com https://i.pinimg.com",
  "media-src 'self' https://*.supabase.co blob:",
  // YouTube nocookie untuk embed video, Google Maps untuk iframe peta
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Dibatasi ke path Storage publik saja — mencegah proksi gambar terbuka
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
          ]
        : []),
      {
        protocol: "https" as const,
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      // Pinterest CDN untuk avatar komentar Web admin (ditampilkan di portfolio)
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
          // Cegah clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Cegah MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Batasi referrer ke origin saja saat cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Matikan fitur browser yang tidak dipakai
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // CSP Report-Only — aktifkan logging tanpa memblokir dulu
          // Setelah diverifikasi berjalan normal, ubah ke Content-Security-Policy
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
