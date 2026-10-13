"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "segmented";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme, setTheme, mounted } = useTheme();

  // Mode sebelum mount (SSR fallback) anggap dark mode agar tidak layout shift
  const currentTheme = mounted ? theme : "dark";

  if (variant === "segmented") {
    return (
      <div
        className={`flex items-center p-1 rounded-2xl glass glass-strong w-full ${className}`}
        role="group"
        aria-label="Pilih tema tampilan"
      >
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={currentTheme === "dark"}
          className={[
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
            currentTheme === "dark"
              ? "glass bg-white/10 text-[--text] shadow-sm"
              : "text-[--text-3] hover:text-[--text] hover:bg-black/5 dark:hover:bg-white/5",
          ].join(" ")}
        >
          <Moon size={15} strokeWidth={1.8} className={currentTheme === "dark" ? "text-white-300" : ""} />
          <span>Gelap</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={currentTheme === "light"}
          className={[
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
            currentTheme === "light"
              ? "glass bg-white/80 dark:bg-white/10 text-[--text] shadow-sm"
              : "text-[--text-3] hover:text-[--text] hover:bg-black/5 dark:hover:bg-white/5",
          ].join(" ")}
        >
          <Sun size={15} strokeWidth={1.8} className={currentTheme === "light" ? "text-black-400" : ""} />
          <span>Terang</span>
        </button>
      </div>
    );
  }

  // Variant "icon" untuk Desktop Header
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={currentTheme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={currentTheme === "dark" ? "Mode Terang" : "Mode Gelap"}
      className={[
        "relative flex items-center justify-center w-10 h-10 rounded-full glass glass-strong glass-sheen",
        "text-[--text] hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm group",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--aqua] cursor-pointer select-none",
        className,
      ].join(" ")}
    >
      {currentTheme === "dark" ? (
        <Sun
          size={18}
          strokeWidth={1.8}
          className="text-white transition-transform duration-300 group-hover:rotate-45"
        />
      ) : (
        <Moon
          size={18}
          strokeWidth={1.8}
          className="text-black transition-transform duration-300 group-hover:-rotate-12"
        />
      )}
    </button>
  );
}
