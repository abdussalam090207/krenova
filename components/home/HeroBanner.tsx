"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BANNERS = [
  { src: "/banner 1.webp", alt: "KRENOVA Studio Banner 1" },
  { src: "/banner 2.webp", alt: "KRENOVA Studio Banner 2" },
  { src: "/banner 3.webp", alt: "KRENOVA Studio Banner 3" },
];

export function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pergantian gambar banner otomatis setiap 5 detik dengan crossfade fade in/out
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="relative w-full aspect-[1080/1410] select-none hero-in wait-intro pointer-events-none"
      style={{ "--i": "3" } as React.CSSProperties}
    >
      {/* Gambar banner murni (tanpa box glass, tanpa crop/object-cover, tanpa dot) */}
      {BANNERS.map((banner, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={banner.src}
            className={[
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex items-center justify-center",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            ].join(" ")}
          >
            <Image
              src={banner.src}
              alt={banner.alt}
              fill
              priority={index === 0}
              sizes="(min-width: 1024px) 480px, (min-width: 768px) 420px, 240px"
              className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
            />
          </div>
        );
      })}
    </div>
  );
}
