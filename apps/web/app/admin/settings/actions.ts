"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function assertAdmin() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Yetkisiz işlem. Sadece adminler bu aksiyonu gerçekleştirebilir.");
  }
  return session;
}

export interface SiteSettingsInput {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  siteUrl: string;
  logoText: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColorLight: string;
  primaryColorDark: string;
  bgLight: string;
  bgDark: string;
  fgLight: string;
  fgDark: string;
  cardLight: string;
  cardDark: string;
  cardFgLight: string;
  cardFgDark: string;
  accentLight: string;
  accentDark: string;
  keywords: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
  socialGithub: string;
  footerCopyright: string;
}

/** Mevcut site ayarlarını getirir */
export async function getAdminSiteSettings() {
  await assertAdmin();
  const settings = await prisma.siteSettings.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });
  return settings;
}

/** Site ayarlarını günceller */
export async function updateSiteSettings(data: Partial<SiteSettingsInput>) {
  await assertAdmin();

  const sanitized = {
    siteName: data.siteName?.trim() || "Haber Nexus",
    siteTagline: data.siteTagline?.trim() || null,
    siteDescription: data.siteDescription?.trim() || null,
    siteUrl: data.siteUrl?.trim() || null,
    logoText: data.logoText?.trim()?.charAt(0)?.toUpperCase() || "N",
    logoUrl: data.logoUrl?.trim() || null,
    faviconUrl: data.faviconUrl?.trim() || null,
    primaryColorLight: data.primaryColorLight?.trim() || null,
    primaryColorDark: data.primaryColorDark?.trim() || null,
    bgLight: data.bgLight?.trim() || null,
    bgDark: data.bgDark?.trim() || null,
    fgLight: data.fgLight?.trim() || null,
    fgDark: data.fgDark?.trim() || null,
    cardLight: data.cardLight?.trim() || null,
    cardDark: data.cardDark?.trim() || null,
    cardFgLight: data.cardFgLight?.trim() || null,
    cardFgDark: data.cardFgDark?.trim() || null,
    accentLight: data.accentLight?.trim() || null,
    accentDark: data.accentDark?.trim() || null,
    keywords: data.keywords?.trim() || null,
    socialTwitter: data.socialTwitter?.trim() || null,
    socialInstagram: data.socialInstagram?.trim() || null,
    socialYoutube: data.socialYoutube?.trim() || null,
    socialGithub: data.socialGithub?.trim() || null,
    footerCopyright: data.footerCopyright?.trim() || null,
  };

  await prisma.siteSettings.upsert({
    where: { id: "global" },
    create: { id: "global", ...sanitized },
    update: sanitized,
  });

  // Tüm public sayfaları yeniden validate et
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { success: true };
}
