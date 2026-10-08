/**
 * "Kaldığın yerden devam et" için tarayıcıda tutulan okuma ilerlemesi.
 * Bu cihazda saklanır; giriş yapmış okurlarda ayrıca hesaba da kaydedilir (/api/reading).
 */

import { hasPersonalizationConsent } from "./consent";

export interface ReadingEntry {
  /** Yalnızca hesaptan gelen kayıtlarda: haber kimliği */
  id?: string;
  slug: string;
  title: string;
  coverImage: string | null;
  category: string | null;
  /** 0-100 */
  progress: number;
  /** Son okuma zamanı (ms) */
  at: number;
  /** Haber bitirildi (bir daha "yarım kaldı" listesine düşmez) */
  done?: boolean;
}

const KEY = "hn:reading-progress";
const MAX_ENTRIES = 20;
const MAX_AGE_MS = 14 * 86_400_000;
const EVENT = "hn:reading-progress";

let cache: { raw: string | null; entries: ReadingEntry[] } = { raw: null, entries: [] };

function read(): ReadingEntry[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return []; }
  if (raw === cache.raw) return cache.entries;
  let entries: ReadingEntry[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) entries = parsed.filter((e) => e && typeof e.slug === "string" && typeof e.title === "string");
  } catch { /* bozuk kayıt: yok say */ }
  cache = { raw, entries };
  return entries;
}

function write(entries: ReadingEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* depolama kapalı olabilir */ }
}

/**
 * İlerlemeyi kaydeder. İlerleme geriye düşmez (en ileri nokta "kaldığın yer"dir); bitirilmiş haber
 * bitirilmiş kalır ve yeniden açılması onu listenin başına taşımaz.
 */
export function saveProgress(entry: Omit<ReadingEntry, "at">) {
  // Bu cihazda tutulan ilerleme kişiselleştirme onayına bağlıdır (hesaptaki kayıt ayrıca tutulur)
  if (!hasPersonalizationConsent()) return;
  const all = read();
  const prev = all.find((e) => e.slug === entry.slug);
  if (prev?.done) return;
  const rest = all.filter((e) => e.slug !== entry.slug);
  const done = !!entry.done;
  const progress = done ? 100 : Math.max(prev?.progress ?? 0, Math.round(entry.progress));
  write([{ ...entry, progress, done, at: Date.now() }, ...rest]);
}

/** Bu cihazda bu haber için kayıt (yoksa null) */
export function getProgress(slug: string): ReadingEntry | null {
  return read().find((e) => e.slug === slug) ?? null;
}

/** Çerez onayı geri alınınca bu cihazdaki ilerleme silinir */
export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch { /* depolama kapalı olabilir */ }
}

export function removeProgress(slug: string) {
  write(read().filter((e) => e.slug !== slug));
}

/** Bu orana ulaşan haber "okundu" sayılır (sunucudaki READ_COMPLETE_AT ile aynı) */
export const READ_COMPLETE_AT = 97;

/** Yarım kalmış (okunmaya başlanmış ama bitmemiş) ve yakın zamanda açılmış haberler */
export function unfinished(entries: ReadingEntry[], now: number, limit = 3) {
  return entries.filter((e) => !e.done && e.progress >= 10 && e.progress < READ_COMPLETE_AT && now - e.at < MAX_AGE_MS).slice(0, limit);
}

/**
 * Haberin ne kadarının okunduğu (0-100). Haber metninin başından "Bu habere tepkiniz"
 * bölümüne kadar olan kısım esas alınır; footer'a inmek gerekmez.
 */
export function measureArticleProgress(): number | null {
  const body = document.getElementById("article-body");
  if (!body) return null;
  const end = document.getElementById("article-end");
  const start = body.getBoundingClientRect().top;
  // Tepkiler bölümünün başlığı göründüğünde haber bitmiş sayılır
  const finish = end ? end.getBoundingClientRect().top + 80 : body.getBoundingClientRect().bottom;
  const span = finish - start;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((window.innerHeight - start) / span) * 100));
}

/** Haber okundu olarak işaretlendiğinde yayılan olay (detail: { saved: hesaba kaydedildi mi }) */
export const ARTICLE_READ_EVENT = "hn:article-read";

export function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) callback(); };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", onStorage); };
}

export const getSnapshot = read;
const EMPTY: ReadingEntry[] = [];
export const getServerSnapshot = () => EMPTY;
