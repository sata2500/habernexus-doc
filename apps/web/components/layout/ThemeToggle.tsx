"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const THEMES = [
  { value: "light", icon: Sun, label: "Açık tema", shortLabel: "Açık" },
  { value: "dark", icon: Moon, label: "Koyu tema", shortLabel: "Koyu" },
  { value: "system", icon: Monitor, label: "Sistem teması", shortLabel: "Sistem" },
] as const;

interface ThemeToggleProps {
  /** "icon": tek düğme (navbar), "segmented": üç seçenek yan yana (ayarlar sayfası) */
  variant?: "icon" | "segmented";
}

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) {
    return variant === "segmented"
      ? <div className="h-11 w-full max-w-sm rounded-xl bg-muted animate-shimmer" />
      : <div className="h-10 w-10 rounded-xl bg-muted animate-shimmer" />;
  }

  if (variant === "segmented") {
    const active = theme ?? "system";
    return (
      <div role="radiogroup" aria-label="Tema seçimi" className="grid grid-cols-3 gap-1 p-1 w-full max-w-sm rounded-xl bg-muted border border-border">
        {THEMES.map(({ value, icon: Icon, shortLabel, label }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                "h-9 flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer focus-ring",
                isActive
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {shortLabel}
            </button>
          );
        })}
      </div>
    );
  }

  const currentIndex = THEMES.findIndex((t) => t.value === theme);
  const current = THEMES[currentIndex === -1 ? 2 : currentIndex];
  const next = THEMES[(currentIndex + 1) % THEMES.length];
  const CurrentIcon = current.icon;

  return (
    <button
      type="button"
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
