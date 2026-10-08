/**
 * Çerez onayı (KVKK Çerez Rehberi). Zorunlu çerezler onay gerektirmez; onaya bağlı tek grup
 * "kişiselleştirme": okunan haberleri hatırlayan `hn_reads` çerezi ve tarayıcıdaki okuma ilerlemesi
 * ("Sizin İçin" ve "Okumaya devam et"). Reklam/izleme çerezi kullanılmadığı için başka grup yok.
 *
 * Değer biçimi: `<sürüm>.<p0|p1>`; sürüm artırılırsa herkese yeniden sorulur.
 */
export const CONSENT_COOKIE = "hn_consent";
export const CONSENT_VERSION = "1";
/** Kurul rehberine uygun olarak tercih süresiz tutulmaz: 6 ay sonra yeniden sorulur */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
/** Alt bilgideki "Çerez tercihleri" bağlantısı bandı bu olayla yeniden açar */
export const CONSENT_OPEN_EVENT = "hn:consent-open";
export const CONSENT_CHANGE_EVENT = "hn:consent-change";

/** "Sizin İçin" önerileri için okunan haberler (en yenisi başta, virgülle ayrılmış haber kimlikleri) */
export const READ_HISTORY_COOKIE = "hn_reads";
export const READ_HISTORY_MAX = 30;

export type ConsentState = { personalization: boolean } | null;

/** Çerez değerini çözer; geçersiz ya da eski sürüm "henüz seçilmedi" (null) sayılır */
export function parseConsent(value: string | undefined | null): ConsentState {
  const match = value?.match(/^(\d+)\.p([01])$/);
  if (!match || match[1] !== CONSENT_VERSION) return null;
  return { personalization: match[2] === "1" };
}

export function serializeConsent(personalization: boolean) {
  return `${CONSENT_VERSION}.p${personalization ? 1 : 0}`;
}

/** Tarayıcıda: kişiselleştirmeye onay verilmiş mi? */
export function hasPersonalizationConsent(): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  return parseConsent(raw ? decodeURIComponent(raw) : null)?.personalization === true;
}
