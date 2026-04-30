"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", icon: Sun, label: "Açık tema" },
  { value: "dark", icon: Moon, label: "Koyu tema" },
  { value: "system", icon: Monitor, label: "Sistem teması" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10 rounded-xl bg-muted animate-shimmer" />;
  }

  const currentIndex = THEMES.findIndex((t) => t.value === theme);
  const current = THEMES[currentIndex === -1 ? 2 : currentIndex];
  const next = THEMES[(currentIndex + 1) % THEMES.length];
  const CurrentIcon = current.icon;

  return (
    <button
      onClick={() => setTheme(next.value)}
      className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted transition-all duration-200",
        "focus-ring cursor-pointer relative overflow-hidden group"
      )}
      title={`${current.label} — Geçmek için tıkla: ${next.label}`}
      aria-label={`Tema: ${current.label}`}
    >
      <CurrentIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
    </button>
  );
}
