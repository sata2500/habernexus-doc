"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
    );
  }

  const themes = [
    { value: "light", icon: Sun, label: "Açık" },
    { value: "dark", icon: Moon, label: "Koyu" },
    { value: "system", icon: Monitor, label: "Sistem" },
  ] as const;

  const currentIndex = themes.findIndex((t) => t.value === theme);
  const next = themes[(currentIndex + 1) % themes.length];

  return (
    <button
      onClick={() => setTheme(next.value)}
      className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted transition-all duration-200",
        "focus-ring cursor-pointer"
      )}
      title={`Tema: ${themes.find((t) => t.value === theme)?.label || "Sistem"}`}
      aria-label="Tema değiştir"
    >
      {theme === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Monitor className="h-5 w-5" />
      )}
    </button>
  );
}
