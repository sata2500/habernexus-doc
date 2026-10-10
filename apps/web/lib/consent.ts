/**
 * Çerez onayı (KVKK Çerez Rehberi). Zorunlu çerezler onay gerektirmez. Onaya bağlı gruplar:
 * - personalization: okunan haberleri hatırlayan `hn_reads` ve tarayıcıdaki okuma ilerlemesi
 * - analytics: Google Analytics (yalnızca yönetim panelinde açıksa sorulur)
 * - ads: kişiselleştirilmiş Google AdSense reklamları (yalnızca AdSense açıksa sorulur)
 *
 * Değer biçimi: `2.p1a0d-` (p: kişiselleştirme, a: analitik, d: reklam; 1 kabul, 0 ret, - sorulmadı).
 * Yeni bir grup devreye girdiğinde yalnızca o grup için yeniden sorulur.
 */
export const CONSENT_COOKIE = "hn_consent";
export const CONSENT_VERSION = "2";
/** Kurul rehberine uygun olarak tercih süresiz tutulmaz: 6 ay sonra yeniden sorulur */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
/** Alt bilgideki "Çerez tercihleri" bağlantısı bandı bu olayla yeniden açar */
export const CONSENT_OPEN_EVENT = "hn:consent-open";
export const CONSENT_CHANGE_EVENT = "hn:consent-change";

/** "Sizin İçin" önerileri için okunan haberler (en yenisi başta, virgülle ayrılmış haber kimlikleri) */
export const READ_HISTORY_COOKIE = "hn_reads";
export const READ_HISTORY_MAX = 30;

export const CONSENT_GROUPS = ["personalization", "analytics", "ads"] as const;
export type ConsentGroup = (typeof CONSENT_GROUPS)[number];

/** true: kabul · false: ret · null: henüz sorulmadı */
export type ConsentChoices = Record<ConsentGroup, boolean | null>;

const LETTERS: Record<ConsentGroup, string> = { personalization: "p", analytics: "a", ads: "d" };

/** Çerez değerini çözer; geçersiz değer null (hiç seçim yapılmamış) sayılır */
export function parseConsent(value: string | undefined | null): ConsentChoices | null {
  if (!value) return null;
  // 1. sürüm yalnızca kişiselleştirmeyi soruyordu; o tercih korunur
  const v1 = value.match(/^1\.p([01])$/);
  if (v1) return { personalization: v1[1] === "1", analytics: null, ads: null };
  const v2 = value.match(/^2\.p([01-])a([01-])d([01-])$/);
  if (!v2) return null;
  const read = (c: string) => (c === "-" ? null : c === "1");
  return { personalization: read(v2[1]), analytics: read(v2[2]), ads: read(v2[3]) };
}

export function serializeConsent(choices: Partial<ConsentChoices>) {
  const c = (v: boolean | null | undefined) => (v == null ? "-" : v ? "1" : "0");
  return `${CONSENT_VERSION}.${CONSENT_GROUPS.map((g) => LETTERS[g] + c(choices[g])).join("")}`;
}

/** Sitede etkin gruplar içinde henüz karar verilmemiş olan var mı? */
export function needsConsent(choices: ConsentChoices | null, active: Record<ConsentGroup, boolean>) {
  return CONSENT_GROUPS.some((g) => active[g] && (choices?.[g] ?? null) === null);
}

export function readConsentCookie(): ConsentChoices | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  return parseConsent(raw ? decodeURIComponent(raw) : null);
}

/** Tarayıcıda: kişiselleştirmeye onay verilmiş mi? */
export function hasPersonalizationConsent(): boolean {
  return readConsentCookie()?.personalization === true;
}

/**
 * Sayfa çizilmeden önce <head>'de çalışan satır içi betik: karar verilmiş grupları <html>'e
 * `data-consent-p/a/d` olarak yazar. Çerez bandı sunucuda çizildiği için, karar vermiş okurda
 * globals.css bu işaretlere bakarak bandı ilk boyamada gizler (bant hiç yanıp sönmez).
 */
export const CONSENT_FLAGS_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/),v=m?decodeURIComponent(m[1]):"";
var x=v.match(/^2\\.p([01-])a([01-])d([01-])$/)||(v.match(/^1\\.p([01])$/)?[0,v.charAt(3),"-","-"]:null);
if(!x)return;var h=document.documentElement;
["p","a","d"].forEach(function(k,i){if(x[i+1]!=="-")h.setAttribute("data-consent-"+k,"")});
}catch(e){}})();`;

/** Sitede etkin gruplar: sunucuda çizilen bandın hangi işaretlerle gizleneceğini belirler ("p", "pa", "pd", "pad") */
export function consentNeedKey(active: Record<ConsentGroup, boolean>) {
  return CONSENT_GROUPS.filter((g) => active[g]).map((g) => LETTERS[g]).join("");
}
