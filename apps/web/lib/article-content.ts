/**
 * Haber gövdesiyle ilgili saf yardımcılar (sunucu ve istemci ortak).
 */

function tokens(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[#\w]+;/g, " ")
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    // Türkçe ekler ve küçük yazım farkları (rüşvet/rüşbet) eşleşsin diye kök yerine ilk 4 harf
    .map((t) => t.slice(0, 4));
}

/** İki başlığın aynı cümle olup olmadığını (yazım ve küçük ek farklarına toleranslı) ölçer. */
export function isSameHeadline(a: string, b: string) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return false;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / (ta.size + tb.size - common) >= 0.6;
}

const LEADING_HTML_HEADING = /^(\s*(?:<(?:div|section|article|header)\b[^>]*>\s*)*)(<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>|<p\b[^>]*>\s*<(strong|b)>([\s\S]*?)<\/\4>\s*<\/p>)\s*/i;
const LEADING_MD_HEADING = /^\s*#{1,3}\s+(.+?)\s*#*\s*(?:\n|$)/;

/**
 * Gövdenin başında başlığın tekrarı olan bir ara başlık varsa çıkarır.
 * Yapay zekâ bazen başlığı gövdeye de ekliyor; sayfada ve seslendirmede başlık iki kez görünüp okunuyordu.
 */
export function stripLeadingTitleHeading(title: string, content: string) {
  if (!title.trim() || !content) return content;
  const html = content.match(LEADING_HTML_HEADING);
  if (html) {
    const heading = html[3] ?? html[5] ?? "";
    return isSameHeadline(title, heading) ? html[1] + content.slice(html[0].length) : content;
  }
  const md = content.match(LEADING_MD_HEADING);
  if (md && isSameHeadline(title, md[1])) return content.slice(md[0].length);
  return content;
}
