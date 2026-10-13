# Laporan Audit KRENOVA STUDIO — 2026-10-13

## 1. Ringkasan Eksekutif

- **Keputusan rilis: NO-GO** — 1 Critical + 3 High terbuka sebelum rilis.
- **Jumlah temuan:** Critical 1, High 4, Medium 5, Low 2, Info 3
- **3 risiko terbesar:**
  1. **[F-001 CRITICAL]** service_role key hardcoded di Web admin/js/config.js — melewati semua RLS.
  2. **[F-002 HIGH]** Web admin pakai autentikasi lokal (password 2026 hardcoded di JS) bukan Supabase Auth.
  3. **[F-003 HIGH]** Tidak ada header keamanan (CSP, X-Frame-Options) di 
ext.config.ts.

---

## 2. Ruang Lingkup & Cara Uji

- **Diperiksa:** creative-portfolio/ (Next.js 16.4.0 / React 19.3.0) dan Web admin/ (HTML statis)
- **Lingkungan:** Lokal (npm run dev), branch udit/2026-10-13
- **Versi:** Next.js 16.4.0, React 19.3.0, @supabase/supabase-js ^2.117.3, Node.js v24.16.0
- **Yang TIDAK bisa diuji:**
  - Introspeksi RLS (query 6.1 A-L menunggu pemilik)
  - Uji kotak-hitam RLS 6.2 (hanya produksi tersedia)
  - Login admin Web admin (membutuhkan pemilik)
  - Konfigurasi Supabase Dashboard & Vercel

---

## 3. Tabel Temuan

| ID | Tingkat | Area | Judul | Status |
|----|---------|------|-------|--------|
| F-001 | **Critical** | Web admin | service_role key hardcoded plaintext di config.js | Terbuka |
| F-002 | **High** | Web admin | Password hardcoded di JS, bukan Supabase Auth | Terbuka |
| F-003 | **High** | creative-portfolio | Tidak ada header keamanan di next.config.ts | Diperbaiki |
| F-004 | **High** | creative-portfolio | images.remotePatterns terlalu longgar | Diperbaiki |
| F-005 | **High** | creative-portfolio | API /api/stats POST tanpa validasi visitorId | Diperbaiki |
| F-006 | **Medium** | creative-portfolio | setState dalam useEffect body (4 lokasi) | Diperbaiki |
| F-007 | **Medium** | creative-portfolio | img bukan next/image di FeaturedWork.tsx | Diperbaiki |
| F-008 | **Medium** | creative-portfolio | Variabel tidak terpakai (3 lokasi) | Diperbaiki |
| F-009 | **Medium** | creative-portfolio | .env.example tidak ada | Diperbaiki |
| F-010 | **Medium** | creative-portfolio | Unused eslint-disable directive di SiteHeader | Diperbaiki |
| F-011 | **Low** | creative-portfolio | Email About masih .example domain | Menunggu pemilik |
| F-012 | **Low** | creative-portfolio | NEXT_PUBLIC_DATA_MODE di produksi belum dikonfirmasi | Menunggu pemilik |
| F-013 | **Info** | Supabase | CAPTCHA Anonymous Sign-in belum dikonfirmasi | Menunggu pemilik |
| F-014 | **Info** | Supabase | Query introspeksi RLS (A-L) belum dijalankan | Menunggu pemilik |
| F-015 | **Info** | Web admin | Status Git Web admin/ tidak bisa dipastikan | Menunggu pemilik |

---

## 4. Detail Temuan

### F-001 — service_role key hardcoded di Web admin/js/config.js (CRITICAL)
- **Lokasi:** Web admin/js/config.js baris 15
- **Bukti:** JWT dengan role:service_role dalam plaintext. grep SERVICE_ROLE positif di config.js:15 dan supabase.js:20.
- **Riwayat Git:** Web admin/ tidak berada di repo yang sama (tidak ada .git). Key tidak ter-commit ke Git creative-portfolio/. Status Git Web admin/ belum bisa dipastikan.
- **Dampak:** service_role melewati semua RLS. Siapapun yang membuka file ini bisa baca/tulis/hapus seluruh database.
- **Pola:** Pola C — tidak ada Supabase Auth, akses via service_role key sepenuhnya.
- **Perbaikan jangka pendek:** Pastikan server HANYA mendengarkan 127.0.0.1. Verifikasi: netstat -an | findstr :PORT.
- **Perbaikan jangka panjang:** Migrasi ke Pola A (signInWithPassword + anon key + is_admin policy). File SQL: supabase/fixes/001-web-admin-auth-migration.sql.
- **Status:** TERBUKA — jangan rilis sebelum ini ditangani.

### F-002 — Password hardcoded di auth.js (HIGH)
- **Lokasi:** Web admin/js/auth.js baris 115-120
- **Bukti:** verifyCredentials() membandingkan "krenova" dan "2026" hardcoded. Tidak ada Supabase Auth.
- **Dampak:** Password sangat lemah, tersimpan di file JS yang bisa dibaca. Tidak ada brute-force protection. Logout tidak invalidasi sesi server.
- **Perbaikan:** Migrasi ke supabase.auth.signInWithPassword() dengan anon key.
- **Status:** Terbuka.

### F-003 — Tidak ada header keamanan (HIGH → DIPERBAIKI)
- **Lokasi:** creative-portfolio/next.config.ts
- **Bukti:** Tidak ada fungsi headers().
- **Dampak:** Rentan clickjacking, MIME sniffing, tidak ada CSP.
- **Perbaikan:** Ditambahkan headers() dengan X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP Report-Only.

### F-004 — images.remotePatterns terlalu longgar (HIGH → DIPERBAIKI)
- **Lokasi:** creative-portfolio/next.config.ts baris 15
- **Bukti:** { hostname: "*.supabase.co" } tanpa pathname.
- **Dampak:** Proksi gambar terbuka — boros kuota Vercel.
- **Perbaikan:** Dibatasi dengan pathname: "/storage/v1/object/public/**".

### F-005 — API /api/stats POST tanpa validasi visitorId (HIGH → DIPERBAIKI)
- **Lokasi:** creative-portfolio/app/api/stats/route.ts baris 103-117
- **Bukti:** visitorId hanya dicek typeof === "string" tanpa validasi panjang/format.
- **Perbaikan:** Validasi max 64 karakter + format alfanumerik.

### F-006 — setState dalam useEffect body (MEDIUM → DIPERBAIKI)
- **Lokasi:** SiteFooter.tsx:29, SiteHeader.tsx:51, CommentSection.tsx:192 & :379, ThemeProvider.tsx:54
- **Perbaikan:** Pindahkan ke useState lazy initializer, sinkronisasi render resmi React (SiteHeader), dan useSyncExternalStore untuk mounted flag (ThemeProvider).

### F-007 — img bukan next/image (MEDIUM → DIPERBAIKI)
- **Lokasi:** components/home/FeaturedWork.tsx baris 95, 113; components/projects/ProjectCard.tsx baris 60, 79
- **Perbaikan:** Diganti ke Image dari next/image dengan sizing eksplisit dan handling prioritas.

### F-008 — Variabel tidak terpakai (MEDIUM → DIPERBAIKI)
- **Lokasi:** Button di ServicesExplorer.tsx:9, waHref di ServicesExplorer.tsx:45, bodyPrefix di CommentSection.tsx:206, paddingBottom & clamp di ProjectCard.tsx, types di dummy-repo.ts, loop variable di CommentSection.tsx:477.
- **Perbaikan:** Dihapus seluruhnya; sanitizeSearch dihubungkan ke query pencarian di supabase-repo.ts.

### F-009 — .env.example tidak ada (MEDIUM → DIPERBAIKI)
- Dibuat .env.example dengan nama variabel saja tanpa secret.

### F-010 — Unused eslint-disable directive & React Compiler warning (MEDIUM → DIPERBAIKI)
- SiteHeader.tsx:49 directive dihapus; ProjectViewer.tsx memoization dibersihkan untuk kompatibilitas penuh React Compiler.

---

## 5. Yang Lolos (dengan Bukti)

| Pemeriksaan | Bukti |
|-------------|-------|
| Tidak ada secret di creative-portfolio/ | check-env.js: hanya JWT role=anon |
| Tidak ada service_role di kode portfolio | grep: bersih |
| .env* ada di .gitignore | .gitignore baris 34 |
| Tidak ada .env* ter-track Git | git ls-files: kosong |
| Tidak ada service_role di riwayat Git | git log: kosong |
| TypeScript bersih | npx tsc --noEmit: exit 0 |
| npm audit --omit=dev: 0 vulnerabilities | Terkonfirmasi |
| signInAnonymously() hanya saat interaksi | session.ts hanya dari like/comment/feedback |
| insert feedback tanpa .select() | submit.ts:46 terkonfirmasi |
| Tidak ada innerHTML/eval di portfolio | grep bersih |
| Semua external link rel="noopener noreferrer" | Terverifikasi 10+ lokasi |
| Input pencarian disanitasi | sanitizeSearch() di supabase-repo.ts:39-41 |
| Honeypot ada di feedback & komentar | Terkonfirmasi kedua form |
| Web admin esc() untuk semua data user | comments.js, feedback.js, projects.js |
| Web admin logout hapus sessionStorage | auth.js:46 terkonfirmasi |
| dangerouslySetInnerHTML di layout.tsx | Konten statis hardcoded — AMAN |

---

## 6. Tugas Manual untuk Pemilik

### Supabase Dashboard — WAJIB sebelum rilis:
- [ ] Pertimbangkan rotasi service_role key jika pernah dibagikan/diakses selain 127.0.0.1
- [ ] Authentication: Allow anonymous sign-ins — pastikan aktif
- [ ] Authentication: CAPTCHA protection (Turnstile/hCaptcha) — aktifkan sebelum live
- [ ] Authentication: Ganti password admin dari 2026 ke password kuat; aktifkan MFA
- [ ] Authentication: URL Configuration — hanya domain produksi, tanpa wildcard
- [ ] Advisors (Security & Performance) — jalankan dan tempel hasilnya
- [ ] Jalankan query SQL 6.1 (A-L) dari AUDIT.md
- [ ] Storage bucket project-media: publik, max 50MB, MIME terbatas, tanpa SVG/HTML

### Vercel:
- [ ] Root Directory = creative-portfolio
- [ ] Env: NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY ada; tidak ada service_role; DATA_MODE bukan dummy di Production

### Lokal & Repo:
- [ ] Web admin: server dengan --bind 127.0.0.1, buka via http://localhost
- [ ] Konfirmasi apakah Web admin/ punya Git repo sendiri dan apakah publik
- [ ] Ganti email .example di About dengan email asli
- [ ] Ganti data dummy dengan karya asli

---

## 7. Data Uji yang Dibuat

Tidak ada — uji kotak-hitam RLS tidak dijalankan (hanya produksi tersedia).

---

## 8. Rekomendasi Pasca-Rilis

1. Aktifkan Supabase usage alerts untuk kuota storage dan bandwidth
2. Audit ulang setiap 3 bulan atau setelah perubahan besar
3. Setelah CSP Report-Only diuji tanpa pelanggaran, pindah ke CSP enforce
4. Pantau GitHub Security Advisories untuk Next.js 16.x
5. Migrasikan Web admin ke Pola A (Supabase Auth + anon key + is_admin policy)
6. Aktifkan Supabase point-in-time recovery (plan Pro)
