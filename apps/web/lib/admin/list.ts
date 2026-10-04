/** Admin liste sayfaları için ortak arama/sayfalama yardımcıları (sunucu ve istemcide kullanılabilir). */

export const PAGE_SIZE = 25;

export type RawParams = Record<string, string | string[] | undefined>;

export function param(params: RawParams, key: string) {
  const v = params[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() || "";
}

export function pageParam(params: RawParams) {
  const n = Number(param(params, "sayfa"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Mevcut parametreleri koruyarak yeni bir adres üretir; filtre değişince sayfa sıfırlanır. */
export function listHref(base: string, params: RawParams, changes: Record<string, string | number | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value) sp.set(k, value);
  }
  if (!("sayfa" in changes)) sp.delete("sayfa");
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "" || (k === "sayfa" && Number(v) <= 1)) sp.delete(k);
    else sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
