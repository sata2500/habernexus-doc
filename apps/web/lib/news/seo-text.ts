/**
 * Haber SEO'su için saf yardımcılar (test edilebilir, sunucu/istemci bağımsız).
 */
import { slugify } from "@/lib/utils";

export const SEO_TITLE_MAX = 75;
export const META_DESC_MIN = 110;
export const META_DESC_MAX = 160;
const SLUG_MAX = 70;

const clean = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Kelime ortasında kesmeden kısaltır */
function cutAtWord(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.6 ? cut.slice(0, at) : text.slice(0, max)).replace(/[\s,;:–-]+$/, "");
}

/** Arama sonucu başlığı: tek satır, tırnaksız, sonda nokta yok, ~75 karakter */
export function normalizeSeoTitle(title: string, max = SEO_TITLE_MAX) {
  const t = clean(title).replace(/^["'“”«»]+|["'“”«»]+$/g, "").replace(/[.!]+$/, "").trim();
  return cutAtWord(t, max);
}

/** Meta açıklama: 110-160 karakter, cümle sonunda biter; kısa kalırsa gövdeden tamamlanır */
export function normalizeMetaDescription(description: string, fallbackText = "") {
  let d = clean(description);
  if (d.length < META_DESC_MIN && fallbackText) {
    const extra = clean(fallbackText);
    if (extra && !extra.startsWith(d.slice(0, 30))) d = `${d} ${extra}`.trim();
    else if (!d) d = extra;
  }
  if (d.length <= META_DESC_MAX) return d;
  // Son tam cümlede bitir; yoksa kelime sınırında kes ve üç nokta koy
  const window = d.slice(0, META_DESC_MAX);
  const end = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (end >= META_DESC_MIN - 10) return window.slice(0, end + 1);
  return `${cutAtWord(d, META_DESC_MAX - 1)}…`;
}

/** Etiketler: 2-40 karakter, tekrarsız (büyük/küçük harf duyarsız), en fazla 6 */
export function normalizeTags(tags: unknown, max = 6) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const tag = clean(raw).replace(/^#+/, "").replace(/[.,;:!?]+$/, "").trim();
    const slug = slugify(tag);
    if (tag.length < 2 || tag.length > 40 || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** Okunur ve kısa haber adresi: anlamsız kelimeler atılmaz, yalnızca uzunluk kelime sınırında kısaltılır */
export function seoSlug(title: string) {
  const slug = slugify(title).replace(/-{2,}/g, "-");
  if (slug.length <= SLUG_MAX) return slug;
  const cut = slug.slice(0, SLUG_MAX + 1);
  return cut.slice(0, cut.lastIndexOf("-") > 30 ? cut.lastIndexOf("-") : SLUG_MAX).replace(/-+$/, "");
}

/** HTML gövdenin ilk paragrafından düz metin (meta açıklama yedeği) */
export function firstParagraphText(html: string) {
  const p = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? html;
  return clean(p.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'"));
}
