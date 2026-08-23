"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/60 text-[var(--text)] shadow-sm transition duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
    >
      {theme === "dark" ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
    </button>
  );
}
