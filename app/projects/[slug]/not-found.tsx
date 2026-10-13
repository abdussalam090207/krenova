import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="pt-36 pb-20 mx-auto max-w-xl px-5 text-center">
      <h1 className="font-display font-bold text-4xl text-[--text] mb-4">
        Karya tidak ditemukan
      </h1>
      <p className="text-[--text-2] mb-8">
        Karya yang kamu cari tidak tersedia atau belum dipublikasikan.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[--blue] text-white font-semibold text-sm hover:brightness-110 transition-all"
      >
        Lihat semua karya
      </Link>
    </main>
  );
}
