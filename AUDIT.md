# README.md — Panduan Audit, Validasi & Troubleshooting (untuk AI Coding)

> Dokumen ini adalah **perintah kerja untuk AI coding**. Tugasmu: memeriksa seluruh proyek KRENOVA STUDIO, membuktikan apa yang aman dan apa yang bermasalah, lalu memperbaiki dengan cara yang terkendali.
> Baca seluruh dokumen ini sebelum menjalankan perintah apa pun.

---

## 1. Tujuan & sikap kerja

Tujuan: memastikan proyek **aman, bebas bug yang bisa ditemukan, dan siap dipublikasikan**.

Sikap kerja yang wajib:

1. **Bukti, bukan klaim.** Jangan menulis "aman" atau "tidak ada bug" tanpa menunjukkan apa yang diuji dan hasilnya. Tidak ada audit yang bisa menjamin 100% bebas bug; yang bisa dilakukan adalah melaporkan dengan jujur **apa yang sudah diverifikasi, apa yang gagal, dan apa yang belum bisa diuji**.
2. **Kode aktual adalah sumber kebenaran.** Dokumen spesifikasi (`START.md`, `HOME.md`, `PROJECTS.md`, `ABOUT.md`, kalau ada di repo) hanya acuan perilaku yang diharapkan. Kalau kode berbeda dari dokumen, laporkan sebagai temuan hanya bila berdampak pada keamanan, bug, atau pengalaman pengguna; kalau tidak, cukup catatan.
3. **Jangan menebak.** Kalau sesuatu tidak bisa dipastikan dari kode atau hasil uji (misalnya pengaturan dashboard Supabase atau Vercel yang tidak bisa kamu akses), tandai sebagai **"perlu dicek manual oleh pemilik"** dan masukkan ke daftar bagian 11.
4. **Prioritaskan dampak.** Temuan yang membuat pengunjung bisa membaca atau mengubah data yang bukan miliknya jauh lebih penting daripada gaya kode.
5. **Perubahan sekecil mungkin.** Jangan menulis ulang arsitektur, mengganti library, atau "merapikan" hal yang tidak diminta.

---

## 2. Peta proyek

| Folder | Isi | Deploy | Catatan |
|---|---|---|---|
| `creative-portfolio/` | Web portfolio **sisi user** KRENOVA STUDIO. Next.js. Terhubung ke Supabase. | **Vercel** (publik) | Halaman: Home, Projects (+ `/projects/[slug]`), About. |
| `Web admin/` | Web statis dashboard: kelola postingan, lihat data lain. Terhubung ke Supabase. | **Tidak dideploy**: hanya dijalankan **lokal** | Nama folder **mengandung spasi**: selalu beri tanda kutip pada path (`"Web admin"`). |
| Supabase (cloud) | Postgres (tabel `projects`, `project_likes`, `project_comments`, `feedback_messages`, `admins`), Auth (Anonymous Sign-in), Storage (bucket `project-media`). | Supabase | Backend bersama untuk kedua aplikasi. |

Konteks bisnis: KRENOVA STUDIO (Kreatif Inovatif Studio) adalah studio jasa desain grafis dan video editing. Web ini adalah **portfolio dan alat membangun kepercayaan**; data pengunjung (nama, email, komentar) harus diperlakukan sebagai **data pengguna yang tidak tepercaya sekaligus data pribadi**.

Model ancaman singkat:
- **Pengunjung publik / bot** memegang anon key (publik by design) dan bisa memanggil API Supabase langsung dari luar UI. Satu-satunya pertahanan di sisi data adalah **RLS, constraint, trigger, dan kebijakan Storage**.
- **Pengunjung anonim yang login** (Anonymous Sign-in) memakai role `authenticated`. Jangan pernah menganggap `authenticated` = admin.
- **Admin** (pemilik) memakai Web admin lokal. Web admin menampilkan konten yang ditulis pengunjung (komentar, feedback), jadi **harus kebal terhadap XSS dari data pengunjung**.

---

## 3. Aturan main (WAJIB DIPATUHI)

### 3.1 Dilarang keras
- Menampilkan, mencetak, mencatat, atau menyalin **nilai** secret/key/password ke terminal output, laporan, commit, atau chat. Kalau perlu menyebut, **samarkan** (`sb_secret_ab…`, `eyJhbG…`).
- Menjalankan perintah destruktif: `rm -rf` di luar folder build/cache, `git push --force`, `git reset --hard`, `DROP`, `TRUNCATE`, `DELETE` tanpa `WHERE`, `supabase db reset`, atau apa pun yang menghapus data nyata.
- Mengubah atau menghapus **data produksi** milik pengguna (karya, komentar, like, feedback). Uji tulis hanya dengan baris bertanda `__audit__` (lihat 3.3) dan bersihkan kembali.
- Menonaktifkan RLS, melonggarkan policy, atau memakai service role / secret key di kode client "supaya jalan".
- `git push`, membuat/merge PR ke branch utama, atau men-deploy ke Vercel/Supabase tanpa diminta.
- Menambahkan telemetry, analytics, atau layanan pihak ketiga baru.
- Menginstal dependensi baru ke proyek tanpa alasan kuat dan persetujuan (alat audit sementara boleh dijalankan lewat `npx` tanpa menyimpannya di `package.json`).

### 3.2 Boleh langsung dikerjakan (di branch audit)
Buat branch `audit/<tanggal>` sebelum mengubah file apa pun. Di branch itu boleh:
- Memperbaiki error lint/TypeScript, import tak terpakai, `console.log` sisa debug.
- Menambah `alt`, `aria-*`, `rel="noopener noreferrer"`, label form yang kurang.
- Menambah validasi input yang jelas hilang, escaping, penanganan error dan state loading.
- Menambah header keamanan di `next.config`, entri `.gitignore` yang kurang.
- Memperbaiki bug fungsional kecil yang penyebabnya sudah terbukti, disertai uji ulang.

### 3.3 Tanya dulu sebelum mengerjakan
- **Semua perubahan database** (SQL, RLS, trigger, fungsi, Storage policy): tulis sebagai file SQL di `supabase/fixes/NNN-judul.sql` dan **serahkan ke pemilik untuk dijalankan**. Jangan menjalankannya sendiri.
- Perubahan alur autentikasi, penyimpanan sesi, atau cara Web admin masuk.
- Upgrade dependensi **major**, atau pergantian versi Next.js/React.
- Menghapus fitur/file, mengubah struktur folder, mengubah konfigurasi deployment atau env.
- Perubahan yang mengubah tampilan atau perilaku yang terlihat pengguna secara signifikan.

### 3.4 Menangani secret yang ditemukan
Kalau menemukan secret (terutama `service_role` / `sb_secret_...`) di tempat yang salah:
1. Tandai **Critical**, tapi **jangan** menyalin nilainya ke laporan.
2. Jelaskan lokasi (file dan baris) dan apakah nilainya pernah masuk Git (`git log --all -S`).
3. Anggap secret itu **sudah bocor** bila pernah di-commit atau pernah dilayani lewat jaringan non-lokal. Rekomendasikan pemilik me-**rotate** key di dashboard Supabase. Kamu tidak boleh melakukan rotasi sendiri.
4. Menghapus dari file saja **tidak cukup** bila sudah ada di riwayat Git.

### 3.5 Data uji
- Beri awalan **`__audit__`** pada semua data yang kamu buat (judul, nama, subjek, komentar).
- Catat semua yang dibuat di bagian akhir laporan, lalu **hapus kembali** bila memungkinkan, atau minta pemilik membersihkannya (akun anonim uji tidak bisa dihapus tanpa hak admin: Dashboard → Authentication → Users, saring anonim).
- **Sangat disarankan** menjalankan uji tulis di **proyek Supabase staging** atau lokal. Kalau hanya ada produksi, batasi uji tulis ke yang minimum (bagian 6.3) dan konfirmasi dulu ke pemilik.

### 3.6 Akses yang mungkin tidak kamu miliki
- Dashboard Supabase dan Vercel: biasanya tidak bisa kamu akses. Kalau ada Supabase MCP / CLI yang sudah terhubung, boleh dipakai **read-only**. Kalau tidak, minta pemilik menjalankan query di bagian 6.1 dan menempelkan hasilnya (tanpa secret).
- **Jangan meminta password admin** dan jangan menyimpannya. Uji yang butuh login admin dilakukan oleh pemilik sendiri (bagian 8.4), atau dilewati dan dicatat sebagai belum diuji.

---

## 4. Alur kerja (fase)

| Fase | Isi | Keluaran |
|---|---|---|
| 0 | Orientasi: pahami struktur, versi, skrip, env (bagian 5) | Ringkasan peta proyek |
| 1 | Pemindaian secret dan kebersihan repo (bagian 5.2) | Temuan secret |
| 2 | Kualitas build: install, lint, typecheck, build, audit dependensi (bagian 5.3) | Hasil perintah + temuan |
| 3 | Audit database: introspeksi + uji kotak-hitam RLS (bagian 6) | Matriks lolos/gagal |
| 4 | Tinjauan aplikasi portfolio (bagian 7) | Temuan keamanan + bug |
| 5 | Tinjauan Web admin (bagian 8) | Temuan keamanan + bug |
| 6 | Uji fungsional end-to-end (bagian 9) | Daftar skenario lolos/gagal |
| 7 | Laporan dan rencana perbaikan (bagian 10), lalu perbaikan sesuai bagian 3 | `AUDIT_REPORT.md` + branch audit |

Kerjakan berurutan. Fase 0 sampai 6 bersifat **baca/uji**; perubahan kode baru dimulai di fase 7.

---

## 5. Fase 0 sampai 2: Orientasi, secret, build

### 5.1 Orientasi (Fase 0)
Lakukan dan catat hasilnya:

```bash
git rev-parse --show-toplevel && git status --short && git remote -v     # struktur repo; jangan push
ls -la . creative-portfolio "Web admin"
cat creative-portfolio/package.json                                       # skrip, dependensi, versi Next/React
node -v && npm -v
```

Cari tahu dan tulis di laporan:
- Versi **Next.js, React, `@supabase/supabase-js`**, Tailwind, Node yang dipakai.
- Skrip yang tersedia (`dev`, `build`, `lint`, dst.).
- Apakah `Web admin/` berada **di dalam repo yang sama** dengan `creative-portfolio/`, dan apakah repo itu publik (tanyakan pemilik kalau tidak bisa dipastikan). Root Directory di Vercel seharusnya `creative-portfolio` agar `Web admin/` tidak ikut terbawa.
- Cara Web admin dijalankan (server statis apa, di port berapa, alamat bind apa).
- Kalau `START.md`, `HOME.md`, `PROJECTS.md`, `ABOUT.md` ada, baca semuanya dulu sebagai spesifikasi.

### 5.2 Pemindaian secret & kebersihan repo (Fase 1)

```bash
# 1) File env yang ter-track di Git (seharusnya TIDAK ada, kecuali .env.example tanpa nilai)
git ls-files | grep -iE '(^|/)\.env'

# 2) Pola secret di working tree (abaikan node_modules, .next, .git)
grep -rIn --exclude-dir={node_modules,.next,.git,.vercel} \
  -E "service_role|sb_secret_|SUPABASE_SERVICE|SERVICE_ROLE" . | sed -E 's/(sb_secret_|eyJ)[A-Za-z0-9._-]{6,}/\1…[disamarkan]/g'

# 3) JWT hardcoded (anon key boleh publik, service_role tidak). Periksa role-nya, jangan cetak nilainya.
grep -rIlE --exclude-dir={node_modules,.next,.git,.vercel} "eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\." .

# 4) Riwayat Git: pernah ada secret?
git log --all --oneline -S"service_role" | head
git log --all --oneline -S"sb_secret_" | head
git log --all --diff-filter=A --name-only --pretty=format: | grep -iE '(^|/)\.env' | sort -u
```

Kalau `gitleaks` atau `trufflehog` tersedia, jalankan juga (`gitleaks detect --redact`). Kalau tidak tersedia, jangan menginstalnya ke proyek; cukup pakai `grep` di atas dan catat keterbatasannya.

**Mengecek jenis key tanpa menampilkan nilainya** (tanpa menempel key di command line):

```bash
node -e '
const fs=require("fs");
for (const f of process.argv.slice(1)) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f,"utf8").split("\n")) {
    const m=line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/); if(!m) continue;
    const v=m[2].trim().replace(/^["\x27]|["\x27]$/g,"");
    let kind="-";
    if (v.startsWith("sb_secret_")) kind="SECRET (sb_secret_)";
    else if (v.startsWith("sb_publishable_")) kind="publishable";
    else if (v.split(".").length===3) { try { kind="JWT role="+JSON.parse(Buffer.from(v.split(".")[1],"base64url")).role } catch {} }
    console.log(f, "|", m[1], "|", kind);
  }
}' creative-portfolio/.env.local creative-portfolio/.env "Web admin/.env" "Web admin/config.js" 2>/dev/null
```

Yang harus dipastikan:
- [ ] `.env*` (selain `.env.example` tanpa nilai) ada di `.gitignore` di **kedua** folder dan tidak ter-track.
- [ ] Di `creative-portfolio/` **hanya** ada key `anon`/`publishable`. Variabel berawalan `NEXT_PUBLIC_` tidak boleh berisi secret apa pun.
- [ ] Tidak ada `service_role` / `sb_secret_` di kode `creative-portfolio/` (termasuk di `.next/` hasil build, yang tidak boleh ikut di-commit).
- [ ] Posisi `service_role` di `Web admin/` (kalau ada) dinilai di bagian 8.1.
- [ ] `.vercel/`, `.next/`, `node_modules/`, `.DS_Store`, berkas log ada di `.gitignore`.
- [ ] `.env.example` ada dan hanya berisi nama variabel + contoh kosong.

### 5.3 Kualitas build (Fase 2)
Jalankan di `creative-portfolio/` dan catat output ringkasnya:

```bash
cd creative-portfolio
npm ci                           # install bersih sesuai lockfile (kalau lockfile tidak ada: catat sebagai temuan)
npm run lint
npx tsc --noEmit
npm run build                    # build produksi; perhatikan warning, ukuran halaman, error hidrasi
npm audit --omit=dev             # kerentanan di dependensi produksi
npm outdated                     # informasi saja
```

Periksa:
- [ ] Lint, typecheck, dan build lolos tanpa error. Warning dicatat dan dinilai.
- [ ] `package-lock.json` ada dan ter-commit; versi dependensi tidak memakai `latest` / `*`.
- [ ] Hasil `npm audit`: nilai **dapat tidaknya kerentanan dieksploitasi pada pemakaian proyek ini**, jangan hanya menyalin jumlah. `npm audit fix --force` **tidak boleh** dijalankan tanpa persetujuan (bisa menaikkan versi major).
- [ ] Periksa **advisory keamanan resmi** untuk versi **Next.js dan React** yang terpasang (GitHub Security Advisories / blog rilis resmi, lewat pencarian web bila tersedia). Pembaruan keamanan untuk framework ini harus diterapkan sebelum publish; catat versi terpasang, versi aman terbaru pada jalur yang sama, dan apakah proyek memakai fitur yang terdampak.
- [ ] Tidak ada file besar tak perlu di repo (video mentah, `.zip`), kecuali memang aset.
- [ ] Build di Linux sensitif huruf besar-kecil: cari impor yang namanya tidak sama persis dengan nama file (`grep` impor lalu cocokkan dengan `git ls-files`). Ini penyebab klasik "jalan di lokal, gagal di Vercel".

Lakukan hal yang sama untuk `Web admin/` bila punya `package.json`; kalau murni HTML/JS statis, periksa bagian 8.

---

## 6. Fase 3: Audit database (Supabase)

Skema acuan ada di `supabase/schema.sql` / `krenova-schema.sql` dan `feedback.sql` / `krenova-feedback.sql` (kalau ada). **Bandingkan dengan keadaan database yang sebenarnya**, bukan hanya dengan file SQL: bisa jadi ada perubahan manual di dashboard.

### 6.1 Introspeksi (read-only)
Jalankan lewat Supabase SQL Editor (oleh pemilik) atau MCP/CLI read-only. Semua query di bawah **hanya membaca**.

```sql
-- A. RLS aktif di semua tabel public? (rls_enabled WAJIB true)
select c.relname as tabel, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by 1;

-- B. Semua policy (public dan storage)
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, cmd, policyname;

-- C. Policy yang mencurigakan: kondisi selalu true
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
  and (qual = 'true' or with_check = 'true');

-- D. Fungsi di schema public: security definer, search_path, siapa boleh eksekusi
select p.proname as fungsi,
       pg_get_function_identity_arguments(p.oid) as argumen,
       p.prosecdef as security_definer,
       p.proconfig as konfigurasi,
       has_function_privilege('anon', p.oid, 'execute') as anon_bisa_eksekusi,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_bisa_eksekusi
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;

-- E. Trigger pada tabel public
select event_object_table as tabel, trigger_name, event_manipulation as event, action_timing as timing
from information_schema.triggers where trigger_schema = 'public' order by 1, 2;

-- F. Bucket Storage
select id, public, file_size_limit, allowed_mime_types from storage.buckets;

-- G. Admin terdaftar (periksa bahwa hanya akun pemilik)
select a.user_id, u.email, a.created_at
from public.admins a left join auth.users u on u.id = a.user_id;

-- H. Pengguna anonim vs total (catat angkanya SEBELUM dan SESUDAH membuka halaman; tidak boleh naik hanya karena melihat)
select count(*) filter (where is_anonymous) as anonim, count(*) as total from auth.users;

-- I. Penghitung melenceng dari data sebenarnya?
select p.id, p.slug, p.like_count,
       (select count(*) from public.project_likes l where l.project_id = p.id) as like_sebenarnya,
       p.comment_count,
       (select count(*) from public.project_comments c where c.project_id = p.id and not c.is_hidden) as komentar_sebenarnya
from public.projects p
where p.like_count    <> (select count(*) from public.project_likes l where l.project_id = p.id)
   or p.comment_count <> (select count(*) from public.project_comments c where c.project_id = p.id and not c.is_hidden);

-- J. Kualitas data karya
select id, slug, title, media_type,
       (width is null or height is null) as tanpa_dimensi,
       (media_type = 'video' and thumb_path is null and external_url is null) as video_tanpa_poster,
       is_published
from public.projects
where width is null or height is null or (media_type = 'video' and thumb_path is null and external_url is null);

-- K. File yatim di Storage (ada file, tidak dirujuk baris mana pun)
select o.name from storage.objects o
where o.bucket_id = 'project-media'
  and not exists (select 1 from public.projects p where o.name in (p.media_path, p.thumb_path));

-- L. Baris yang merujuk file yang tidak ada di Storage
select p.id, p.slug, p.media_path, p.thumb_path from public.projects p
where (p.media_path is not null and not exists (select 1 from storage.objects o where o.bucket_id='project-media' and o.name = p.media_path))
   or (p.thumb_path is not null and not exists (select 1 from storage.objects o where o.bucket_id='project-media' and o.name = p.thumb_path));
```

**Cara menilai hasil**

| Query | Yang diharapkan | Kalau menyimpang |
|---|---|---|
| A | `rls_enabled = true` untuk **semua** tabel | **Critical**: tabel tanpa RLS terbuka penuh lewat API publik |
| B/C | Tidak ada policy `true`; tulis ke `projects`, hapus/ubah komentar orang lain, baca `project_likes`/`feedback_messages` hanya untuk admin atau pemilik baris | **Critical/High** |
| B | Policy ke `authenticated` **selalu** disertai `user_id = auth.uid()` atau `is_admin()`. Pengunjung anonim juga `authenticated`. | **Critical**: setiap pengunjung bisa menulis |
| D | Fungsi `security definer` punya `search_path` kosong/terkunci; fungsi trigger tidak bisa dieksekusi `anon`/`authenticated`; hanya `is_admin` dan `related_projects` yang sengaja publik | **High** untuk `security definer` tanpa `search_path` |
| E | Trigger slug/updated_at, penghitung like/komentar, pembatas laju komentar & feedback ada | **Medium/High** kalau hilang (penghitung tidak sinkron, tidak ada rate limit) |
| F | Bucket `project-media`: publik, `file_size_limit` terisi, `allowed_mime_types` hanya gambar/video yang dibutuhkan (**tanpa `image/svg+xml` dan `text/html`**); policy tulis hanya admin | **High** untuk bucket yang bisa ditulis publik atau menerima SVG/HTML |
| G | Hanya akun pemilik | **Critical** kalau ada akun asing |
| H | Angka anonim **tidak bertambah** saat hanya melihat halaman | **Medium**: sign-in anonim terpicu otomatis (boros dan membuka celah spam) |
| I | Nol baris | **Medium**: trigger penghitung bermasalah |
| J/K/L | Nol baris atau penjelasan wajar | **Low/Medium** (data berantakan, link media rusak) |

Catatan: Supabase memberi hak tabel ke `anon` dan `authenticated` secara bawaan; **yang menjadi penjaga adalah RLS**, jadi hak tabel yang luas bukan temuan selama RLS dan policy benar.
Kalau tersedia, minta pemilik membuka **Supabase Dashboard → Advisors (Security dan Performance)** dan tempel isinya; masukkan semua peringatan level tinggi ke laporan.

### 6.2 Uji kotak-hitam RLS (meniru penyerang)
Tulis skrip Node sementara (di luar `src/`, **jangan di-commit**; mis. `scripts/audit/rls-test.mjs`, tambahkan ke `.gitignore`) memakai `@supabase/supabase-js` dengan **anon key saja**. Ambil URL dan key dari env tanpa mencetaknya. Lakukan tiap uji dua kali: tanpa sesi, dan setelah `signInAnonymously()`.

| # | Aksi | Hasil yang benar |
|---|---|---|
| 1 | Tanpa sesi: baca `projects` | Hanya baris `is_published = true` |
| 2 | Tanpa sesi: `insert` / `update` / `delete` di `projects` | Ditolak (0 baris berubah atau error 42501) |
| 3 | Tanpa sesi: baca `project_likes`, `feedback_messages`, `admins` | Kosong atau ditolak |
| 4 | Tanpa sesi: `insert` ke `project_likes`, `project_comments`, `feedback_messages` | Ditolak |
| 5 | Tanpa sesi: unggah/hapus file di bucket `project-media` | Ditolak |
| 6 | Tanpa sesi: baca komentar | Hanya yang `is_hidden = false` |
| 7 | Anonim: suka karya, lalu suka **lagi** | Kedua kali tidak menggandakan like; `like_count` naik tepat 1 |
| 8 | Anonim: `insert` like dengan `user_id` **orang lain** | Ditolak |
| 9 | Anonim: hapus like milik orang lain | Tidak ada baris terhapus |
| 10 | Anonim: `insert` komentar normal | Berhasil; `comment_count` +1 |
| 11 | Anonim: komentar dengan `user_id` orang lain | Ditolak |
| 12 | Anonim: komentar dengan `is_owner: true` dan `is_hidden: true` | Tersimpan dengan `is_owner = false` dan `is_hidden = false` (dipaksa trigger) |
| 13 | Anonim: komentar ke-4 dalam 1 menit | Ditolak (error `P0001`, pesan Indonesia) |
| 14 | Anonim: komentar 501 karakter, nama 1 karakter, isi kosong/spasi saja | Ditolak (constraint `23514`) |
| 15 | Anonim: `update` komentar atau `update projects set like_count = 9999` | Ditolak / 0 baris |
| 16 | Anonim: hapus komentar **milik sendiri** / **milik orang lain** | Sendiri berhasil; orang lain 0 baris |
| 17 | Anonim: `insert` ke `feedback_messages` lalu `select` | Insert berhasil; select kosong/ditolak; `status` dipaksa `new`; pesan ke-4 dalam 10 menit ditolak |
| 18 | Anonim: `insert` feedback dengan email tidak valid / pesan < 10 karakter | Ditolak |
| 19 | Anonim: `rpc('related_projects', …)` | Berhasil, hanya karya terpublikasi |
| 20 | Anonim: panggil `rpc` pada fungsi trigger/`security definer` lain | Ditolak / tidak tersedia |
| 21 | Karya `is_published = false`: akses lewat slug dari halaman publik | 404, tidak muncul di grid, tidak muncul di `related` |
| 22 | Lewati UI: panggil endpoint REST langsung dengan header anon key dan coba `select=*` pada tabel sensitif | Sama seperti hasil di atas |

Catat setiap baris: **lolos / gagal**, bukti singkat (kode status/error), dan hasil `select` verifikasi.

### 6.3 Batasan uji tulis
- Uji #7 sampai #18 membuat baris. Pakai `__audit__` di teks, dan **batasi jumlah** (mis. maksimal 1 komentar, 1 feedback, 1 like per uji; uji pembatas laju menghasilkan beberapa baris, bersihkan setelahnya).
- Pembatas laju membuat uji tertentu bisa **memblokir sesi anonimmu sendiri** beberapa menit. Itu wajar; tunggu atau pakai sesi anonim baru.
- Setelah selesai, hitung ulang query H dan I; hasilnya harus konsisten dengan uji yang kamu lakukan.

---

## 7. Fase 4: Tinjauan `creative-portfolio/`

### 7.1 Keamanan aplikasi
Telusuri kode (bukan hanya hasil build) dan jawab dengan bukti:

**Data & sisi client**
- [ ] Semua akses Supabase memakai anon/publishable key. Tidak ada service role di bundle client (cek juga `.next/static` setelah build: `grep -r "service_role\|sb_secret_" .next`).
- [ ] Tidak ada **login anonim otomatis saat halaman dibuka**. `signInAnonymously` hanya dipanggil saat suka/komentar/kirim feedback.
- [ ] `insert` feedback tidak memakai `.select()` setelahnya; `insert` komentar hanya meminta kolom yang boleh dibaca.
- [ ] Tidak ada `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`. Kalau ada, buktikan inputnya statis atau sudah disanitasi.
- [ ] Konten pengunjung (nama, komentar, feedback) dirender sebagai **teks**. Tidak ada auto-link dari input pengunjung. Tidak ada URL dari data pengunjung yang masuk ke `href`/`src` tanpa validasi skema (`https:`/`http:` saja; tolak `javascript:` dan `data:`).
- [ ] Parameter URL (`q`, `type`, `service`, `sort`) divalidasi terhadap daftar nilai yang diizinkan; pencarian disanitasi sebelum masuk filter `.or()` PostgREST (karakter `, ( ) % * " \` dibuang; panjang dibatasi). Uji dengan input aneh (`%`, `,`, `)`, tanda kutip, 10 ribu karakter).
- [ ] Redirect/tautan eksternal memakai `rel="noopener noreferrer"`. Tidak ada open redirect dari parameter.
- [ ] Tidak ada rute API (`app/api/**`) yang menerima input tanpa validasi/pembatasan. Kalau ada, periksa metode, validasi, rate limit, dan CORS.
- [ ] Penanganan error tidak membocorkan detail internal (stack trace, nama tabel, pesan SQL mentah) ke pengguna. Pesan dari database yang ditampilkan hanya yang memang ramah pengguna (`P0001`).

**Konfigurasi Next.js**
- [ ] `next.config`: `images.remotePatterns` **dibatasi** ke host Supabase (`/storage/v1/object/public/project-media/**`) dan `img.youtube.com`. **Wildcard `**` atau `domains` longgar = temuan** (proksi gambar terbuka, bisa menguras kuota Vercel).
- [ ] **Header keamanan** terpasang lewat `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (matikan kamera/mikrofon/geolokasi), proteksi framing (`frame-ancestors 'none'` atau `X-Frame-Options: DENY`), dan **Content-Security-Policy** yang tetap mengizinkan yang dibutuhkan:
  - `connect-src`: host Supabase (`https://*.supabase.co`, `wss://*.supabase.co` bila realtime),
  - `img-src`: `'self' data: blob:` + host Supabase + `img.youtube.com`,
  - `media-src`: `'self'` + host Supabase,
  - `frame-src`: `https://www.youtube-nocookie.com https://www.google.com` (peta `maps.google.com` mengalihkan ke domain Google; uji agar tidak kosong),
  - `script-src`/`style-src` sesuai kebutuhan Next.js (nonce/hash bila memungkinkan; catat kompromi `'unsafe-inline'` kalau terpaksa).
  Rekomendasikan mode **Report-Only** dulu bila ragu, lalu uji semua halaman sebelum memberlakukan.
- [ ] Source map produksi untuk browser tidak diaktifkan kecuali disengaja.
- [ ] `NEXT_PUBLIC_DATA_MODE` **bukan** `dummy` di produksi, dan di produksi tanpa env Supabase halaman menampilkan state kosong yang ramah, **bukan data dummy**.
- [ ] Env yang dibutuhkan terdaftar di `.env.example` (nama saja).

**Spam, penyalahgunaan, biaya**
- [ ] Pembatas laju komentar dan feedback ada di database (uji #13, #17).
- [ ] Honeypot dan jebakan waktu pada form feedback/komentar berfungsi (pengiriman palsu tidak menambah baris).
- [ ] CAPTCHA untuk Anonymous Sign-in: status aktif/tidaknya dicatat (cek manual pemilik). Kalau tidak aktif, catat sebagai risiko **Medium** sebelum live.
- [ ] Tidak ada pemanggilan Supabase berulang tanpa batas (infinite scroll tidak memicu request beruntun, tidak ada loop `useEffect`). Periksa tab Network untuk satu sesi penjelajahan.
- [ ] Ukuran dan format gambar/video wajar (bandwidth Supabase dan optimasi gambar Vercel terbatas di plan gratis).

**Privasi**
- [ ] Email dan pesan pengunjung tidak di-`console.log`, tidak masuk analytics, tidak disimpan di `localStorage` (kecuali nama komentar yang diingat dan memang disengaja).
- [ ] Ada kalimat privasi di form feedback ("Email hanya dipakai untuk membalas pesanmu") dan pernyataan itu benar dalam praktiknya. Catat bahwa alamat/email/telepon yang tampil di web adalah data bisnis yang memang dipublikasikan pemilik.
- [ ] Email di halaman About masih dummy (`.example`)? Tandai agar diganti sebelum live.

### 7.2 Bug & kualitas fungsional (cari dengan membaca kode **dan** menjalankan aplikasi)
Jalankan `npm run dev` (dan `npm run build && npm start` untuk perilaku produksi) lalu periksa:

**Global**
- [ ] **Intro splash**: tampil sekali per tab/sesi (3 detik, fade in/out), tidak muncul lagi saat refresh atau pindah halaman, muncul lagi di tab baru; tidak ada kedipan konten sebelum splash; scroll terkunci selama tampil; tidak ada peringatan hidrasi. Uji juga: buka langsung `/about` dan `/projects/<slug>`, mode private browsing, dan refresh saat splash berjalan.
- [ ] **Navigasi**: top bar di desktop (≥ 768px), hamburger + sidebar kiri di HP; item "Projects" aktif di `/projects` **dan** `/projects/[slug]`; sidebar menutup via X, overlay, Esc, dan saat pindah rute; fokus terkunci di dalam sidebar dan kembali ke tombol hamburger; scroll body terkunci saat terbuka.
- [ ] **Console bersih**: tidak ada error, tidak ada peringatan hidrasi, tidak ada peringatan key React, tidak ada `404` aset.
- [ ] **Responsif** di 360, 390, 768, 1024, 1440 px: tidak ada scroll horizontal, teks tidak terpotong (termasuk teks splash "KRENOVA STUDIO" di 360px).
- [ ] **Footer**: tautan, dua nomor WhatsApp (`0859 6015 8194` → `wa.me/6285960158194`, `0895 3260 98189` → `wa.me/62895326098189`), tahun otomatis, tombol "Ke atas".

**Home**
- [ ] Section Layanan: tab bidang, pilih layanan, preview berganti tanpa lonjakan tinggi, tombol WhatsApp membawa nama layanan; accordion di HP.
- [ ] Section Karya hanya tampil bila ada karya unggulan; tile menuju `/projects/[slug]`.

**Projects**
- [ ] Masonry: kartu lama **tidak pindah kolom** saat infinite scroll; jumlah kolom benar per breakpoint; tidak ada kartu ganda (cek `id` duplikat saat memuat halaman berikutnya dengan cepat atau setelah mengganti filter).
- [ ] **Race condition**: ganti filter/pencarian saat request sebelumnya masih berjalan, hasil lama **tidak boleh menimpa** hasil baru (cek `AbortController`/penanda permintaan). Uji dengan throttling jaringan lambat.
- [ ] Filter tersimpan di URL, bisa dibagikan, tombol Back tidak penuh riwayat; `Reset filter` bekerja.
- [ ] Tombol Back dari preview memulihkan daftar dan posisi scroll; cache sessionStorage dibungkus `try/catch` dan kedaluwarsa.
- [ ] State: memuat, kosong, habis, error (matikan jaringan; tombol `Coba lagi` tidak menghapus item yang sudah ada).
- [ ] `IntersectionObserver` dan listener lain dibersihkan saat komponen unmount (tidak ada kebocoran/ganda).
- [ ] Rasio media dari `width`/`height`; karya tanpa dimensi memakai rasio cadangan, tidak merusak layout.

**Preview `/projects/[slug]`**
- [ ] Gambar, video file (kontrol native, tanpa autoplay, `playsInline`, poster), dan YouTube (embed `youtube-nocookie`) tampil benar; media gagal-muat menampilkan pesan.
- [ ] Slug tidak ada atau `is_published = false` → 404.
- [ ] **Suka**: optimistis, konsisten antara kartu dan halaman preview, klik cepat berulang tidak mengacaukan angka, error me-rollback, tidak ada login saat halaman dibuka.
- [ ] **Komentar**: validasi sama dengan database; honeypot; komentar baru muncul di atas; hapus komentar sendiri dengan konfirmasi inline; pesan rate limit tampil; isi dirender sebagai teks (uji payload XSS di 7.3).
- [ ] "Karya lainnya" tidak memuat karya yang sedang dibuka dan tidak memuat draf.
- [ ] Metadata: `generateMetadata` (judul, deskripsi, gambar OG) benar; `params`/`searchParams` ditangani sesuai versi Next (Promise di Next 15+).

**About**
- [ ] Alamat, email (dummy), dua nomor WhatsApp, tautan "Buka di Google Maps" ke tautan pendek yang benar, iframe peta tampil (tidak kosong karena CSP), form: validasi per field, fokus ke error pertama, state kirim/sukses/gagal, isi form tidak hilang saat gagal, `Kirim pesan lain` mengosongkan form.

**Aksesibilitas & performa**
- [ ] Navigasi keyboard menyeluruh; `focus-visible` selalu terlihat; label form; `aria-pressed` pada tombol suka; `aria-live` untuk status; kontras teks AA; target sentuh ≥ 44px; `prefers-reduced-motion` dihormati.
- [ ] Jalankan Lighthouse mobile bila bisa (`npx lighthouse <url> --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --output=json`): target Performance ≥ 85 di `/projects`, Accessibility ≥ 95. Catat CLS (≈ 0), LCP, dan penyebab nilai rendah.
- [ ] Gambar memakai `next/image` dengan `sizes` benar dan `alt` bermakna; tidak ada gambar raksasa tanpa kompresi.

### 7.3 Uji input berbahaya (XSS, injeksi, input aneh)
Kirim lewat UI (komentar dan form feedback), **dengan awalan `__audit__`** dan sesedikit mungkin baris:

```
__audit__ <img src=x onerror=alert(1)>
__audit__ "><script>alert(1)</script>
__audit__ <a href="javascript:alert(1)">klik</a>
__audit__ ' OR 1=1 --
__audit__ {{7*7}} ${7*7}
__audit__ 😀 عربى 日本語 ‮teks-terbalik
__audit__ baris1\nbaris2\n\n\nbaris5   (spasi dan baris kosong berlebihan)
```

Hasil yang benar: ditampilkan **apa adanya sebagai teks** di portfolio **dan** di Web admin; tidak ada dialog muncul; tidak ada elemen tersuntik (cek di DevTools Elements); layout tidak rusak oleh teks panjang tanpa spasi (`break-words`). Uji juga pencarian di `/projects?q=` dengan payload yang sama.
Setelah uji, hapus baris `__audit__` (lewat Web admin atau Dashboard).

---

## 8. Fase 5: Tinjauan `Web admin/`

Aplikasi ini **hanya lokal**, tetapi ia memegang akses tulis ke seluruh data dan menampilkan konten dari pengunjung. Tingkat kehati-hatian harus sama dengan aplikasi publik.

### 8.1 Cara masuk & key (paling penting)
Cari tahu **bagaimana Web admin mengakses Supabase**:

| Pola | Penilaian |
|---|---|
| **A.** Login akun admin (email/password Supabase Auth) memakai **anon key**; hak tulis datang dari policy `is_admin()` | **Benar dan diinginkan.** Verifikasi bagian 8.4. |
| **B.** `service_role` / `sb_secret_` ditaruh di berkas HTML/JS/`config.js` | **Berisiko tinggi.** Key itu **melewati semua RLS** dan siapa pun yang bisa membuka berkas atau halaman itu memegang akses penuh ke database. Dapat diterima **hanya** bila: tidak pernah di-commit, tidak pernah dilayani selain `127.0.0.1`, dan tidak pernah ikut ke Vercel. Tetap rekomendasikan migrasi ke pola A (kerangka admin di database sudah ada: tabel `admins` dan `is_admin()`). Severity: **High** (naik ke **Critical** jika ter-commit/terlayani di jaringan). |
| **C.** Tanpa autentikasi, memakai anon key, mengandalkan "hanya lokal" | **Critical**: aplikasi tidak bisa menulis secara sah (policy admin menolak), atau ada policy yang terlalu longgar. Cari tahu mengapa ia berfungsi. |

Periksa juga:
- [ ] Di mana key disimpan (file apa), apakah file itu ter-track Git, dan apakah repo publik (tanyakan pemilik bila tidak bisa dipastikan lewat `git remote -v`).
- [ ] Sesi admin: penyimpanan token, logout benar-benar menghapus sesi, tidak ada kredensial di URL atau di log.
- [ ] Akun admin: kata sandi kuat, **MFA aktif** (Supabase Auth mendukung MFA; rekomendasikan), hanya satu/dua akun di tabel `admins`.

### 8.2 Menjalankan lokal dengan aman
- [ ] Server statis **hanya mendengarkan `127.0.0.1`**, bukan `0.0.0.0`. Banyak server cepat saji (mis. `python -m http.server`, `npx serve`, `live-server`) **mendengarkan semua antarmuka secara bawaan**, sehingga orang lain di Wi-Fi yang sama bisa membukanya. Periksa perintah yang dipakai; contoh aman: `python3 -m http.server 5500 --bind 127.0.0.1`. Verifikasi dengan `ss -ltnp | grep <port>` (atau `lsof -iTCP -sTCP:LISTEN -P`): alamat harus `127.0.0.1`.
- [ ] Dibuka lewat `http://localhost:<port>`, **bukan** `file://` (sesi, localStorage, dan CORS berperilaku tidak menentu di `file://`).
- [ ] Folder `Web admin/` **tidak ikut** ke deployment Vercel: Root Directory di Vercel = `creative-portfolio`, dan tidak ada tautan/impor dari `creative-portfolio/` ke `Web admin/`. Folder itu tidak berada di `public/` Next.js.
- [ ] Tidak ada tautan ke Web admin di situs publik, tidak ada `robots`/`sitemap` yang menyebutnya.

### 8.3 Keamanan kode Web admin
- [ ] **XSS tersimpan**: semua data dari database (judul, deskripsi, tag, **nama dan isi komentar, nama/email/subjek/pesan feedback**) dirender dengan `textContent` / pengikatan aman, **bukan** `innerHTML` / template string yang dimasukkan ke HTML. Cari `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, atribut `on*=` yang dibangun dari data. Satu payload `<img src=x onerror=...>` di komentar yang dieksekusi di Web admin dapat **mencuri sesi/key admin**; ini **Critical**.
- [ ] URL media dari data (mis. `media_path`) disusun dari konstanta + path yang di-encode; tidak ada URL dari data yang ditempel mentah ke `href`/`src` tanpa validasi skema.
- [ ] Library dari CDN (mis. `supabase-js`) **dipin versinya** dan memakai **Subresource Integrity** (`integrity` + `crossorigin`), atau disalin lokal. Tanpa pin/SRI: **Medium** (supply chain).
- [ ] Ada `Content-Security-Policy` (meta atau header server) yang membatasi `connect-src` ke host Supabase saja dan melarang skrip inline/asing bila memungkinkan.
- [ ] Tidak ada `console.log` yang mencetak token, key, atau isi pesan pengunjung.

### 8.4 Fungsi & integritas data
Periksa kode dan uji bersama pemilik (login admin dilakukan oleh pemilik; kamu tidak memegang password):

**Postingan (karya)**
- [ ] Tambah karya: validasi sisi client sama dengan constraint database (judul 1–120, deskripsi ≤ 2000, `category` ∈ {design, video}, `media_type` ∈ {image, video}, `service_id` dari **daftar yang valid** (dropdown dari daftar layanan, bukan teks bebas), tag huruf kecil).
- [ ] **Unggah file**: batasi tipe (hanya MIME/ekstensi yang diizinkan bucket) dan ukuran (≤ 50 MB sesuai batas bucket) di client **dan** andalkan batas bucket sebagai pagar terakhir; nama file di-normalisasi (huruf kecil, tanda hubung, tanpa spasi, tanpa `..` atau `/` dari input pengguna) agar tidak terjadi *path traversal* atau menimpa file lain.
- [ ] `width`/`height`/`duration_seconds` terisi **otomatis** dari file (bukan input manual yang sering kosong), sehingga masonry di situs publik tidak rusak.
- [ ] **Konsistensi unggah dan simpan**: kalau unggah berhasil tapi `insert` baris gagal (atau sebaliknya), tidak tersisa file yatim atau baris tanpa file; ada penanganan error dan pembersihan.
- [ ] **Edit** karya tidak bisa mengubah `like_count`, `comment_count`, `slug` secara tidak sengaja; ganti media menghapus file lama (atau sengaja mempertahankannya, dicatat).
- [ ] **Hapus** karya: konfirmasi jelas (menghapus **seluruh komentar dan like** terkait lewat cascade) dan menghapus file di Storage; alternatif "sembunyikan" (`is_published = false`) tersedia dan jadi pilihan utama.
- [ ] Draf (`is_published = false`) tidak tampil di situs publik; `is_featured` mengatur Home.
- [ ] Pencegahan klik ganda pada semua aksi tulis; status loading dan error terlihat.

**Moderasi & data lain**
- [ ] Menyembunyikan komentar (`is_hidden = true`) berfungsi, jumlah komentar karya ikut turun, dan komentar hilang dari situs publik.
- [ ] Feedback: daftar, ubah `status` (new/read/replied/archived), hapus; ada penyaringan dan paginasi.
- [ ] **Dashboard/statistik**: angka (total karya, like, komentar, feedback, dll.) cocok dengan hasil query langsung ke database; zona waktu tampil benar (Asia/Jakarta, format `id-ID`); tidak berhenti di 1000 baris karena batas bawaan PostgREST tanpa paginasi.
- [ ] Data dari database yang tidak terduga (null, string kosong, teks sangat panjang) tidak merusak tampilan atau melempar error tak tertangkap.
- [ ] Setiap aksi tulis ke Supabase memeriksa `error` yang dikembalikan (jangan mengabaikan error diam-diam).

### 8.5 Uji bersama pemilik
Minta pemilik melakukan (kamu mengamati kode, respons jaringan, dan hasil di database):
1. Login admin → logout → pastikan halaman data tidak bisa diakses tanpa login.
2. Tambah satu karya uji bertanda `__audit__` (gambar) dan satu video → muncul di situs publik dengan rasio benar → ubah → sembunyikan → hapus → pastikan file di Storage ikut bersih.
3. Lihat komentar uji dari bagian 7.3 di Web admin → pastikan **tidak ada eksekusi skrip** → sembunyikan → hapus.
4. Lihat feedback uji → ubah status → hapus.
5. Tutup server lokal dan pastikan tidak ada proses yang tersisa mendengarkan port.

---

## 9. Fase 6: Uji end-to-end (alur pengguna)

Kalau Playwright/Cypress sudah ada di proyek, pakai. Kalau belum, jalankan manual lewat browser dan catat hasilnya. **Jangan memasang alat uji ke proyek** tanpa persetujuan (boleh via `npx playwright` sementara).

| # | Skenario | Hasil yang benar |
|---|---|---|
| 1 | Pengunjung baru membuka `/` | Splash 3 detik sekali → Home; refresh: tanpa splash |
| 2 | Home → pilih layanan → "Pesan lewat WhatsApp" | WhatsApp terbuka dengan pesan berisi nama layanan |
| 3 | Home → "Lihat karya" | `/projects` termuat dengan grid masonry |
| 4 | `/projects` → filter Video Editing → pilih layanan → cari kata | Daftar sesuai, URL berisi filter, reload mempertahankan filter |
| 5 | Gulir sampai habis | Memuat bertahap, lalu "Itu semua karya untuk saat ini." |
| 6 | Klik karya → suka → kembali (Back) | Like tersimpan; grid kembali ke posisi semula dengan filter yang sama |
| 7 | Preview → komentar → muncul → hapus | Berhasil; hitungan benar; komentar ke-4 dalam 1 menit ditolak ramah |
| 8 | Preview → "Chat via WhatsApp" | Pesan berisi judul karya |
| 9 | Buka `/projects/slug-tidak-ada` | Halaman 404 |
| 10 | `/about` → kirim feedback valid | State sukses; baris tersimpan di `feedback_messages` |
| 11 | `/about` → kirim kosong / email salah | Error per field, fokus ke field pertama yang salah |
| 12 | HP (≤ 767px) → hamburger → pindah halaman | Sidebar kiri menutup otomatis, halaman berganti |
| 13 | Matikan jaringan di `/projects` | State error ramah + `Coba lagi`, tanpa layar putih |
| 14 | Throttling "Slow 3G" | Skeleton tampil, tidak ada layout shift besar |
| 15 | Browser tanpa localStorage/sessionStorage (mode private ketat) | Situs tetap berfungsi, tidak crash |
| 16 | Buka halaman publik dan lihat jumlah akun anonim | Jumlah tidak bertambah hanya karena melihat |

---

## 10. Fase 7: Laporan dan perbaikan

### 10.1 Berkas laporan
Tulis `AUDIT_REPORT.md` di root repo (bukan di dalam `creative-portfolio/public/`, karena **tidak boleh ikut dipublikasikan**; pastikan juga berkas ini tidak berisi secret). Struktur:

```markdown
# Laporan Audit KRENOVA STUDIO — <tanggal>

## 1. Ringkasan eksekutif
- Keputusan rilis: GO / NO-GO (alasan satu kalimat)
- Jumlah temuan per tingkat: Critical X, High X, Medium X, Low X, Info X
- 3 risiko terbesar

## 2. Ruang lingkup & cara uji
- Apa yang diperiksa, versi (Next, React, supabase-js), lingkungan (lokal / staging / produksi)
- **Yang TIDAK bisa diuji** dan alasannya

## 3. Tabel temuan
| ID | Tingkat | Area | Judul | Status |
|----|---------|------|-------|--------|

## 4. Detail temuan
### F-001 — <judul> (Tingkat)
- **Lokasi:** path:baris / tabel / policy
- **Bukti:** perintah/hasil/respons (tanpa secret)
- **Dampak:** apa yang bisa terjadi dan siapa yang bisa melakukannya
- **Perbaikan:** langkah konkret / diff / file SQL di supabase/fixes/
- **Verifikasi:** bagaimana membuktikan sudah beres
- **Status:** terbuka / diperbaiki di branch / menunggu pemilik

## 5. Yang lolos (dengan bukti)
Daftar pemeriksaan yang berhasil, mis. "Matriks RLS 22/22 lolos".

## 6. Tugas manual untuk pemilik (dashboard)
## 7. Data uji yang dibuat dan status pembersihannya
## 8. Rekomendasi pasca-rilis (pemantauan, pencadangan, jadwal audit ulang)
```

### 10.2 Tingkat keparahan

| Tingkat | Definisi di proyek ini |
|---|---|
| **Critical** | Secret admin/`service_role` bocor atau ter-commit; tabel tanpa RLS; pengunjung dapat menulis/menghapus data yang seharusnya hanya admin; XSS tersimpan yang dieksekusi di Web admin; Web admin terbuka ke jaringan tanpa kendali. |
| **High** | Data pribadi (email/pesan feedback) bisa dibaca publik; celah mengubah penghitung/identitas komentar; fungsi `security definer` tanpa `search_path`; kerentanan dependensi yang terbukti terpakai dan dapat dieksploitasi; bug yang menghilangkan data; bucket menerima SVG/HTML dari publik. |
| **Medium** | Tidak ada header keamanan/CSP; tanpa CAPTCHA/rate limit efektif; sign-in anonim terpicu otomatis; penghitung tidak sinkron; race condition; CDN tanpa SRI; remotePatterns terlalu longgar; kebocoran detail error; hambatan aksesibilitas serius. |
| **Low** | Kualitas kode, peringatan lint, UX minor, performa ringan, teks, konsistensi. |
| **Info** | Catatan/saran tanpa risiko langsung. |

**Aturan keputusan rilis:** ada **Critical atau High yang masih terbuka → NO-GO**. Medium boleh rilis hanya dengan persetujuan tertulis pemilik dan jadwal perbaikan.

### 10.3 Cara memperbaiki
1. Urutkan perbaikan dari Critical ke Low.
2. Satu perbaikan = satu commit kecil di branch `audit/<tanggal>`, pesan commit jelas (`fix(security): …`).
3. Setelah tiap perbaikan: ulangi **uji yang membuktikan temuan** (harus gagal sebelum, lolos sesudah), lalu jalankan `npm run lint && npx tsc --noEmit && npm run build`.
4. Perbaikan database: tulis `supabase/fixes/NNN-judul.sql` yang **idempoten** dan berisi komentar penjelasan, serta SQL **uji verifikasi** terpisah. Serahkan ke pemilik; **jangan jalankan sendiri**.
5. Jangan menutup temuan hanya karena "sudah kuubah"; tutup hanya setelah **diverifikasi ulang**.
6. Di akhir, ringkas dalam chat: apa yang diperbaiki, apa yang menunggu pemilik, apa yang tidak bisa diuji. Jangan menyatakan proyek "100% aman".

---

## 11. Tugas manual untuk pemilik (tidak bisa dilakukan AI)

Tempelkan bagian ini ke laporan bagian 6 dan minta pemilik mencentang.

**Supabase Dashboard**
- [ ] Authentication → **Allow anonymous sign-ins** aktif, dan **CAPTCHA protection** (Turnstile/hCaptcha) aktif sebelum live.
- [ ] Authentication → akun admin memakai kata sandi kuat; **MFA** diaktifkan; hanya akun pemilik di tabel `admins`.
- [ ] Authentication → URL Configuration: *Site URL* dan *Redirect URLs* berisi domain produksi saja (tanpa wildcard longgar).
- [ ] **Advisors** (Security & Performance) tidak menampilkan peringatan tingkat tinggi yang belum ditangani.
- [ ] Storage → bucket `project-media`: publik, batas ukuran 50 MB, MIME terbatas, tanpa SVG/HTML.
- [ ] API Settings: hanya schema yang diperlukan yang terekspos.
- [ ] **Secret/service role key tidak pernah dibagikan**; rotasi kalau pernah bocor (Project Settings → API Keys).
- [ ] Pencadangan: pahami kebijakan backup plan yang dipakai; ekspor data penting secara berkala (mis. `pg_dump`/ekspor tabel) karena plan gratis tidak menjamin pemulihan titik waktu.
- [ ] Plan Free: proyek dapat **di-pause setelah tidak aktif sekitar 1 minggu** dan kuota storage/egress terbatas. Putuskan: upgrade, atau jadwalkan ping berkala, dan siapkan state error yang ramah (sudah ada). Cek ulang batas plan di halaman pricing resmi sebelum live.
- [ ] Pantau penggunaan (Usage) dan atur peringatan.

**Vercel**
- [ ] Project Settings → **Root Directory = `creative-portfolio`**.
- [ ] Environment Variables (Production dan Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` terisi; **tanpa** service role; `NEXT_PUBLIC_DATA_MODE` tidak bernilai `dummy` di Production.
- [ ] Domain memakai HTTPS; Preview Deployment diberi proteksi bila tidak ingin diakses umum (mereka memakai Supabase yang sama).
- [ ] Batas penggunaan image optimization dipahami; pertimbangkan pembatasan `remotePatterns`.

**Repo & lokal**
- [ ] Repo di Git hosting: tentukan publik/privat; bila publik, pastikan **nol secret** dan `Web admin/` tidak memuat key.
- [ ] Web admin dijalankan dengan `--bind 127.0.0.1` dan dibuka lewat `http://localhost`.
- [ ] Email asli menggantikan email dummy (`.example`) sebelum live.
- [ ] Media dummy diganti karya asli; tidak ada data dummy di produksi.
- [ ] Hapus akun anonim uji dan baris `__audit__`.

---

## 12. Panduan troubleshooting (gejala → penyebab → diagnosis)

Gunakan saat ada masalah yang dilaporkan atau ditemukan. Selalu mulai dari **mengamati bukti** (konsol browser, tab Network, log build, respons Supabase), bukan menebak.

| Gejala | Penyebab yang umum | Cara mendiagnosis |
|---|---|---|
| Suka/komentar/feedback tidak jalan | Anonymous sign-ins mati; CAPTCHA aktif tanpa token; policy menolak; `.select()` setelah insert di feedback | Network: lihat respons `signInAnonymously` dan `insert`; `42501` = RLS menolak; "Anonymous sign-ins are disabled" = pengaturan Auth |
| `new row violates row-level security policy` | `user_id` tidak cocok `auth.uid()`; sesi belum ada; insert ke tabel yang hanya admin; `.select()` tanpa hak baca | Cek policy `with_check` di query B; pastikan sesi ada sebelum insert |
| `23505` duplicate key | Suka dua kali / slug bentrok | Untuk like: perlakukan sebagai sukses; untuk slug: kosongkan slug agar trigger membuatnya |
| `23514` check constraint | Panjang teks/format di luar batas | Samakan validasi client dengan constraint SQL |
| `P0001` | Pembatas laju komentar/feedback | Tampilkan pesan ramah; tunggu atau pakai sesi lain |
| `PGRST116` | `.single()` menemukan 0 atau banyak baris | Pakai `.maybeSingle()` bila 0 baris wajar |
| `401/403` dari REST | Key salah/kedaluwarsa, sesi habis, RLS | Cek `NEXT_PUBLIC_SUPABASE_*` di lingkungan yang berjalan |
| `429` | Rate limit Supabase Auth/API | Kurangi pemanggilan; periksa loop `useEffect` |
| Grid kosong di produksi | Env tidak terpasang di Vercel (mode `none`); URL/key salah; proyek Supabase ter-pause; semua karya `is_published = false` | Buka Network; periksa env Vercel; buka Dashboard Supabase |
| Grid menampilkan data dummy di produksi | `NEXT_PUBLIC_DATA_MODE=dummy` | Ubah env Production dan redeploy |
| Gambar tidak muncul | `remotePatterns` kurang; bucket tidak publik; path salah/ter-encode; file tidak ada (query L) | Buka URL gambar langsung; baca error `next/image` ("hostname not configured") |
| Video tidak bisa diputar | Codec bukan H.264/AAC; file > 50 MB gagal diunggah; tanpa `playsInline` di iOS | Cek MIME dan ukuran di Storage; tes di Safari iOS |
| Peta kosong | CSP `frame-src` memblokir; ekstensi pemblokir iklan; `X-Frame-Options` | Konsol: "Refused to frame…"; longgarkan hanya `frame-src` yang perlu |
| Peringatan hidrasi (hydration mismatch) | Jumlah kolom masonry, `Date.now()`/`Math.random()` di render, `localStorage` dibaca saat render, flag splash | Baca pesan hidrasi; pindahkan logika browser ke `useEffect`/`useSyncExternalStore` |
| Splash muncul lagi saat refresh | Flag `sessionStorage` tidak diset/terbaca; script flag terlambat | Periksa `data-intro` pada `<html>` dan `sessionStorage` di DevTools |
| Build gagal di Vercel tapi lolos lokal | Huruf besar-kecil nama file; env hilang; versi Node berbeda; Root Directory salah; error TypeScript yang diabaikan lokal | Baca log build Vercel; samakan versi Node (`engines`); bersihkan `.next` dan build ulang |
| Halaman lambat | Terlalu banyak gambar penuh di grid; tanpa `sizes`; blur `backdrop-filter` berlebihan; request beruntun | Lighthouse + tab Performance; kurangi blur, perbaiki `sizes`, pakai thumbnail |
| Angka like/komentar tidak cocok | Trigger tidak ada/rusak; data diubah manual | Query E dan I; perbaiki dengan SQL koreksi yang diserahkan ke pemilik |
| Web admin: tidak bisa menyimpan | Tidak login sebagai admin; akun belum ada di `admins`; RLS admin menolak | Network: `42501`; cek query G |
| Web admin: layar kosong / error CORS | Dibuka via `file://`; skrip CDN gagal; CSP admin terlalu ketat | Jalankan lewat `http://localhost`; cek konsol |
| Web admin menampilkan HTML aneh dari komentar | `innerHTML` memakai data pengunjung | **Critical**: ganti ke `textContent` (bagian 8.3) |

---

## 13. Daftar periksa akhir sebelum publish

- [ ] Tidak ada temuan **Critical/High** yang terbuka (atau pemilik menyetujui secara eksplisit).
- [ ] RLS aktif di semua tabel; matriks uji bagian 6.2 lolos penuh.
- [ ] Tidak ada secret di repo, riwayat Git, bundle client, atau berkas yang dilayani publik.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build`, dan `npm audit --omit=dev` ditinjau dan bersih/dibenarkan.
- [ ] Versi Next.js dan React sudah mencakup perbaikan keamanan resmi terbaru pada jalur versinya.
- [ ] Header keamanan dan CSP aktif dan diuji (peta, YouTube, gambar Supabase, koneksi Supabase tetap jalan).
- [ ] CAPTCHA untuk Anonymous Sign-in aktif.
- [ ] Mode data produksi benar; tidak ada data dummy; email asli terpasang.
- [ ] Web admin: pola login admin (bukan service role di berkas), `127.0.0.1`, tanpa XSS, tidak ikut deploy.
- [ ] Skenario end-to-end bagian 9 lolos di HP dan desktop.
- [ ] Lighthouse mobile memenuhi target; konsol bersih.
- [ ] Data uji `__audit__` dibersihkan; `AUDIT_REPORT.md` lengkap; tidak ada berkas audit yang ikut terpublikasi.

---

## 14. Kalau ada yang tidak jelas

Jangan mengarang. Tanyakan ke pemilik dengan pertanyaan **spesifik dan singkat**, misalnya:
- "Web admin memakai login admin atau key di berkas? Di berkas mana key disimpan?"
- "Apakah repo ini publik di GitHub?"
- "Apakah ada proyek Supabase staging, atau hanya produksi?"
- "Bisa tempelkan hasil query bagian 6.1 (A sampai L) tanpa secret?"

Lalu lanjutkan bagian lain yang tidak bergantung pada jawaban itu, dan catat bagian yang tertahan di laporan.