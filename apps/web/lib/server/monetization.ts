import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import {
  ADSENSE_PUB_PATTERN,
  GA_ID_PATTERN,
  normalizePlacements,
  type PlacementKey,
  type PublicMonetization,
  type PublicSponsorAd,
} from "@/lib/monetization";

export const MONETIZATION_CACHE_KEY = "monetization-settings";
export const SPONSORS_CACHE_KEY = "sponsor-ads-active";

const OFF: PublicMonetization = {
  gaMeasurementId: null,
  vercelAnalytics: false,
  adsensePublisherId: null,
  placements: normalizePlacements({}),
};

/** Ham ayar satırı (yönetim paneli için) */
export async function getMonetizationRow() {
  return (await prisma.monetizationSettings.findUnique({ where: { id: "global" } }))
    ?? (await prisma.monetizationSettings.create({ data: { id: "global" } }));
}

/**
 * Sitede geçerli olan yapılandırma. Kapalı ya da geçersiz kimlikli özellikler hiç yüklenmez.
 * Hata olursa (tablo yok, veritabanı erişilemez) her şey kapalı kabul edilir.
 */
export const getPublicMonetization = cache(async (): Promise<PublicMonetization> => {
  try {
    return await appCache.getOrSet(MONETIZATION_CACHE_KEY, 300, async () => {
      const row = await getMonetizationRow();
      return {
        gaMeasurementId: row.gaEnabled && row.gaMeasurementId && GA_ID_PATTERN.test(row.gaMeasurementId) ? row.gaMeasurementId : null,
        vercelAnalytics: row.vercelAnalyticsEnabled,
        adsensePublisherId: row.adsenseEnabled && row.adsensePublisherId && ADSENSE_PUB_PATTERN.test(row.adsensePublisherId) ? row.adsensePublisherId : null,
        placements: normalizePlacements(row.placements),
      };
    });
  } catch (e) {
    console.error("getPublicMonetization error:", e);
    return OFF;
  }
});

/** Şu an yayında olan sponsor reklamları, alana göre gruplanmış */
export const getActiveSponsors = cache(async (): Promise<Partial<Record<PlacementKey, PublicSponsorAd[]>>> => {
  try {
    return await appCache.getOrSet(SPONSORS_CACHE_KEY, 120, async () => {
      const now = new Date();
      const rows = await prisma.sponsorAd.findMany({
        where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: { id: true, imageUrl: true, imageUrlMobile: true, altText: true, advertiser: true, weight: true, placements: true },
        take: 100,
      });
      const byPlacement: Partial<Record<PlacementKey, PublicSponsorAd[]>> = {};
      for (const { placements, ...ad } of rows) {
        for (const p of placements as PlacementKey[]) (byPlacement[p] ??= []).push(ad);
      }
      return byPlacement;
    });
  } catch (e) {
    console.error("getActiveSponsors error:", e);
    return {};
  }
});

export async function invalidateMonetization() {
  await Promise.all([appCache.invalidate(MONETIZATION_CACHE_KEY), appCache.invalidate(SPONSORS_CACHE_KEY)]);
}
