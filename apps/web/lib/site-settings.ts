import { cache } from "react";
import { prisma } from "./prisma";

/**
 * Platform marka ayarlarını veritabanından çeker.
 * React cache() ile wrap edildiği için aynı request döngüsünde
 * birden fazla çağrı yapıldığında DB'ye tek istek gönderilir.
 *
 * Singleton pattern: DB'de her zaman id="global" olan tek satır bulunur.
 * Kayıt yoksa default değerlerle upsert yapılır.
 */
export const getSiteSettings = cache(async () => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });
    return settings;
  } catch (e) {
    console.error("getSiteSettings error:", e);
    // DB erişimi yoksa (build time vb.) default değerleri döndür
    return {
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
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }
});

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;
