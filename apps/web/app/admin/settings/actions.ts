"use server";

import { requireRole } from "@/lib/server/authz";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SiteSettingsInputSchema } from "@/lib/validation/schemas";

// Ortak yetki kontrolü (lib/server/authz)
const assertAdmin = () => requireRole("ADMIN");

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
  sidebarBgLight: string;
  sidebarBgDark: string;
  sidebarFgLight: string;
  sidebarFgDark: string;
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

  const parsed = SiteSettingsInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Geçersiz site ayarı.");
  }
  const input = parsed.data;

  const sanitized = {
    siteName: input.siteName?.trim() || "Haber Nexus",
    siteTagline: input.siteTagline?.trim() || null,
    siteDescription: input.siteDescription?.trim() || null,
    siteUrl: input.siteUrl?.trim() || null,
    logoText: input.logoText?.trim()?.charAt(0)?.toUpperCase() || "N",
    logoUrl: input.logoUrl?.trim() || null,
    faviconUrl: input.faviconUrl?.trim() || null,
    primaryColorLight: input.primaryColorLight?.trim() || null,
    primaryColorDark: input.primaryColorDark?.trim() || null,
    bgLight: input.bgLight?.trim() || null,
    bgDark: input.bgDark?.trim() || null,
    fgLight: input.fgLight?.trim() || null,
    fgDark: input.fgDark?.trim() || null,
    cardLight: input.cardLight?.trim() || null,
    cardDark: input.cardDark?.trim() || null,
    cardFgLight: input.cardFgLight?.trim() || null,
    cardFgDark: input.cardFgDark?.trim() || null,
    accentLight: input.accentLight?.trim() || null,
    accentDark: input.accentDark?.trim() || null,
    sidebarBgLight: input.sidebarBgLight?.trim() || null,
    sidebarBgDark: input.sidebarBgDark?.trim() || null,
    sidebarFgLight: input.sidebarFgLight?.trim() || null,
    sidebarFgDark: input.sidebarFgDark?.trim() || null,
    keywords: input.keywords?.trim() || null,
    socialTwitter: input.socialTwitter?.trim() || null,
    socialInstagram: input.socialInstagram?.trim() || null,
    socialYoutube: input.socialYoutube?.trim() || null,
    socialGithub: input.socialGithub?.trim() || null,
    footerCopyright: input.footerCopyright?.trim() || null,
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
