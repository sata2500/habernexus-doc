"use server";

import { actionError, requireRole } from "@/lib/server/authz";
import type { ActionResult } from "@/lib/types";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { appCache } from "@/lib/cache";
import { SITE_SETTINGS_CACHE_KEY } from "@/lib/site-settings";
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

const FIELD_LABELS: Record<string, string> = {
  siteName: "Site adı", siteTagline: "Slogan", siteDescription: "SEO açıklaması", siteUrl: "Site adresi", logoText: "Logo harfi",
  logoUrl: "Logo görseli", faviconUrl: "Site simgesi", keywords: "Anahtar kelimeler", footerCopyright: "Telif metni",
  socialTwitter: "X (Twitter) adresi", socialInstagram: "Instagram adresi", socialYoutube: "YouTube adresi", socialGithub: "GitHub adresi",
};

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
export async function updateSiteSettings(data: Partial<SiteSettingsInput>): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return actionError(err);
  }

  const parsed = SiteSettingsInputSchema.safeParse(data);
  if (!parsed.success) {
    // Hangi alanın hatalı olduğu söylenir (ör. sosyal medya adresi https ile başlamıyor)
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const label = FIELD_LABELS[field] ?? "Bir alan";
    return { success: false, error: `${label} geçersiz. ${/^social|Url$/.test(field) ? "Tam adres yazın (https://…)." : /Light$|Dark$/.test(field) ? "Renk #RRGGBB biçiminde olmalı." : ""}`.trim() };
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

  try {
    await prisma.siteSettings.upsert({
      where: { id: "global" },
      create: { id: "global", ...sanitized },
      update: sanitized,
    });
  } catch (err) {
    return actionError(err, "Ayarlar kaydedilemedi.");
  }

  // Ayar önbelleği ve tüm herkese açık sayfalar yenilenir
  await appCache.invalidate(SITE_SETTINGS_CACHE_KEY);
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { success: true };
}
