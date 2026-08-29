"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateSiteSettings, type SiteSettingsInput } from "../actions";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  Globe,
  Palette,
  Type,
  Hash,
  Link2,
  Link2 as Twitter,
  Link2 as Instagram,
  MonitorPlay as Youtube,
  Link2 as Github,
  CopyCheck,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  Wand2,
} from "lucide-react";

interface ColorPreset {
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

const PRESETS: ColorPreset[] = [
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

function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

function hslToHex(h: number, s: number, l: number): string {
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

function generateSmartPalette(primaryHex: string): Partial<SiteSettingsInput> {
  const { h, s, l } = hexToHsl(primaryHex);

  // Accent: complementary color
  const accentH = (h + 180) % 360;
  const accentS = s;
  const accentL = Math.max(Math.min(l, 60), 45); // Keep it highly visible
  const accentHex = hslToHex(accentH, accentS, accentL);

  // Light Mode Variables
  const bgLight = hslToHex(h, Math.min(s, 10), 98);
  const fgLight = hslToHex(h, Math.min(s, 20), 10);
  const cardLight = "#FFFFFF";
  const cardFgLight = fgLight;
  const sidebarBgLight = hslToHex(h, Math.min(s, 8), 99);
  const sidebarFgLight = fgLight;

  // Dark Mode Variables
  const primaryDarkL = Math.max(l, 60);
  const primaryDarkHex = hslToHex(h, s, primaryDarkL);

  const accentDarkL = Math.max(accentL, 60);
  const accentDarkHex = hslToHex(accentH, accentS, accentDarkL);

  const bgDark = hslToHex(h, Math.min(s, 15), 6);
  const fgDark = hslToHex(h, Math.min(s, 10), 92);
  const cardDark = hslToHex(h, Math.min(s, 12), 11);
  const cardFgDark = fgDark;

  const sidebarBgDark = hslToHex(h, Math.min(s, 15), 4);
  const sidebarFgDark = "#FFFFFF";

  return {
    primaryColorLight: primaryHex,
    primaryColorDark: primaryDarkHex,
    bgLight,
    bgDark,
    fgLight,
    fgDark,
    cardLight,
    cardDark,
    cardFgLight,
    cardFgDark,
    accentLight: accentHex,
    accentDark: accentDarkHex,
    sidebarBgLight,
    sidebarBgDark,
    sidebarFgLight,
    sidebarFgDark,
  };
}

interface SiteSettings {
  siteName: string;
  siteTagline: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  logoText: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColorLight: string | null;
  primaryColorDark: string | null;
  bgLight: string | null;
  bgDark: string | null;
  fgLight: string | null;
  fgDark: string | null;
  cardLight: string | null;
  cardDark: string | null;
  cardFgLight: string | null;
  cardFgDark: string | null;
  accentLight: string | null;
  accentDark: string | null;
  sidebarBgLight: string | null;
  sidebarBgDark: string | null;
  sidebarFgLight: string | null;
  sidebarFgDark: string | null;
  keywords: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialYoutube: string | null;
  socialGithub: string | null;
  footerCopyright: string | null;
}

interface SiteSettingsFormProps {
  initialSettings: SiteSettings;
}

function FieldGroup({ label, icon: Icon, children, hint }: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary-500" />
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <Info className="h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
    />
  );
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState<SiteSettingsInput>({
    siteName: initialSettings.siteName || "Haber Nexus",
    siteTagline: initialSettings.siteTagline || "",
    siteDescription: initialSettings.siteDescription || "",
    siteUrl: initialSettings.siteUrl || "",
    logoText: initialSettings.logoText || "N",
    logoUrl: initialSettings.logoUrl || "",
    faviconUrl: initialSettings.faviconUrl || "",
    primaryColorLight: initialSettings.primaryColorLight || "#6366f1",
    primaryColorDark: initialSettings.primaryColorDark || "#818cf8",
    bgLight: initialSettings.bgLight || "#fafbfc",
    bgDark: initialSettings.bgDark || "#0b0f1a",
    fgLight: initialSettings.fgLight || "#0f172a",
    fgDark: initialSettings.fgDark || "#e8ecf4",
    cardLight: initialSettings.cardLight || "#ffffff",
    cardDark: initialSettings.cardDark || "#111827",
    cardFgLight: initialSettings.cardFgLight || "#0f172a",
    cardFgDark: initialSettings.cardFgDark || "#e8ecf4",
    accentLight: initialSettings.accentLight || "#ea580c",
    accentDark: initialSettings.accentDark || "#f97316",
    sidebarBgLight: initialSettings.sidebarBgLight || "#ffffff",
    sidebarBgDark: initialSettings.sidebarBgDark || "#0a0a0a",
    sidebarFgLight: initialSettings.sidebarFgLight || "#0f172a",
    sidebarFgDark: initialSettings.sidebarFgDark || "#ffffff",
    keywords: initialSettings.keywords || "",
    socialTwitter: initialSettings.socialTwitter || "",
    socialInstagram: initialSettings.socialInstagram || "",
    socialYoutube: initialSettings.socialYoutube || "",
    socialGithub: initialSettings.socialGithub || "",
    footerCopyright: initialSettings.footerCopyright || "",
  });

  const [generatorColor, setGeneratorColor] = useState(form.primaryColorLight || "#6366f1");

  const applyPreset = (preset: ColorPreset) => {
    setForm((prev) => ({
      ...prev,
      primaryColorLight: preset.primaryLight,
      primaryColorDark: preset.primaryDark,
      bgLight: preset.bgLight,
      bgDark: preset.bgDark,
      fgLight: preset.fgLight,
      fgDark: preset.fgDark,
      cardLight: preset.cardLight,
      cardDark: preset.cardDark,
      cardFgLight: preset.cardFgLight,
      cardFgDark: preset.cardFgDark,
      accentLight: preset.accentLight,
      accentDark: preset.accentDark,
      sidebarBgLight: preset.sidebarBgLight,
      sidebarBgDark: preset.sidebarBgDark,
      sidebarFgLight: preset.sidebarFgLight,
      sidebarFgDark: preset.sidebarFgDark,
    }));
    setResult(null);
  };

  const applyGeneratedPalette = (primaryColor: string) => {
    const palette = generateSmartPalette(primaryColor);
    setForm((prev) => ({
      ...prev,
      ...palette,
    }));
    setResult(null);
  };

  // Dynamic live stylesheet preview injection
  const liveThemeStyles = `
    :root {
      ${form.primaryColorLight ? `--color-primary-500: ${form.primaryColorLight} !important;
      --color-primary-600: ${form.primaryColorLight}dd !important;
      --color-primary-400: ${form.primaryColorLight}ee !important;
      --ring: ${form.primaryColorLight} !important;
      --gradient-primary: linear-gradient(135deg, ${form.primaryColorLight}, ${form.primaryColorLight}dd) !important;` : ""}

      ${form.accentLight ? `--color-accent-500: ${form.accentLight} !important;
      --gradient-accent: linear-gradient(135deg, ${form.accentLight}, ${form.accentLight}dd) !important;` : ""}

      ${(form.primaryColorLight && form.accentLight) ? `--text-gradient: linear-gradient(135deg, ${form.primaryColorLight}, ${form.accentLight}) !important;` : ""}

      ${form.bgLight ? `--bg: ${form.bgLight} !important;` : ""}
      ${form.fgLight ? `--fg: ${form.fgLight} !important;` : ""}
      ${form.cardLight ? `--card: ${form.cardLight} !important;
      --surface: ${form.cardLight} !important;` : ""}
      ${form.cardFgLight ? `--card-fg: ${form.cardFgLight} !important;` : ""}
      ${form.sidebarBgLight ? `--sidebar-bg: ${form.sidebarBgLight} !important;` : ""}
      ${form.sidebarFgLight ? `--sidebar-fg: ${form.sidebarFgLight} !important;` : ""}
    }

    [data-theme="dark"] {
      ${form.primaryColorDark ? `--color-primary-500: ${form.primaryColorDark} !important;
      --color-primary-600: ${form.primaryColorDark}dd !important;
      --color-primary-400: ${form.primaryColorDark}ee !important;
      --ring: ${form.primaryColorDark} !important;
      --gradient-primary: linear-gradient(135deg, ${form.primaryColorDark}, ${form.primaryColorDark}dd) !important;` : ""}

      ${form.accentDark ? `--color-accent-500: ${form.accentDark} !important;
      --gradient-accent: linear-gradient(135deg, ${form.accentDark}, ${form.accentDark}dd) !important;` : ""}

      ${(form.primaryColorDark && form.accentDark) ? `--text-gradient: linear-gradient(135deg, ${form.primaryColorDark}, ${form.accentDark}) !important;` : ""}

      ${form.bgDark ? `--bg: ${form.bgDark} !important;` : ""}
      ${form.fgDark ? `--fg: ${form.fgDark} !important;` : ""}
      ${form.cardDark ? `--card: ${form.cardDark} !important;
      --surface: ${form.cardDark} !important;` : ""}
      ${form.cardFgDark ? `--card-fg: ${form.cardFgDark} !important;` : ""}
      ${form.sidebarBgDark ? `--sidebar-bg: ${form.sidebarBgDark} !important;` : ""}
      ${form.sidebarFgDark ? `--sidebar-fg: ${form.sidebarFgDark} !important;` : ""}
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        ${form.primaryColorDark ? `--color-primary-500: ${form.primaryColorDark} !important;
        --color-primary-600: ${form.primaryColorDark}dd !important;
        --color-primary-400: ${form.primaryColorDark}ee !important;
        --ring: ${form.primaryColorDark} !important;
        --gradient-primary: linear-gradient(135deg, ${form.primaryColorDark}, ${form.primaryColorDark}dd) !important;` : ""}

        ${form.accentDark ? `--color-accent-500: ${form.accentDark} !important;
        --gradient-accent: linear-gradient(135deg, ${form.accentDark}, ${form.accentDark}dd) !important;` : ""}

        ${(form.primaryColorDark && form.accentDark) ? `--text-gradient: linear-gradient(135deg, ${form.primaryColorDark}, ${form.accentDark}) !important;` : ""}

        ${form.bgDark ? `--bg: ${form.bgDark} !important;` : ""}
        ${form.fgDark ? `--fg: ${form.fgDark} !important;` : ""}
        ${form.cardDark ? `--card: ${form.cardDark} !important;
        --surface: ${form.cardDark} !important;` : ""}
        ${form.cardFgDark ? `--card-fg: ${form.cardFgDark} !important;` : ""}
        ${form.sidebarBgDark ? `--sidebar-bg: ${form.sidebarBgDark} !important;` : ""}
        ${form.sidebarFgDark ? `--sidebar-fg: ${form.sidebarFgDark} !important;` : ""}
      }
    }
  `;

  const set = (field: keyof SiteSettingsInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      try {
        await updateSiteSettings(form);
        setResult({ success: true, message: "Ayarlar başarıyla kaydedildi! Tüm sayfalar yenilendi." });
      } catch {
        setResult({ success: false, message: "Bir hata oluştu. Lütfen tekrar deneyin." });
      }
    });
  };

  // Live preview logo letter
  const logoLetter = form.logoText?.charAt(0)?.toUpperCase() || "N";
  const previewName = form.siteName || "Site Adı";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Live Style Injection for instant theme preview */}
      <style dangerouslySetInnerHTML={{ __html: liveThemeStyles }} />

      {/* Live Preview */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canlı Önizleme</p>
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            <div className="h-10 w-10 relative rounded-xl overflow-hidden shadow-lg border border-border flex shrink-0">
               <Image src={form.logoUrl} alt="Logo" fill className="object-cover" sizes="40px" unoptimized />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: form.primaryColorLight }}>
              <span className="text-white font-bold text-lg">{logoLetter}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-lg leading-none">{previewName}</p>
            {form.siteTagline && (
              <p className="text-xs text-muted-foreground mt-0.5">{form.siteTagline}</p>
            )}
          </div>
        </div>
        {form.footerCopyright && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {form.footerCopyright}
          </p>
        )}
      </div>

      {/* Temel Bilgiler */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-display flex items-center gap-2 border-b border-border pb-3">
          <Globe className="h-4 w-4 text-primary-500" />
          Temel Platform Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldGroup
            label="Platform Adı"
            icon={Type}
            hint="Navbar, footer ve SEO başlıklarında görünür"
          >
            <TextInput
              value={form.siteName}
              onChange={set("siteName")}
              placeholder="Haber Nexus"
              maxLength={60}
            />
          </FieldGroup>

          <FieldGroup
            label="Slogan"
            icon={Type}
            hint="Footer ve meta açıklamada kullanılır"
          >
            <TextInput
              value={form.siteTagline}
              onChange={set("siteTagline")}
              placeholder="Yeni Nesil Haber Platformu"
              maxLength={100}
            />
          </FieldGroup>

          <FieldGroup
            label="Logo Baş Harfi"
            icon={Type}
            hint="Navbar ve footer'daki logo kutusunda görünür (tek harf)"
          >
            <TextInput
              value={form.logoText}
              onChange={set("logoText")}
              placeholder="N"
              maxLength={1}
            />
          </FieldGroup>

          <FieldGroup
            label="Site URL"
            icon={Link2}
            hint="Canonical URL, OpenGraph ve SEO için"
          >
            <TextInput
              value={form.siteUrl}
              onChange={set("siteUrl")}
              placeholder="https://habernexus.com"
            />
          </FieldGroup>
        </div>

        <FieldGroup
          label="SEO Açıklaması"
          icon={Hash}
          hint="Arama motorlarında ve sosyal medya paylaşımlarında gösterilen açıklama (max 160 karakter önerilir)"
        >
          <TextArea
            value={form.siteDescription}
            onChange={set("siteDescription")}
            placeholder="Platformunuzu tanımlayan kısa ve etkili bir açıklama..."
            rows={3}
          />
        </FieldGroup>

        <FieldGroup
          label="SEO Anahtar Kelimeler"
          icon={Hash}
          hint="Virgülle ayırın: haber,gündem,son dakika"
        >
          <TextInput
            value={form.keywords}
            onChange={set("keywords")}
            placeholder="haber,gündem,son dakika,analiz"
          />
        </FieldGroup>
      </section>

      {/* Sosyal Medya */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-display flex items-center gap-2 border-b border-border pb-3">
          <Link2 className="h-4 w-4 text-primary-500" />
          Sosyal Medya Linkleri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldGroup label="X (Twitter)" icon={Twitter}>
            <TextInput
              value={form.socialTwitter}
              onChange={set("socialTwitter")}
              placeholder="https://twitter.com/kullaniciadiniz"
            />
          </FieldGroup>
          <FieldGroup label="Instagram" icon={Instagram}>
            <TextInput
              value={form.socialInstagram}
              onChange={set("socialInstagram")}
              placeholder="https://instagram.com/kullaniciadiniz"
            />
          </FieldGroup>
          <FieldGroup label="YouTube" icon={Youtube}>
            <TextInput
              value={form.socialYoutube}
              onChange={set("socialYoutube")}
              placeholder="https://youtube.com/@kanaliniz"
            />
          </FieldGroup>
          <FieldGroup label="GitHub" icon={Github}>
            <TextInput
              value={form.socialGithub}
              onChange={set("socialGithub")}
              placeholder="https://github.com/kullaniciadiniz"
            />
          </FieldGroup>
        </div>
      </section>

      {/* Footer */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-display flex items-center gap-2 border-b border-border pb-3">
          <CopyCheck className="h-4 w-4 text-primary-500" />
          Footer Ayarları
        </h3>
        <FieldGroup
          label="Copyright Metni"
          icon={CopyCheck}
          hint="Boş bırakırsanız otomatik oluşturulur: © 2026 [Platform Adı]. Tüm hakları saklıdır."
        >
          <TextInput
            value={form.footerCopyright}
            onChange={set("footerCopyright")}
            placeholder={`© ${new Date().getFullYear()} ${form.siteName || "Platform Adı"}. Tüm hakları saklıdır.`}
          />
        </FieldGroup>
      </section>

      {/* Medya ve Marka Görselleri */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-display flex items-center gap-2 border-b border-border pb-3">
          <Palette className="h-4 w-4 text-primary-500" />
          Medya ve Tema Renkleri
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FieldGroup
            label="Platform Logosu (Resim)"
            icon={Link2}
            hint="Boş bırakırsanız harfli ikon (text) kullanılır. Vercel Blob ile yüklenir."
          >
            <ImageUploader
              value={form.logoUrl}
              onChange={set("logoUrl")}
              type="article"
              aspectRatio="video"
              objectFit="contain"
              className="mt-2"
            />
          </FieldGroup>
          <FieldGroup
            label="Favicon"
            icon={Link2}
            hint="Tarayıcı sekmesinde görünen ikon (Kare). Boş bırakılırsa varsayılan svg kullanılır."
          >
            <ImageUploader
              value={form.faviconUrl}
              onChange={set("faviconUrl")}
              type="profile"
              aspectRatio="video"
              objectFit="contain"
              className="mt-2"
            />
          </FieldGroup>
        </div>

        {/* Hızlı Tema Şablonları & Akıllı Renk Jeneratörü */}
        <div className="glass-strong rounded-3xl border border-border p-6 space-y-6 bg-slate-50/50 dark:bg-neutral-900/50 backdrop-blur-sm">
          <div>
            <h4 className="font-bold text-sm flex items-center gap-2 text-foreground mb-1">
              <Sparkles className="h-4 w-4 text-primary- animate-pulse" />
              Hızlı Tema Şablonları (Presets)
            </h4>
            <p className="text-xs text-muted-foreground">
              Aşağıdaki şablonlardan birini seçerek platformun açık ve koyu tema renklerini tek tıkla uyumlu şekilde değiştirebilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PRESETS.map((preset) => {
              const isActive = form.primaryColorLight === preset.primaryLight && form.accentLight === preset.accentLight;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-start gap-2.5 p-3 rounded-2xl border text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? "border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/20"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xs font-bold text-foreground leading-none">{preset.name}</span>
                  <div className="flex flex-col sm:flex-row gap-1.5 items-center w-full">
                    {/* Light Preview */}
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl w-full justify-center border border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground">L</span>
                      <div className="h-4 w-4 rounded-full border border-white shrink-0 shadow-sm" style={{ backgroundColor: preset.primaryLight }} />
                      <div className="h-4 w-4 rounded-full border border-white shrink-0 shadow-sm" style={{ backgroundColor: preset.accentLight }} />
                    </div>
                    {/* Dark Preview */}
                    <div className="flex items-center gap-1 bg-neutral-200 dark:bg-neutral-950 p-1.5 rounded-xl w-full justify-center border border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground">D</span>
                      <div className="h-4 w-4 rounded-full border border-neutral-800 shrink-0 shadow-sm" style={{ backgroundColor: preset.primaryDark }} />
                      <div className="h-4 w-4 rounded-full border border-neutral-800 shrink-0 shadow-sm" style={{ backgroundColor: preset.accentDark }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/60 pt-5">
            <h4 className="font-bold text-sm flex items-center gap-2 text-foreground mb-1">
              <Wand2 className="h-4 w-4 text-primary-500" />
              Akıllı HSL Renk Paleti Jeneratörü
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Dilediğiniz bir ana renk seçin. Akıllı algoritmamız, bu rengi temel alarak açık ve koyu temalar için okunabilirliği ve kontrastı en yüksek 16 uyumlu rengi otomatik üretecektir.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/60">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="color"
                  value={generatorColor}
                  onChange={(e) => setGeneratorColor(e.target.value)}
                  className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0"
                />
                <input
                  type="text"
                  value={generatorColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("#") && val.length <= 7) {
                      setGeneratorColor(val);
                    }
                  }}
                  className="w-28 h-11 rounded-xl border border-border bg-card px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#6366f1"
                />
              </div>

              <button
                type="button"
                onClick={() => applyGeneratedPalette(generatorColor)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-md shadow-primary-500/10 cursor-pointer"
              >
                <Wand2 className="h-4 w-4" />
                Matematiksel Palet Üret ve Uygula
              </button>
            </div>
          </div>
        </div>


      </section>

      {/* Feedback */}
      {result && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium ${
            result.success
              ? "bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400"
              : "bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {result.message}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
