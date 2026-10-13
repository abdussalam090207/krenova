-- ═══════════════════════════════════════════════════════════════════════════
-- KRENOVA STUDIO — Perbaikan F-001 & F-002: Migrasi Autentikasi Web Admin
-- File: supabase/fixes/001-web-admin-auth-migration.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Petunjuk untuk Pemilik:
-- 1. Buka Supabase Dashboard → SQL Editor → New Query
-- 2. Jalankan skrip ini untuk membuat tabel admins dan fungsi is_admin().
-- 3. Di Dashboard → Authentication → Users: Buat user admin baru (email & password kuat).
-- 4. Ambil User UID dari dashboard, lalu daftarkan ke tabel admins:
--      INSERT INTO public.admins (user_id, email)
--      VALUES ('<UID-USER-DARI-AUTH>', 'admin@krenovastudio.com');
-- 5. Setelah itu, Web admin dapat menggunakan anon key + signInWithPassword()
--    tanpa memerlukan service_role key lagi di config.js.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tabel admins untuk mencatat UID pengguna yang memiliki hak administrator
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Hanya admin itu sendiri yang bisa melihat barisnya di tabel admins
DROP POLICY IF EXISTS "admins_read_self" ON public.admins;
CREATE POLICY "admins_read_self" ON public.admins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fungsi helper is_admin() yang aman (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

-- 3. Kebijakan RLS untuk tabel projects (Admin dapat CRUD lengkap)
DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
CREATE POLICY "projects_admin_all" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Kebijakan RLS untuk tabel feedback_messages (Admin dapat melihat dan menghapus)
DROP POLICY IF EXISTS "feedback_admin_all" ON public.feedback_messages;
CREATE POLICY "feedback_admin_all" ON public.feedback_messages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Kebijakan RLS untuk tabel project_comments (Admin dapat moderasi/menghapus komentar apa pun)
DROP POLICY IF EXISTS "comments_admin_delete" ON public.project_comments;
CREATE POLICY "comments_admin_delete" ON public.project_comments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 6. Kebijakan RLS Storage (bucket project-media) untuk upload dan delete oleh admin
DROP POLICY IF EXISTS "storage_admin_manage" ON storage.objects;
CREATE POLICY "storage_admin_manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'project-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'project-media' AND public.is_admin());

-- Selesai. Tetap pertahankan policy service_role lama sebagai fallback selama masa transisi.
