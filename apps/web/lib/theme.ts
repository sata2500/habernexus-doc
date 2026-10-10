/**
 * Site teması: renk şablonları, ana renkten palet üretimi ve tema CSS'i.
 * Saf fonksiyonlar (sunucu ve tarayıcı ortak): sitedeki tema (DynamicThemeColors) ile
 * yönetim panelindeki canlı önizleme aynı CSS'i kullanır.
 */

export const THEME_KEYS = [
  "primaryColorLight", "primaryColorDark", "accentLight", "accentDark",
  "bgLight", "bgDark", "fgLight", "fgDark", "cardLight", "cardDark", "cardFgLight", "cardFgDark",
  "sidebarBgLight", "sidebarBgDark", "sidebarFgLight", "sidebarFgDark",
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type ThemeColors = Partial<Record<ThemeKey, string | null>>;

export interface ColorPreset {
  name: string;
  primaryLight: string;
  accentLight: string;
  bgLight: string;
  fgLight: string;
  cardLight: string;
  cardFgLight: string;
  sidebarBgLight: string;
  sidebarFgLight: string;
  primaryDark: string;
  accentDark: string;
  bgDark: string;
  fgDark: string;
  cardDark: string;
  cardFgDark: string;
  sidebarBgDark: string;
  sidebarFgDark: string;
}

export const PRESETS: ColorPreset[] = [
  {
    name: "Indigo Classic",
    primaryLight: "#6366f1",
    accentLight: "#ea580c",
    bgLight: "#fafbfc",
    fgLight: "#0f172a",
    cardLight: "#ffffff",
    cardFgLight: "#0f172a",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#0f172a",
    primaryDark: "#818cf8",
    accentDark: "#f97316",
    bgDark: "#0b0f1a",
    fgDark: "#e8ecf4",
    cardDark: "#111827",
    cardFgDark: "#e8ecf4",
    sidebarBgDark: "#0a0a0a",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Ocean Cyan",
    primaryLight: "#06b6d4",
    accentLight: "#8b5cf6",
    bgLight: "#f0fafd",
    fgLight: "#0f172a",
    cardLight: "#ffffff",
    cardFgLight: "#0f172a",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#0f172a",
    primaryDark: "#22d3ee",
    accentDark: "#a78bfa",
    bgDark: "#081521",
    fgDark: "#e0f2fe",
    cardDark: "#0e2238",
    cardFgDark: "#e0f2fe",
    sidebarBgDark: "#050e17",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Emerald Coast",
    primaryLight: "#10b981",
    accentLight: "#f59e0b",
    bgLight: "#f0fdf4",
    fgLight: "#062f22",
    cardLight: "#ffffff",
    cardFgLight: "#062f22",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#062f22",
    primaryDark: "#34d399",
    accentDark: "#fbbf24",
    bgDark: "#061a12",
    fgDark: "#ecfdf5",
    cardDark: "#0c2e20",
    cardFgDark: "#ecfdf5",
    sidebarBgDark: "#030d09",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Crimson Fire",
    primaryLight: "#dc2626",
    accentLight: "#d97706",
    bgLight: "#fef2f2",
    fgLight: "#450a0a",
    cardLight: "#ffffff",
    cardFgLight: "#450a0a",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#450a0a",
    primaryDark: "#f87171",
    accentDark: "#fbbf24",
    bgDark: "#1a0505",
    fgDark: "#fef2f2",
    cardDark: "#2d0d0d",
    cardFgDark: "#fef2f2",
    sidebarBgDark: "#0f0303",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Royal Velvet",
    primaryLight: "#7c3aed",
    accentLight: "#db2777",
    bgLight: "#faf5ff",
    fgLight: "#2e1065",
    cardLight: "#ffffff",
    cardFgLight: "#2e1065",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#2e1065",
    primaryDark: "#a78bfa",
    accentDark: "#f472b6",
    bgDark: "#120924",
    fgDark: "#faf5ff",
    cardDark: "#21123d",
    cardFgDark: "#faf5ff",
    sidebarBgDark: "#0b0417",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Amber Sunset",
    primaryLight: "#d97706",
    accentLight: "#db2777",
    bgLight: "#fffbeb",
    fgLight: "#451a03",
    cardLight: "#ffffff",
    cardFgLight: "#451a03",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#451a03",
    primaryDark: "#fbbf24",
    accentDark: "#f472b6",
    bgDark: "#1a0e05",
    fgDark: "#fffbeb",
    cardDark: "#2e1b0c",
    cardFgDark: "#fffbeb",
    sidebarBgDark: "#0f0803",
    sidebarFgDark: "#ffffff",
  },
  {
    name: "Cyberpunk Neon",
    primaryLight: "#ec4899",
    accentLight: "#06b6d4",
    bgLight: "#fff1f2",
    fgLight: "#4c0519",
    cardLight: "#ffffff",
    cardFgLight: "#4c0519",
    sidebarBgLight: "#ffffff",
    sidebarFgLight: "#4c0519",
    primaryDark: "#f472b6",
    accentDark: "#22d3ee",
    bgDark: "#030303",
    fgDark: "#fdf2f8",
    cardDark: "#0d0d0d",
    cardFgDark: "#fdf2f8",
    sidebarBgDark: "#000000",
    sidebarFgDark: "#ffffff",
  }
];

/** Şablonu ayar alanlarına çevirir */
export function presetToColors(p: ColorPreset): Record<ThemeKey, string> {
  return {
    primaryColorLight: p.primaryLight, primaryColorDark: p.primaryDark, accentLight: p.accentLight, accentDark: p.accentDark,
    bgLight: p.bgLight, bgDark: p.bgDark, fgLight: p.fgLight, fgDark: p.fgDark,
    cardLight: p.cardLight, cardDark: p.cardDark, cardFgLight: p.cardFgLight, cardFgDark: p.cardFgDark,
    sidebarBgLight: p.sidebarBgLight, sidebarBgDark: p.sidebarBgDark, sidebarFgLight: p.sidebarFgLight, sidebarFgDark: p.sidebarFgDark,
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");

  return `#${rHex.toUpperCase()}${gHex.toUpperCase()}${bHex.toUpperCase()}`;
}


/** Tek ana renkten açık ve koyu tema için uyumlu 16 renk üretir */
export function generateSmartPalette(primaryHex: string): Record<ThemeKey, string> {
  const { h, s, l } = hexToHsl(primaryHex);
  const accentH = (h + 180) % 360; // tamamlayıcı renk
  const accentL = Math.max(Math.min(l, 60), 45);
  const accentHex = hslToHex(accentH, s, accentL);
  const fgLight = hslToHex(h, Math.min(s, 20), 10);
  const fgDark = hslToHex(h, Math.min(s, 10), 92);
  return {
    primaryColorLight: primaryHex,
    primaryColorDark: hslToHex(h, s, Math.max(l, 60)),
    accentLight: accentHex,
    accentDark: hslToHex(accentH, s, Math.max(accentL, 60)),
    bgLight: hslToHex(h, Math.min(s, 10), 98),
    fgLight,
    cardLight: "#FFFFFF",
    cardFgLight: fgLight,
    sidebarBgLight: hslToHex(h, Math.min(s, 8), 99),
    sidebarFgLight: fgLight,
    bgDark: hslToHex(h, Math.min(s, 15), 6),
    fgDark,
    cardDark: hslToHex(h, Math.min(s, 12), 11),
    cardFgDark: fgDark,
    sidebarBgDark: hslToHex(h, Math.min(s, 15), 4),
    sidebarFgDark: "#FFFFFF",
  };
}

/** CSS'e yalnızca güvenli renk değerleri girer (stil enjeksiyonu olmasın) */
export function sanitizeCssColor(value: string | null | undefined) {
  if (!value) return undefined;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\([0-9.% ,+\-/]+\)$/.test(v)) return v;
  return undefined;
}

interface Mode {
  primary?: string; accent?: string; bg?: string; fg?: string; card?: string; cardFg?: string; sidebarBg?: string; sidebarFg?: string;
}

/** Tek bir mod (açık/koyu) için CSS değişkenleri */
function modeVars(m: Mode, dark: boolean) {
  const out: string[] = [];
  const add = (k: string, v: string) => out.push(`${k}: ${v} !important;`);
  const tint = dark ? [10, 20, 40, 60, 80] : [5, 10, 25, 45, 70];
  if (m.primary) {
    [50, 100, 200, 300, 400].forEach((step, i) => add(`--color-primary-${step}`, `color-mix(in srgb, ${m.primary} ${tint[i]}%, #ffffff)`));
    add("--color-primary-500", m.primary);
    [[600, 85], [700, 70], [800, 55], [900, 40]].forEach(([step, pct]) => add(`--color-primary-${step}`, `color-mix(in srgb, ${m.primary} ${pct}%, #000000)`));
    add("--ring", m.primary);
    add("--shadow-glow", `0 0 20px color-mix(in srgb, ${m.primary} 15%, transparent)`);
  }
  if (m.accent) {
    add("--color-accent-400", `color-mix(in srgb, ${m.accent} 70%, #ffffff)`);
    add("--color-accent-500", m.accent);
    add("--color-accent-600", `color-mix(in srgb, ${m.accent} 75%, #000000)`);
  }
  if (m.primary) {
    const accent = m.accent || m.primary;
    add("--gradient-hero", `linear-gradient(135deg, color-mix(in srgb, ${m.primary} 12%, transparent), color-mix(in srgb, ${accent} 6%, transparent))`);
    add("--gradient-primary", `linear-gradient(135deg, ${m.primary}, color-mix(in srgb, ${m.primary} ${dark ? 80 : 85}%, #000000))`);
    add("--gradient-accent", `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} ${dark ? 75 : 80}%, #000000))`);
    add("--text-gradient", `linear-gradient(135deg, ${m.primary}, ${accent})`);
  }
  const fgFallback = dark ? "#ffffff" : "#000000";
  if (m.bg) {
    add("--bg", m.bg);
    add("--muted", `color-mix(in srgb, ${m.bg} ${dark ? 90 : 95}%, ${m.fg || fgFallback})`);
    add("--border-color", `color-mix(in srgb, ${m.bg} 92%, ${m.fg || fgFallback})`);
    add("--glass-bg", `color-mix(in srgb, ${m.card || m.bg} ${dark ? 78 : 72}%, transparent)`);
  }
  if (m.fg) {
    add("--fg", m.fg);
    add("--muted-fg", `color-mix(in srgb, ${m.fg} ${dark ? 60 : 68}%, ${m.bg || (dark ? "#0b0f1a" : "#fafbfc")})`); // açık temada okunabilirlik için biraz daha koyu
    add("--glass-border", `color-mix(in srgb, ${m.fg} ${dark ? 6 : 8}%, transparent)`);
  }
  if (m.card) { add("--card", m.card); add("--surface", m.card); }
  if (m.cardFg) add("--card-fg", m.cardFg);
  if (m.sidebarBg) add("--sidebar-bg", m.sidebarBg);
  if (m.sidebarFg) add("--sidebar-fg", m.sidebarFg);
  return out.join("\n  ");
}

/** Tema renklerinden site CSS'i (açık, koyu ve sistem koyu modu) */
export function buildThemeCss(c: ThemeColors) {
  const s = (k: ThemeKey) => sanitizeCssColor(c[k]);
  const light = modeVars({ primary: s("primaryColorLight"), accent: s("accentLight"), bg: s("bgLight"), fg: s("fgLight"), card: s("cardLight"), cardFg: s("cardFgLight"), sidebarBg: s("sidebarBgLight"), sidebarFg: s("sidebarFgLight") }, false);
  const dark = modeVars({ primary: s("primaryColorDark"), accent: s("accentDark"), bg: s("bgDark"), fg: s("fgDark"), card: s("cardDark"), cardFg: s("cardFgDark"), sidebarBg: s("sidebarBgDark"), sidebarFg: s("sidebarFgDark") }, true);
  const parts: string[] = [];
  if (light) parts.push(`:root {\n  ${light}\n}`);
  if (dark) {
    parts.push(`[data-theme="dark"] {\n  ${dark}\n}`);
    parts.push(`@media (prefers-color-scheme: dark) {\n:root:not([data-theme="light"]) {\n  ${dark}\n}\n}`);
  }
  return parts.join("\n");
}
