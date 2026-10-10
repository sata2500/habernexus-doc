import { cache } from "react";
import { findOrCreate } from "@/lib/server/ensure-row";
import { prisma } from "./prisma";
import { appCache } from "./cache";
import type { SiteSettings as SiteSettingsRow } from "./generated/client";

export type SiteSettings = SiteSettingsRow;

export const SITE_SETTINGS_CACHE_KEY = "site-settings";

/** Veritabanına ulaşılamadığında (derleme vb.) kullanılan varsayılanlar */
const DEFAULT_SETTINGS: Omit<SiteSettings, "createdAt" | "updatedAt"> = {
  id: "global",
  siteName: process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus",
  siteTagline: "Yeni Nesil Haber Platformu",
  siteDescription:
    "Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin. Modern, hızlı ve kişiselleştirilmiş haber deneyimi.",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  logoText: "N",
  logoUrl: null,
  faviconUrl: null,
  primaryColorLight: "#6366f1",
  primaryColorDark: "#818cf8",
  bgLight: "#fafbfc",
  bgDark: "#0b0f1a",
  fgLight: "#0f172a",
  fgDark: "#e8ecf4",
  cardLight: "#ffffff",
  cardDark: "#111827",
  cardFgLight: "#0f172a",
  cardFgDark: "#e8ecf4",
  accentLight: "#ea580c",
  accentDark: "#f97316",
  sidebarBgLight: "#ffffff",
  sidebarBgDark: "#0a0a0a",
  sidebarFgLight: "#0f172a",
  sidebarFgDark: "#ffffff",
  keywords: "haber,gündem,son dakika,analiz,Türkiye,dünya,teknoloji,spor",
  socialTwitter: null,
  socialInstagram: null,
  socialYoutube: null,
  socialGithub: null,
  footerCopyright: null,
};

/**
 * Site marka ayarları (tek satır, id="global").
 * - Aynı istekte React cache() ile, istekler arasında uygulama önbelleğiyle (5 dk) tekrar okunmaz.
 * - Önceki sürüm her sayfa isteğinde upsert (yazma işlemi) çalıştırıyordu; artık yalnızca okunur,
 *   kayıt hiç yoksa bir kez oluşturulur. Ayar kaydedilince önbellek temizlenir (admin işlemi).
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await appCache.getOrSet(SITE_SETTINGS_CACHE_KEY, 300, async () =>
      findOrCreate(() => prisma.siteSettings.findUnique({ where: { id: "global" } }), () => prisma.siteSettings.create({ data: { id: "global" } })),
    );
  } catch (e) {
    console.error("getSiteSettings error:", e);
    const now = new Date();
    return { ...DEFAULT_SETTINGS, createdAt: now, updatedAt: now };
  }
});
