import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Tarihler her zaman Türkiye saatiyle gösterilir (sunucu UTC'de çalışır; sunucu ve tarayıcı çıktısı aynı olur) */
export const SITE_TIME_ZONE = "Europe/Istanbul";

/** "6 Ekim 2026" */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(date));
}

/** "6 Ekim 2026 14:30" */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(date));
}

/**
 * Format relative time (e.g., "5 dakika önce")
 */
export function formatRelativeTime(date: Date | string, options: { compact?: boolean } = {}): string {
  const now = new Date();
  const target = new Date(date);
  // Gelecek tarihler (saat farkı / önbellek) negatif süre göstermesin
  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Az önce";
  if (diffMinutes < 60) return `${diffMinutes} ${options.compact ? "dk" : "dakika"} önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(date);
}

/**
 * Generate a URL-friendly slug from Turkish text
 */
export function slugify(text: string): string {
  const turkishMap: Record<string, string> = {
    ç: "c",
    Ç: "C",
    ğ: "g",
    Ğ: "G",
    ı: "i",
    İ: "I",
    ö: "o",
    Ö: "O",
    ş: "s",
    Ş: "S",
    ü: "u",
    Ü: "U",
  };

  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (match) => turkishMap[match] || match)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate text to a specified length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Format view count (e.g., 1500 → "1.5K")
 */
export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/** Dosya boyutunu okunur biçimde verir (ör. 1536 → "1,5 KB") */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toLocaleString("tr-TR", { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`;
}

/**
 * Tahmini okuma süresi (dakika, en az 1). HTML etiketleri ve Markdown işaretleri kelime sayılmaz;
 * sitedeki tüm "dk okuma" değerleri bu fonksiyondan gelir.
 */
export function readingMinutes(content: string | null | undefined, wordsPerMinute = 200): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, " ").replace(/[#*_`>]/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

/**
 * Get the absolute application URL, handling Vercel environments
 */
export function getAppUrl() {
  // Öncelik 1: Manuel tanımlanmış ve localhost olmayan URL
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  
  // Öncelik 2: Vercel Üretim URL'i
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  
  // Öncelik 3: Vercel Dağıtım URL'i (Preview vb.)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback: Yerel geliştirme
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Generates bulletproof CSS variables for 360-degree card hover borders and glows.
 * Handles missing/null categories and invalid color variables safely.
 */
export function getCardGlowStyles(color?: string | null) {
  const hexColor = color && color.startsWith("#") ? color : "#6366f1";
  return {
    "--art-color": hexColor,
    "--art-glow": `${hexColor}40`,
    "--cat-color": hexColor,
    "--cat-glow": `${hexColor}40`,
  } as React.CSSProperties;
}
