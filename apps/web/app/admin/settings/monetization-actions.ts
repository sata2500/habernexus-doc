"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminOnly, requireRole } from "@/lib/server/authz";
import { getMonetizationRow, invalidateMonetization } from "@/lib/server/monetization";
import {
  ADSENSE_PUB_PATTERN,
  ADSENSE_SLOT_PATTERN,
  GA_ID_PATTERN,
  normalizePlacements,
  PLACEMENT_KEYS,
  PLACEMENT_MODES,
  type PlacementKey,
} from "@/lib/monetization";
import type { ActionResult } from "@/lib/types";
import type { Prisma } from "@/lib/generated/client";

const optionalId = (pattern: RegExp, message: string) =>
  z.string().trim().max(40).transform((v) => v || null).refine((v) => v === null || pattern.test(v), message);

const SettingsSchema = z
  .object({
    gaEnabled: z.boolean(),
    gaMeasurementId: optionalId(GA_ID_PATTERN, "Ölçüm kimliği G-XXXXXXXXXX biçiminde olmalı."),
    vercelAnalyticsEnabled: z.boolean(),
    adsenseEnabled: z.boolean(),
    adsensePublisherId: optionalId(ADSENSE_PUB_PATTERN, "Yayıncı kimliği ca-pub-1234567890123456 biçiminde olmalı."),
    adsTxtExtra: z.string().max(5000, "ads.txt ek satırları çok uzun.").transform((v) => v.trim() || null),
    placements: z.record(
      z.string(),
      z.object({
        mode: z.enum(PLACEMENT_MODES),
        adsenseSlot: z.string().trim().max(20).optional()
          .refine((v) => !v || ADSENSE_SLOT_PATTERN.test(v), "Reklam birimi kimliği yalnızca rakamlardan oluşmalı."),
      }),
    ),
  })
  .refine((s) => !s.gaEnabled || s.gaMeasurementId, { message: "Google Analytics'i açmak için ölçüm kimliğini girin.", path: ["gaMeasurementId"] })
  .refine((s) => !s.adsenseEnabled || s.adsensePublisherId, { message: "AdSense'i açmak için yayıncı kimliğini girin.", path: ["adsensePublisherId"] });

export type MonetizationSettingsInput = z.input<typeof SettingsSchema>;

/** Sitedeki tüm sayfalar reklam/betik ayarını yeniden okusun */
async function refreshSite() {
  await invalidateMonetization();
  revalidatePath("/", "layout");
  revalidatePath("/ads.txt");
}

export async function getMonetizationOverview() {
  await requireRole("ADMIN");
  const [row, sponsors] = await Promise.all([
    getMonetizationRow(),
    prisma.sponsorAd.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }], take: 200 }),
  ]);
  return {
    settings: {
      gaEnabled: row.gaEnabled,
      gaMeasurementId: row.gaMeasurementId ?? "",
      vercelAnalyticsEnabled: row.vercelAnalyticsEnabled,
      adsenseEnabled: row.adsenseEnabled,
      adsensePublisherId: row.adsensePublisherId ?? "",
      adsTxtExtra: row.adsTxtExtra ?? "",
      placements: normalizePlacements(row.placements),
    },
    sponsors,
    // Yalnızca tanımlı olup olmadıkları; değerler istemciye gönderilmez
    sentryConfigured: !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
    onVercel: !!process.env.VERCEL,
  };
}

export async function updateMonetizationSettings(input: MonetizationSettingsInput): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz ayar." };
  const { placements, ...rest } = parsed.data;
  // Yalnızca bilinen alanlar kaydedilir
  const clean = JSON.parse(JSON.stringify(normalizePlacements(Object.fromEntries(PLACEMENT_KEYS.map((k) => [k, placements[k] ?? { mode: "off" }]))))) as Prisma.InputJsonObject;
  try {
    await prisma.monetizationSettings.upsert({
      where: { id: "global" },
      create: { id: "global", ...rest, placements: clean },
      update: { ...rest, placements: clean },
    });
    await refreshSite();
    return { success: true };
  } catch (error) {
    console.error("Monetization settings error:", error);
    return { success: false, error: "Ayarlar kaydedilemedi." };
  }
}

const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional()
  .transform((v) => (v ? new Date(v) : null));
const webUrl = (message: string) => z.string().trim().max(1000).url(message).refine((v) => /^https?:\/\//i.test(v), message);

const SponsorSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Reklama bir ad verin.").max(120),
    advertiser: z.string().trim().max(80).transform((v) => v || null),
    imageUrl: webUrl("Bir görsel yükleyin."),
    imageUrlMobile: z.union([webUrl("Telefon görseli geçersiz."), z.literal("")]).transform((v) => v || null),
    linkUrl: webUrl("Bağlantı https:// ile başlayan tam bir adres olmalı."),
    altText: z.string().trim().min(3, "Görsel açıklaması (alternatif metin) girin.").max(200),
    placements: z.array(z.enum(PLACEMENT_KEYS as [PlacementKey, ...PlacementKey[]])).min(1, "En az bir reklam alanı seçin."),
    isActive: z.boolean(),
    startsAt: optionalDate,
    endsAt: optionalDate,
    weight: z.number().int().min(1).max(100),
  })
  .refine((s) => !s.startsAt || !s.endsAt || s.startsAt < s.endsAt, { message: "Bitiş zamanı başlangıçtan sonra olmalı.", path: ["endsAt"] });

export type SponsorInput = z.input<typeof SponsorSchema>;

export async function saveSponsorAd(input: SponsorInput): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = SponsorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  const { id, startsAt, ...data } = parsed.data;
  try {
    if (id) {
      await prisma.sponsorAd.update({ where: { id }, data: { ...data, ...(startsAt && { startsAt }) } });
    } else {
      await prisma.sponsorAd.create({ data: { ...data, startsAt: startsAt ?? new Date() } });
    }
    await invalidateMonetization();
    return { success: true };
  } catch (error) {
    console.error("Sponsor save error:", error);
    return { success: false, error: "Reklam kaydedilemedi." };
  }
}

export async function setSponsorActive(id: string, isActive: boolean): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  if (typeof id !== "string" || typeof isActive !== "boolean") return { success: false, error: "Geçersiz istek." };
  await prisma.sponsorAd.updateMany({ where: { id }, data: { isActive } });
  await invalidateMonetization();
  return { success: true };
}

export async function deleteSponsorAd(id: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  if (typeof id !== "string") return { success: false, error: "Geçersiz istek." };
  await prisma.sponsorAd.deleteMany({ where: { id } });
  await invalidateMonetization();
  return { success: true };
}
