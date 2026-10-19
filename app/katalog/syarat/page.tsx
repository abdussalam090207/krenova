// app/katalog/syarat/page.tsx — Halaman Syarat Katalog (statis)
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat Katalog — KRENOVA STUDIO",
  description: "Syarat penggunaan katalog produk digital KRENOVA STUDIO: lisensi, kebijakan, data pribadi, dan kontak.",
};

export default function SyaratPage() {
  return (
    <main className="min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-2xl mx-auto prose prose-invert prose-sm">
        <h1 className="text-3xl font-display font-bold text-text mb-2">Syarat Katalog</h1>
        <p className="text-text-3 text-sm mb-8">Terakhir diperbarui: Oktober 2026</p>

        <div className="space-y-8 text-text-2 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-text mb-3">1. Produk digital</h2>
            <p>
              Semua produk di katalog ini adalah produk digital (berkas dan/atau tautan). Setelah pembayaran
              dikonfirmasi, produk dapat diakses langsung di halaman pesanan dan dikirim ke email.
              Karena sifatnya digital, tidak ada pengiriman fisik.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-text mb-3">2. Lisensi penggunaan</h2>
            <p>
              Setiap produk memiliki ketentuan lisensi yang tercantum di halaman produknya. Secara umum,
              produk yang dibeli dapat digunakan untuk keperluan pribadi dan komersial sebagaimana disebutkan
              dalam lisensi masing-masing. Dilarang:
            </p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Mendistribusikan ulang, menjual kembali, atau membagikan berkas/link produk kepada pihak lain.</li>
              <li>Mengklaim karya sebagai milik sendiri tanpa modifikasi signifikan.</li>
              <li>Menggunakan untuk tujuan yang melanggar hukum atau merugikan pihak lain.</li>
            </ul>
            <p className="mt-2 text-text-3 italic">
              TODO: Pemilik harap meninjau dan melengkapi ketentuan lisensi ini sebelum go-live.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-text mb-3">3. Kebijakan refund</h2>
            <p>
              Karena produk digital dapat langsung diakses setelah pembayaran, kami umumnya tidak menerima
              pengembalian dana setelah produk diterima. Namun, jika ada masalah teknis (berkas rusak,
              tautan tidak berfungsi), hubungi kami via WhatsApp dengan menyertakan kode pesanan —
              kami akan membantu menyelesaikannya.
            </p>
            <p className="mt-2 text-text-3 italic">
              TODO: Pemilik harap memutuskan dan melengkapi kebijakan refund ini.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-text mb-3">4. Data yang dikumpulkan</h2>
            <p>
              Saat melakukan pembelian atau klaim produk, kami mengumpulkan <strong>nama</strong> dan{" "}
              <strong>alamat email</strong> kamu. Data ini digunakan hanya untuk memproses pesanan dan
              mengirimkan akses produk. Kami tidak menjual atau membagikan data ke pihak ketiga untuk
              tujuan pemasaran.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-text mb-3">5. Keamanan akses</h2>
            <p>
              Link akses pesanan bersifat pribadi dan hanya diberikan kepada pembeli. Jangan membagikan link
              pesanan kepada orang lain. Jika kamu kehilangan link, kamu bisa meminta kirim ulang di halaman{" "}
              <Link href="/katalog/pesanan" className="text-blue hover:underline">Lupa link akses</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-text mb-3">6. Kontak bantuan</h2>
            <p>
              Untuk pertanyaan seputar produk atau pesanan, hubungi kami via WhatsApp:{" "}
              <a
                href="https://wa.me/6285960158194"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:underline"
              >
                wa.me/6285960158194
              </a>
            </p>
          </section>

          <p className="text-xs text-text-3 pt-4 border-t border-white/8">
            Dengan melakukan pembelian atau klaim produk, kamu menyatakan telah membaca dan
            menyetujui syarat-syarat di atas.
          </p>
        </div>
      </div>
    </main>
  );
}
