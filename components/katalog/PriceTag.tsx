// components/katalog/PriceTag.tsx — Label harga sesuai mode
import { priceLabel } from "@/lib/catalog/format";

interface Props {
  mode: "paid" | "free" | "whatsapp";
  price: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceTag({ mode, price, size = "md", className = "" }: Props) {
  const text = priceLabel(mode, price);
  const sizeClass = size === "lg"
    ? "text-2xl font-display font-bold tabular-nums"
    : size === "sm"
    ? "text-sm font-semibold"
    : "text-base font-semibold tabular-nums";

  const colorClass = mode === "free"
    ? "text-[--text]"
    : mode === "whatsapp"
    ? "text-text-2"
    : "text-text";

  return (
    <span className={`${sizeClass} ${colorClass} ${className}`}>
      {text}
    </span>
  );
}
