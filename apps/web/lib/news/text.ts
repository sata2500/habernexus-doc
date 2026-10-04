/**
 * Haber başlıkları için Türkçe metin normalleştirme ve benzerlik ölçümü.
 * Saf fonksiyonlardır (veritabanı/ağ yok); kümelendirme ve tekrar tespiti bunları kullanır.
 */

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** Benzerliği etkilemeyen sık kelimeler ve haber kalıpları (normalleştirilmiş halleriyle) */
const STOPWORDS = new Set([
  "ve", "ile", "bir", "bu", "su", "o", "da", "de", "ta", "te", "mi", "mu", "icin", "gibi", "olarak", "olan", "olmus",
  "daha", "cok", "en", "son", "dakika", "sondakika", "flas", "haber", "haberi", "haberleri", "aciklama", "acikladi",
  "oldu", "etti", "yapti", "dedi", "geldi", "var", "yok", "ne", "nasil", "neden", "kim", "hangi", "kadar", "sonra",
  "once", "ilk", "yeni", "buyuk", "gore", "oldugu", "oldugunu", "ki", "ya", "veya", "ama", "fakat", "her", "tum",
  "butun", "video", "izle", "canli", "foto", "galeri", "iste", "resmen", "belli", "bugun", "yarin", "dun", "bunu",
  "sunu", "onu", "icin", "uzere", "ise", "hem", "ancak", "artik", "bile", "diye", "tarafindan", "ilgili", "hakkinda",
  "nedir", "neler", "nerede", "zaman", "saat", "kac", "mi", "midir", "mudur", "son", "dakikasi", "gundem", "gelisme",
  "gelismeler", "aciklamasi", "aciklandi", "duyurdu", "acikladi", "yapildi", "yapilacak", "edildi", "olacak",
  // Yayın rehberi kalıpları ("... maçı hangi kanalda, saat kaçta, nereden izlenir?")
  "kanalda", "kanal", "kacta", "nereden", "izlenir", "izlenecek", "sifresiz", "yayinlanacak", "yayinlayacak", "hangi",
  "detaylar", "detaylari", "ayrintilar", "iste", "tam", "liste", "listesi",
]);

/** Türkçe karakterleri sadeleştirir, küçük harfe çevirir ve noktalamayı boşluğa dönüştürür. */
export function normalize(text: string): string {
  return text
    .replace(/[’'`´]\p{L}*/gu, "") // kesme işaretinden sonraki ekleri at: Fenerbahçe'yi → Fenerbahçe
    .toLocaleLowerCase("tr")
    .replace(/[çğıİöşüâîû]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Basit Türkçe kök bulma: ilk 5 harf ("F5" yöntemi), sonda kalan ünlü atılır. Eklemeli dilde
 * "derbisi/derbide/derbinin" gibi biçimleri aynı köke indirmek için yeterince iyi çalışır.
 */
function stem(word: string) {
  if (/^\d+$/.test(word)) return word;
  // Sondaki ünlü çoğunlukla ektir: faiz/faizi/faizini → "faiz", banka/bankası → "bank", maç/maçı → "mac"
  const s = word.slice(0, 5);
  return s.length > 3 && /[aeiou]$/.test(s) ? s.slice(0, -1) : s;
}

/** Başlıktaki anlamlı kökler (tekrarsız, sıralı) */
export function keyTokens(text: string): string[] {
  const out = new Set<string>();
  for (const w of normalize(text).split(" ")) {
    if (!w || STOPWORDS.has(w)) continue;
    if (w.length < 2 && !/^\d$/.test(w)) continue;
    out.add(stem(w));
  }
  return [...out];
}

/**
 * Özel isim gibi görünen kelimelerin kökleri (büyük harfle başlayanlar). Başlığın tamamı
 * Büyük Harfle Yazılmışsa bu bilgi güvenilmez olduğundan boş döner.
 */
export function entityTokens(text: string): string[] {
  const words = text.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean);
  const caps = words.filter((w) => /^\p{Lu}/u.test(w));
  if (words.length >= 4 && caps.length / words.length > 0.7) return [];
  return [...new Set(caps.flatMap((w) => keyTokens(w)))];
}

export interface TitleSignature {
  tokens: string[];
  entities: string[];
}

export function signature(text: string): TitleSignature {
  return { tokens: keyTokens(text), entities: entityTokens(text) };
}

/**
 * Konu benzerliği: kelime benzerliği, iki tarafta da diğerinde geçmeyen farklı özel isimler
 * varsa düşürülür ("Icardi sakatlandı" ≠ "Osimhen sakatlandı").
 */
export function storySimilarity(a: TitleSignature, b: TitleSignature, idf?: (t: string) => number): number {
  let score = similarity(a.tokens, b.tokens, idf);
  if (score === 0) return 0;
  const tb = new Set(b.tokens);
  const ta = new Set(a.tokens);
  const onlyA = a.entities.some((e) => !tb.has(e));
  const onlyB = b.entities.some((e) => !ta.has(e));
  if (onlyA && onlyB) score *= 0.65;

  // Ayırt edici (pencerede nadir) kelimeler: iki tarafta da farklı nadir kelimeler var ama ortak
  // nadir kelime yoksa, benzerlik yalnızca kalıp ifadelerden geliyordur.
  if (idf) {
    const rare = (t: string, min = DISTINCTIVE_IDF) => !/^\d{1,2}$/.test(t) && idf(t) >= min;
    // Ortak kelimede eşik daha düşük: iki başlıkta birden geçmesi zaten nadirliğini düşürür
    const sharedRare = a.tokens.some((t) => rare(t, SHARED_DISTINCTIVE_IDF) && tb.has(t));
    const rareOnlyA = a.tokens.some((t) => rare(t) && !tb.has(t));
    const rareOnlyB = b.tokens.some((t) => rare(t) && !ta.has(t));
    if (!sharedRare && rareOnlyA && rareOnlyB) score *= 0.6;
  }
  return score;
}

/** Bu ağırlığın üzerindeki kelimeler pencerede nadir, yani konuyu ayırt edicidir. */
const DISTINCTIVE_IDF = 1.2;
const SHARED_DISTINCTIVE_IDF = 1.0;

/** Kısa sayılar (skor, saat) bilgi taşır ama tek başına konu belirlemez; daha az ağırlık alır. */
function weight(token: string, idf?: (t: string) => number) {
  const base = /^\d{1,2}$/.test(token) ? 0.4 : 1;
  return base * (idf ? idf(token) : 1);
}

/**
 * İki başlığın konu benzerliği (0-1). Jaccard ile örtüşme katsayısının ortalaması;
 * kısa başlık uzun başlığın içinde kalsa da yakalanır. En az iki anlamlı ortak kelime şartı aranır.
 */
export function similarity(a: string[], b: string[], idf?: (t: string) => number): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let common = 0, commonCount = 0, wa = 0, wb = 0;
  for (const t of a) {
    const w = weight(t, idf);
    wa += w;
    if (setB.has(t)) { common += w; if (!/^\d{1,2}$/.test(t)) commonCount++; }
  }
  for (const t of b) wb += weight(t, idf);
  if (commonCount < 2 && Math.min(a.length, b.length) > 2) return Math.min(0.3, common / (wa + wb - common));
  const jaccard = common / (wa + wb - common);
  const overlap = common / Math.min(wa, wb);
  return (jaccard + overlap) / 2;
}

/**
 * Bir pencere içindeki başlıklardan nadirlik ağırlığı üretir: herkesin yazdığı "galatasaray"
 * gibi kelimeler daha az, olaya özgü kelimeler daha çok ağırlık alır.
 */
export function buildIdf(documents: string[][]): (t: string) => number {
  const df = new Map<string, number>();
  for (const doc of documents) for (const t of new Set(doc)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(documents.length, 1);
  return (t: string) => {
    const d = df.get(t) ?? 0;
    // 0.6 ile 1.6 arasında sınırlı: tek bir kelime kararı belirlemesin
    return Math.min(1.6, Math.max(0.6, Math.log((n + 1) / (d + 0.5)) / Math.log(n + 1) + 0.6));
  };
}

/** Kümelendirme eşikleri */
export const SAME_STORY = 0.5;
export const LIKELY_DUPLICATE = 0.62;
export const POSSIBLE_DUPLICATE = 0.3;

/** Başlık + özetten zaman hassasiyeti ipuçları (yapay zekâ yokken de çalışır). */
export function timeHints(text: string): { breaking: boolean; upcoming: boolean } {
  const n = ` ${normalize(text)} `;
  return {
    breaking: /\b(son dakika|sondakika|flas)\b/.test(n),
    upcoming: /\b(yarin|bu aksam|bu gece|bugun saat|saat \d{1,2} \d{2}|canli yayin|muhtemel 11|hafta sonu|kac(ta| ta) hangi kanalda|ne zaman)\b/.test(n),
  };
}
