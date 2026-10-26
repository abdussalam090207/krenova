// config/catalog.ts — Setelan non-rahasia, mudah diubah pemilik
export const catalogConfig = {
  paymentExpiryMinutes: 30,           // masa berlaku QRIS
  maxDownloadsPerOrder: 30,           // batas unduhan per pesanan (semua file)
  signedUrlSeconds: 900,              // umur signed URL unduhan (15 menit)
  pageSize: 12,                       // item per halaman katalog
  limits: {                           // [maks kejadian, jendela detik]
    checkoutPerIp:    [10, 3600] as [number, number],
    checkoutPerEmail: [5,  3600] as [number, number],
    resendPerEmail:   [3,  3600] as [number, number],
    resendPerIp:      [10, 3600] as [number, number],
    reconcilePerOrder:[1,  5]    as [number, number],
  },
  supportWhatsapp: "6285960158194",   // tombol bantuan; format internasional tanpa +
  sandboxSimulatorHint: true,         // tampilkan petunjuk simulator saat DOKU_IS_PRODUCTION=false
} as const;
