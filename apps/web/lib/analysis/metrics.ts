/**
 * Haber analizinin ölçülebilir kısmı: SEO kontrolleri, Türkçe okunabilirlik ve metin örtüşmesi.
 * Saf fonksiyonlardır (ağ/veritabanı yok); sunucuda analizde, tarayıcıda editördeki canlı
 * kontrol listesinde aynı kurallar kullanılır. Aynı metin her zaman aynı puanı alır.
 */
import { keyTokens, normalize } from "@/lib/news/text";

/* ── Metin çıkarma ─────────────────────────────────────── */

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** HTML (ya da Markdown) gövdeden paragraf/başlık bloklarını düz metin olarak çıkarır */
export function contentBlocks(html: string) {
  const isHtml = /<\/?(p|h[1-6]|li|div|br)\b/i.test(html);
  const blocks: { tag: string; text: string }[] = [];
  if (isHtml) {
    for (const m of html.matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = decode(m[2].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
      if (text) blocks.push({ tag: m[1].toLowerCase(), text });
    }
  } else {
    for (const raw of html.split(/\n{2,}|\n(?=#|[-*] )/)) {
      const line = raw.trim();
      if (!line) continue;
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) blocks.push({ tag: `h${h[1].length}`, text: h[2].replace(/[*_`]/g, "").trim() });
      else if (/^[-*] /.test(line)) blocks.push({ tag: "li", text: line.replace(/^[-*] /, "").replace(/[*_`]/g, "").trim() });
      else blocks.push({ tag: "p", text: line.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim() });
    }
  }
  return blocks;
}

export function plainText(html: string) {
  return contentBlocks(html).map((b) => b.text).join("\n");
}

/* ── İstatistikler ve okunabilirlik ────────────────────── */

const VOWELS = /[aeıioöuüâîûAEIİOÖUÜÂÎÛ]/g;
const LONG_SENTENCE_WORDS = 25;
const LONG_PARAGRAPH_WORDS = 90;

export interface TextStats {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceWords: number;
  longSentences: number;
  longParagraphs: number;
  h1: number;
  h2: number;
  h3: number;
  listItems: number;
  internalLinks: number;
  externalLinks: number;
  readingMinutes: number;
  /** Ateşman okunabilirlik indeksi (Türkçe; 0-100, yüksek = kolay) */
  atesman: number;
}

const wordsOf = (s: string) => s.split(/\s+/).filter((w) => /\p{L}|\d/u.test(w));

export function textStats(html: string): TextStats {
  const blocks = contentBlocks(html);
  const paras = blocks.filter((b) => b.tag === "p" || b.tag === "blockquote");
  const bodyBlocks = blocks.filter((b) => !/^h\d$/.test(b.tag));
  const bodyText = bodyBlocks.map((b) => b.text).join(" ");
  // Her paragraf/madde en az bir cümledir (noktasız liste maddeleri tek dev cümle sayılmasın)
  const sentences = bodyBlocks.flatMap((b) =>
    b.text.split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ0-9"“'(])/).map((s) => s.trim()).filter((s) => wordsOf(s).length > 0),
  );
  const words = wordsOf(bodyText);
  const syllables = words.reduce((n, w) => n + Math.max(1, (w.match(VOWELS) ?? []).length), 0);
  const wc = words.length;
  const sc = Math.max(1, sentences.length);
  const atesman = wc ? 198.825 - 40.175 * (syllables / wc) - 2.61 * (wc / sc) : 0;
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith("/") || /habernexus\.com/i.test(h)).length;
  return {
    words: wc,
    sentences: sentences.length,
    paragraphs: paras.length,
    avgSentenceWords: Math.round((wc / sc) * 10) / 10,
    longSentences: sentences.filter((s) => wordsOf(s).length > LONG_SENTENCE_WORDS).length,
    longParagraphs: paras.filter((p) => wordsOf(p.text).length > LONG_PARAGRAPH_WORDS).length,
    h1: blocks.filter((b) => b.tag === "h1").length,
    h2: blocks.filter((b) => b.tag === "h2").length,
    h3: blocks.filter((b) => b.tag === "h3").length,
    listItems: blocks.filter((b) => b.tag === "li").length,
    internalLinks: internal,
    externalLinks: links.length - internal,
    readingMinutes: Math.max(1, Math.round(wc / 200)),
    atesman: Math.round(Math.max(0, Math.min(100, atesman))),
  };
}

const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

export function atesmanLevel(score: number) {
  if (score >= 90) return "Çok kolay";
  if (score >= 70) return "Kolay";
  if (score >= 50) return "Orta güçlükte";
  if (score >= 30) return "Zor";
  return "Çok zor";
}

/**
 * Okunabilirlik puanı: Ateşman indeksi (%70) + yapı (%30: uzun cümle/paragraf oranı).
 * Türkçe haber metinleri çok heceli kelimeler nedeniyle doğal olarak 35-50 aralığında çıkar;
 * ölçek buna göre ayarlıdır: Ateşman 47+ → 100, 40 → 85, 30 → 65, 20 → 45.
 */
export function readabilityScore(s: TextStats) {
  if (s.words === 0) return 0;
  const lexical = clamp(25 + (s.atesman - 10) * 2);
  const longPct = s.sentences ? (s.longSentences / s.sentences) * 100 : 0;
  const structure = clamp(
    100
      - Math.max(0, longPct - 15) * 2
      - Math.min(40, s.longParagraphs * 10)
      - Math.max(0, s.avgSentenceWords - 20) * 3,
  );
  return clamp(lexical * 0.7 + structure * 0.3);
}

/* ── SEO kontrolleri ───────────────────────────────────── */

export type CheckStatus = "pass" | "warn" | "fail";
export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Başarısızsa yapılacak iş (öneri listesinde kullanılır) */
  fix?: string;
  weight: number;
}

export interface SeoInput {
  title: string;
  content: string;
  excerpt?: string | null;
  slug?: string | null;
  coverImage?: string | null;
  tags?: string[];
  focusKeyword?: string | null;
}

/** Odak ifade yoksa: ilk etiket, o da yoksa başlığın ilk iki anlamlı kelimesi */
export function fallbackFocusKeyword(title: string, tags: string[] = []) {
  if (tags[0]) return tags[0];
  return title.split(/\s+/).filter((w) => keyTokens(w).length > 0).slice(0, 2).join(" ") || null;
}

/** Odak ifadenin tüm anlamlı kelimeleri (ek farkları önemsiz) metinde geçiyor mu? */
export function containsKeyword(text: string, keyword: string) {
  const need = keyTokens(keyword);
  if (need.length === 0) return false;
  const have = new Set(keyTokens(text));
  return need.every((t) => have.has(t));
}

export function seoChecks(input: SeoInput, stats = textStats(input.content)): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const add = (c: SeoCheck) => checks.push(c);
  const title = input.title.trim();
  const excerpt = (input.excerpt ?? "").trim();
  const blocks = contentBlocks(input.content);
  const firstPara = blocks.find((b) => b.tag === "p")?.text ?? "";
  const headings = blocks.filter((b) => /^h[23]$/.test(b.tag)).map((b) => b.text).join(" ");
  const keyword = input.focusKeyword?.trim() || fallbackFocusKeyword(title, input.tags);
  const tl = title.length;

  add({
    id: "title-length", label: "Başlık uzunluğu", weight: 10,
    status: tl >= 40 && tl <= 70 ? "pass" : tl >= 30 && tl <= 80 ? "warn" : "fail",
    detail: `${tl} karakter (ideal 40-70)`,
    fix: tl < 40 ? "Başlığı somut bilgiyle (kim, ne, rakam) 40-70 karaktere uzatın." : "Başlığı 70 karakterin altına indirin; Google uzun başlıkları keser.",
  });

  const el = excerpt.length;
  add({
    id: "meta-description", label: "Spot / meta açıklama", weight: 10,
    status: el >= 110 && el <= 160 ? "pass" : el >= 70 && el <= 200 ? "warn" : "fail",
    detail: el ? `${el} karakter (ideal 110-160)` : "Spot yok",
    fix: el === 0 ? "Haberin özünü anlatan 110-160 karakterlik bir spot yazın; Google arama sonucunda bunu gösterir." : el < 110 ? "Spotu 110-160 karaktere tamamlayın." : "Spotu 160 karakterin altına kısaltın.",
  });

  if (keyword) {
    add({
      id: "keyword-title", label: "Odak ifade başlıkta", weight: 10,
      status: containsKeyword(title, keyword) ? "pass" : "fail",
      detail: `"${keyword}"`,
      fix: `Okurun arayacağı "${keyword}" ifadesini başlıkta, mümkünse başa yakın kullanın.`,
    });
    add({
      id: "keyword-intro", label: "Odak ifade ilk paragrafta", weight: 10,
      status: containsKeyword(firstPara, keyword) ? "pass" : "fail",
      detail: firstPara ? "Giriş paragrafı kontrol edildi" : "Giriş paragrafı yok",
      fix: `Giriş paragrafında "${keyword}" ifadesini doğal biçimde geçirin.`,
    });
    add({
      id: "keyword-heading", label: "Odak ifade bir ara başlıkta", weight: 5,
      status: !headings ? "fail" : containsKeyword(headings, keyword) ? "pass" : "warn",
      detail: headings ? "Ara başlıklar kontrol edildi" : "Ara başlık yok",
      fix: `Ara başlıklardan birinde "${keyword}" ya da yakın bir ifade kullanın.`,
    });
  }

  add({
    id: "word-count", label: "Metin uzunluğu", weight: 15,
    status: stats.words >= 400 ? "pass" : stats.words >= 250 ? "warn" : "fail",
    detail: `${stats.words} kelime (en az 400 önerilir)`,
    fix: "Arka plan, rakamlar ve olası etkiler gibi bilgilerle metni en az 400 kelimeye çıkarın; kısa haberler zayıf içerik sayılabilir.",
  });

  add({
    id: "headings", label: "Ara başlık yapısı", weight: 10,
    status: stats.h2 >= 2 ? "pass" : stats.h2 + stats.h3 >= 1 || stats.words < 300 ? "warn" : "fail",
    detail: `${stats.h2} ara başlık (H2), ${stats.h3} alt başlık (H3)`,
    fix: "Metni içeriği özetleyen en az 2 ara başlıkla (H2) bölümlere ayırın.",
  });

  add({
    id: "no-h1", label: "Gövdede ana başlık (H1) yok", weight: 5,
    status: stats.h1 === 0 ? "pass" : "fail",
    detail: stats.h1 ? `${stats.h1} adet H1 var` : "Doğru",
    fix: "Gövdedeki H1 başlıkları H2'ye çevirin; sayfada tek H1 (haber başlığı) olmalı.",
  });

  add({
    id: "cover-image", label: "Kapak görseli", weight: 10,
    status: input.coverImage ? "pass" : "fail",
    detail: input.coverImage ? "Var" : "Yok",
    fix: "Kapak görseli ekleyin; Google Discover ve sosyal paylaşımlar görselsiz haberi göstermez.",
  });

  const tagCount = input.tags?.length ?? 0;
  add({
    id: "tags", label: "Etiketler", weight: 5,
    status: tagCount >= 3 ? "pass" : tagCount >= 1 ? "warn" : "fail",
    detail: `${tagCount} etiket (3-6 önerilir)`,
    fix: "Haberdeki kişi, kurum ve yer adlarından 3-6 etiket ekleyin.",
  });

  add({
    id: "internal-link", label: "Site içi bağlantı", weight: 5,
    status: stats.internalLinks >= 1 ? "pass" : "warn",
    detail: `${stats.internalLinks} iç, ${stats.externalLinks} dış bağlantı`,
    fix: "Konuyla ilgili daha önceki bir haberimize bağlantı verin.",
  });

  if (input.slug) {
    const sl = input.slug.length;
    add({
      id: "slug", label: "Haber adresi (URL)", weight: 5,
      status: sl <= 75 ? "pass" : "warn",
      detail: `${sl} karakter`,
      fix: "Kısa ve anlamlı bir adres tercih edin.",
    });
  }

  add({
    id: "paragraphs", label: "Paragraf uzunluğu", weight: 5,
    status: stats.longParagraphs === 0 ? "pass" : stats.longParagraphs <= 2 ? "warn" : "fail",
    detail: stats.longParagraphs ? `${stats.longParagraphs} paragraf ${LONG_PARAGRAPH_WORDS} kelimeden uzun` : "Paragraflar kısa",
    fix: "Uzun paragrafları 2-4 cümlelik parçalara bölün; mobilde okumayı kolaylaştırır.",
  });

  return checks;
}

export function seoScore(checks: SeoCheck[]) {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (!total) return 0;
  const got = checks.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return clamp((got / total) * 100);
}

/* ── Özgünlük (metin örtüşmesi) ────────────────────────── */

const SHINGLE = 5;

/** Ardışık 5 kelimelik dizilerin kümesi (aynen alınmış ifadeleri yakalar) */
export function shingles(text: string, n = SHINGLE) {
  const w = normalize(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

/** source: haberin RSS kaynağı · web: internet taramasında bulunan sayfa · site: sitemizdeki başka haber */
export type OverlapKind = "source" | "web" | "site";

export interface OverlapSource {
  title: string;
  url: string | null;
  text: string;
  kind: OverlapKind;
}

export interface OverlapMatch {
  title: string;
  url: string | null;
  kind: OverlapKind;
  /** Haber metninin yüzde kaçı bu kaynakla aynı */
  percent: number;
}

/**
 * Haber metninin kaynaklarla aynen örtüşen kısmının oranı (%).
 * Oran, haberin 5 kelimelik dizilerinden kaçının herhangi bir kaynakta aynen geçtiğidir.
 */
export function textOverlap(article: string, sources: OverlapSource[]) {
  const a = shingles(article);
  if (a.size === 0) return { rate: 0, matches: [] as OverlapMatch[] };
  const copied = new Set<string>();
  const matches: OverlapMatch[] = [];
  for (const s of sources) {
    const b = shingles(s.text);
    let shared = 0;
    for (const sh of a) {
      if (b.has(sh)) {
        shared++;
        if (s.kind !== "site") copied.add(sh);
      }
    }
    const percent = Math.round((shared / a.size) * 100);
    if (percent >= 3) matches.push({ title: s.title, url: s.url, kind: s.kind, percent });
  }
  matches.sort((x, y) => y.percent - x.percent);
  return { rate: Math.round((copied.size / a.size) * 100), matches: matches.slice(0, 8) };
}

/** Özgünlük puanı: aynen alınan oran arttıkça hızla düşer (%10 kopya → 75, %30 → 25) */
export function originalityScore(copiedRate: number, maxSiteOverlap: number) {
  return clamp(100 - copiedRate * 2.5 - Math.max(0, maxSiteOverlap - 20) * 1.5);
}

/** Genel puan: kalite %35, SEO %25, okunabilirlik %20, özgünlük %20 */
export function overallScore(s: { quality: number | null; seo: number; readability: number; originality: number }) {
  const quality = s.quality ?? Math.round((s.seo + s.readability + s.originality) / 3);
  return clamp(quality * 0.35 + s.seo * 0.25 + s.readability * 0.2 + s.originality * 0.2);
}

export interface CopiedPassage {
  /** Haberdeki cümle */
  text: string;
  source: string;
  url: string | null;
  /** Cümlenin yüzde kaçı kaynakta aynen geçiyor */
  percent: number;
}

/** Haberdeki cümleler (paragraf ve maddelerden) */
export function sentencesOf(html: string) {
  return contentBlocks(html)
    .filter((b) => !/^h\d$/.test(b.tag))
    .flatMap((b) => b.text.split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ0-9"“'(])/))
    .map((t) => t.trim())
    .filter((t) => wordsOf(t).length >= 6);
}

/**
 * Kaynaklardan aynen (ya da neredeyse aynen) alınmış cümleleri bulur: cümlenin 5 kelimelik
 * dizilerinin en az yarısı tek bir kaynakta geçiyorsa kopya sayılır. Sitedeki haberler hariçtir.
 */
export function copiedPassages(html: string, sources: OverlapSource[], max = 12): CopiedPassage[] {
  const prepared = sources.filter((s) => s.kind !== "site").map((s) => ({ s, sh: shingles(s.text) })).filter((p) => p.sh.size > 0);
  if (!prepared.length) return [];
  const out: CopiedPassage[] = [];
  for (const sentence of sentencesOf(html)) {
    const own = shingles(sentence);
    if (own.size === 0) continue;
    let best: { s: OverlapSource; ratio: number } | null = null;
    for (const p of prepared) {
      let hit = 0;
      for (const sh of own) if (p.sh.has(sh)) hit++;
      const ratio = hit / own.size;
      if (!best || ratio > best.ratio) best = { s: p.s, ratio };
    }
    if (best && best.ratio >= 0.5) out.push({ text: sentence, source: best.s.title, url: best.s.url, percent: Math.round(best.ratio * 100) });
    if (out.length >= max) break;
  }
  return out;
}

/** İnternette aranacak ayırt edici cümleler: en uzun, rakam/özel isim içeren cümleler öncelikli */
export function distinctiveSentences(html: string, count = 4) {
  return sentencesOf(html)
    .map((t) => ({ t, score: wordsOf(t).length + (/\d/.test(t) ? 4 : 0) + (t.match(/\s[A-ZÇĞİÖŞÜ]/g)?.length ?? 0) }))
    .filter((x) => wordsOf(x.t).length >= 10 && wordsOf(x.t).length <= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.t);
}
