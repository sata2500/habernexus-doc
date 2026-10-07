"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { generateSmartPalette, PRESETS, presetToColors, THEME_KEYS, type ThemeKey } from "@/lib/theme";
import { cn } from "@/lib/utils";

const LABELS: Record<ThemeKey, string> = {
  primaryColorLight: "Ana renk", accentLight: "Vurgu", bgLight: "Arka plan", fgLight: "Yazı", cardLight: "Kart", cardFgLight: "Kart yazısı", sidebarBgLight: "Yan menü", sidebarFgLight: "Yan menü yazısı",
  primaryColorDark: "Ana renk", accentDark: "Vurgu", bgDark: "Arka plan", fgDark: "Yazı", cardDark: "Kart", cardFgDark: "Kart yazısı", sidebarBgDark: "Yan menü", sidebarFgDark: "Yan menü yazısı",
};
const LIGHT = THEME_KEYS.filter((k) => !k.endsWith("Dark"));
const DARK = THEME_KEYS.filter((k) => k.endsWith("Dark"));
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Tema renkleri: hazır şablonlar, tek renkten palet üretimi ve tek tek düzenleme */
export function ThemeSection({ colors, onChange }: { colors: Record<ThemeKey, string>; onChange: (next: Partial<Record<ThemeKey, string>>) => void }) {
  const [seed, setSeed] = useState(HEX.test(colors.primaryColorLight) ? colors.primaryColorLight : "#6366f1");

  return (
    <div className="rounded-3xl border border-border p-5 sm:p-6 space-y-6 bg-muted/30">
      <div>
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground mb-1">
          <Sparkles className="h-4 w-4 text-warning" aria-hidden="true" /> Hazır şablonlar
        </h4>
        <p className="text-xs text-muted-foreground">Açık ve koyu tema renklerini tek tıkla uyumlu biçimde değiştirir. Kaydedene kadar yalnızca bu sayfada önizlenir.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {PRESETS.map((preset) => {
          const active = colors.primaryColorLight.toLowerCase() === preset.primaryLight.toLowerCase() && colors.accentLight.toLowerCase() === preset.accentLight.toLowerCase();
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(presetToColors(preset))}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-2.5 p-3 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.98] cursor-pointer focus-ring",
                active ? "border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/20" : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <span className="text-xs font-bold text-foreground leading-none">{preset.name}</span>
              <span className="flex gap-1.5 w-full" aria-hidden="true">
                {[[preset.primaryLight, preset.accentLight, "Açık"], [preset.primaryDark, preset.accentDark, "Koyu"]].map(([a, b, l]) => (
                  <span key={l} className="flex items-center gap-1 bg-muted p-1.5 rounded-xl flex-1 justify-center border border-border/50" title={l}>
                    <span className="h-4 w-4 rounded-full border border-white/60 shadow-sm" style={{ backgroundColor: a }} />
                    <span className="h-4 w-4 rounded-full border border-white/60 shadow-sm" style={{ backgroundColor: b }} />
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border/60 pt-5">
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground mb-1">
          <Wand2 className="h-4 w-4 text-primary-500" aria-hidden="true" /> Tek renkten palet üret
        </h4>
        <p className="text-xs text-muted-foreground mb-4">Bir ana renk seçin; açık ve koyu tema için okunaklı 16 uyumlu renk üretilir.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <input type="color" value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Ana renk seçici" className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value.trim())}
              aria-label="Ana renk kodu"
              aria-invalid={!HEX.test(seed)}
              maxLength={7}
              className="w-28 h-11 rounded-xl border border-border bg-card px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="#6366f1"
            />
          </div>
          <button
            type="button"
            disabled={!HEX.test(seed)}
            onClick={() => onChange(generateSmartPalette(seed))}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Paleti üret ve uygula
          </button>
        </div>
      </div>

      <details className="border-t border-border/60 pt-5 group">
        <summary className="cursor-pointer text-sm font-bold">Renkleri tek tek düzenle</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {([["Açık tema", LIGHT], ["Koyu tema", DARK]] as const).map(([title, keys]) => (
            <fieldset key={title} className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</legend>
              {keys.map((k) => (
                <label key={k} className="flex items-center gap-3 text-sm">
                  <input
                    type="color"
                    value={HEX.test(colors[k]) ? colors[k] : "#000000"}
                    onChange={(e) => onChange({ [k]: e.target.value })}
                    className="h-8 w-10 rounded-lg border border-border bg-card p-0.5 cursor-pointer"
                  />
                  <span className="flex-1">{LABELS[k]}</span>
                  <code className="text-xs text-muted-foreground">{colors[k]}</code>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>
    </div>
  );
}
