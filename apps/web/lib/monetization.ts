/**
 * Reklam alanları ve ölçüm ayarları için ortak tanımlar (sunucu ve tarayıcıda kullanılır).
 */

export type PlacementFormat = "banner" | "box";

export const PLACEMENTS = {
  home_top: { label: "Ana sayfa · manşet altı", format: "banner" },
  home_sidebar: { label: "Ana sayfa · trend haberlerin altı", format: "box" },
  home_feed: { label: "Ana sayfa · son haberlerin üstü", format: "banner" },
  article_content: { label: "Haber · metnin sonu", format: "banner" },
  article_bottom: { label: "Haber · yorumların üstü", format: "banner" },
  category_top: { label: "Kategori · liste üstü", format: "banner" },
} as const satisfies Record<string, { label: string; format: PlacementFormat }>;

export type PlacementKey = keyof typeof PLACEMENTS;
export const PLACEMENT_KEYS = Object.keys(PLACEMENTS) as PlacementKey[];

/** Önerilen sponsor görsel boyutları (admin formunda gösterilir) */
export const FORMAT_SIZES: Record<PlacementFormat, { desktop: string; mobile?: string }> = {
  banner: { desktop: "970 × 250 (en az 728 × 90)", mobile: "640 × 200" },
  box: { desktop: "600 × 500 (300 × 250'nin iki katı)" },
};

/**
 * off: alan kapalı · sponsor: yalnızca sponsor reklamı · adsense: yalnızca AdSense ·
 * auto: o an yayında bir sponsor varsa sponsor, yoksa AdSense
 */
export const PLACEMENT_MODES = ["off", "sponsor", "adsense", "auto"] as const;
export type PlacementMode = (typeof PLACEMENT_MODES)[number];

export interface PlacementConfig {
  mode: PlacementMode;
  /** AdSense reklam birimi kimliği (data-ad-slot); yoksa otomatik boyutlu birim kullanılmaz */
  adsenseSlot?: string;
}

export type PlacementMap = Record<PlacementKey, PlacementConfig>;

export const GA_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/;
export const ADSENSE_PUB_PATTERN = /^ca-pub-\d{10,20}$/;
export const ADSENSE_SLOT_PATTERN = /^\d{6,20}$/;

/** Veritabanındaki serbest JSON'u güvenli, eksiksiz bir alan haritasına çevirir */
export function normalizePlacements(raw: unknown): PlacementMap {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as PlacementMap;
  for (const key of PLACEMENT_KEYS) {
    const v = src[key] && typeof src[key] === "object" ? (src[key] as Record<string, unknown>) : {};
    const mode = PLACEMENT_MODES.includes(v.mode as PlacementMode) ? (v.mode as PlacementMode) : "off";
    const slot = typeof v.adsenseSlot === "string" && ADSENSE_SLOT_PATTERN.test(v.adsenseSlot) ? v.adsenseSlot : undefined;
    out[key] = slot ? { mode, adsenseSlot: slot } : { mode };
  }
  return out;
}

/** Sitede kullanılan, herkese açık yapılandırma (layout'tan istemciye aktarılır) */
export interface PublicMonetization {
  gaMeasurementId: string | null;
  vercelAnalytics: boolean;
  adsensePublisherId: string | null;
  placements: PlacementMap;
}

/** Tarayıcıya giden sponsor reklamı (sayaçlar ve iç alanlar yok) */
export interface PublicSponsorAd {
  id: string;
  imageUrl: string;
  imageUrlMobile: string | null;
  altText: string;
  advertiser: string | null;
  weight: number;
}

/** Ağırlığa göre rastgele seçim (r: 0 ≤ r < 1) */
export function pickWeighted<T extends { weight: number }>(items: T[], r: number): T | null {
  const total = items.reduce((s, i) => s + Math.max(1, i.weight), 0);
  if (!items.length || total <= 0) return null;
  let x = r * total;
  for (const item of items) {
    x -= Math.max(1, item.weight);
    if (x < 0) return item;
  }
  return items[items.length - 1];
}
