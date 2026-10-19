"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

interface Props {
  orderCode: string;
  token: string;
  isPending: boolean;
}

export function OrderBackButton({ orderCode, token, isPending }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function handleBack(e: React.MouseEvent) {
    e.preventDefault();
    if (!isPending) {
      router.push("/katalog");
      return;
    }

    const confirmed = window.confirm(
      "Apakah kamu ingin membatalkan pesanan ini dan kembali ke katalog? Transaksi pembayaran akan dibatalkan.",
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: orderCode, t: token }),
      });
    } catch (err) {
      console.error("[OrderBackButton] Gagal membatalkan pesanan:", err);
    } finally {
      router.push("/katalog");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      disabled={cancelling}
      className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text transition-colors cursor-pointer disabled:opacity-50 group"
    >
      {cancelling ? (
        <Loader2 size={16} className="animate-spin text-blue" />
      ) : (
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      )}
      <span>{cancelling ? "Membatalkan pesanan…" : "Kembali ke Katalog"}</span>
    </button>
  );
}
