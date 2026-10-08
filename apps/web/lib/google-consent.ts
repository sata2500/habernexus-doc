import { CONSENT_COOKIE, type ConsentChoices } from "./consent";

/**
 * Google Consent Mode v2. Varsayılan her şey "reddedildi"; okur onay verdikçe güncellenir.
 * Analytics betiği zaten yalnızca analitik onayı varsa yüklenir. AdSense onay yoksa
 * kişiselleştirilmemiş reklam gösterir ve reklam çerezi kullanmaz.
 */

type GtagFn = (...args: unknown[]) => void;
type AdsQueue = unknown[] & { requestNonPersonalizedAds?: number };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    adsbygoogle?: AdsQueue;
  }
}

export function consentModeState(c: ConsentChoices | null) {
  const v = (on: boolean | null | undefined) => (on ? "granted" : "denied");
  return {
    analytics_storage: v(c?.analytics),
    ad_storage: v(c?.ads),
    ad_user_data: v(c?.ads),
    ad_personalization: v(c?.ads),
  };
}

/**
 * Sayfa ilk yüklenirken (Google betiklerinden önce) çalışan satır içi betik: gtag kuyruğunu
 * kurar ve çerezdeki tercihe göre varsayılan onay durumunu bildirir.
 */
export const CONSENT_INIT_SCRIPT = `(function(){
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/),v=m?decodeURIComponent(m[1]):"";
var x=v.match(/^2\\.p[01-]a([01-])d([01-])$/),a=x&&x[1]==="1",d=x&&x[2]==="1";
var g=function(b){return b?"granted":"denied"};
window.gtag("consent","default",{analytics_storage:g(a),ad_storage:g(d),ad_user_data:g(d),ad_personalization:g(d)});
window.adsbygoogle=window.adsbygoogle||[];window.adsbygoogle.requestNonPersonalizedAds=d?0:1;
})();`;

/** Bant üzerinden tercih değişince Google'a bildirir */
export function updateGoogleConsent(c: ConsentChoices) {
  window.gtag?.("consent", "update", consentModeState(c));
  window.adsbygoogle ??= [];
  window.adsbygoogle.requestNonPersonalizedAds = c.ads ? 0 : 1;
  if (!c.analytics) {
    // Analitik onayı geri alınınca Google Analytics çerezleri silinir
    const host = location.hostname.replace(/^www\./, "");
    for (const name of document.cookie.split("; ").map((s) => s.split("=")[0]).filter((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid")) {
      for (const domain of ["", `; domain=.${host}`]) document.cookie = `${name}=; path=/; max-age=0${domain}`;
    }
  }
}
