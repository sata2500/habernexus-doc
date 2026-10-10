import { sentryBaseOptions } from "@/sentry.shared";

/**
 * Tarayıcıda Sentry ertelenmiş yüklenir: SDK (~70 KB) sayfanın ilk açılışında indirilip çalıştırılmaz,
 * tarayıcı boşa çıkınca yüklenir. O ana kadar oluşan hatalar sıraya alınır ve Sentry hazır olunca gönderilir.
 * DSN yoksa hiçbir şey yüklenmez.
 */
type SentryModule = typeof import("@sentry/nextjs");

let loading: Promise<SentryModule | null> | null = null;
const early: unknown[] = [];

function onEarlyError(e: ErrorEvent) { early.push(e.error ?? e.message); }
function onEarlyRejection(e: PromiseRejectionEvent) { early.push(e.reason); }

export function loadSentry(): Promise<SentryModule | null> {
  if (!sentryBaseOptions.enabled || typeof window === "undefined") return Promise.resolve(null);
  loading ??= import("@sentry/nextjs")
    .then((Sentry) => {
      if (!Sentry.getClient()) {
        Sentry.init({
          ...sentryBaseOptions,
          // Tarayıcı eklentileri ve reklam engelleyicilerden gelen gürültü
          ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", /adsbygoogle/i],
          denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i, /googlesyndication\.com/i, /googletagmanager\.com/i],
        });
      }
      // Sentry kendi genel hata dinleyicilerini kurdu; erken yakalananlar gönderilir
      window.removeEventListener("error", onEarlyError);
      window.removeEventListener("unhandledrejection", onEarlyRejection);
      for (const err of early.splice(0)) Sentry.captureException(err);
      return Sentry;
    })
    .catch(() => null);
  return loading;
}

/** Hata sınırlarından (error.tsx) çağrılır: Sentry henüz yüklenmediyse önce yüklenir */
export function reportError(error: unknown) {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}

/** Uygulama açılışında bir kez: erken hataları dinle, Sentry'yi tarayıcı boşa çıkınca yükle */
export function scheduleSentry() {
  if (!sentryBaseOptions.enabled || typeof window === "undefined") return;
  window.addEventListener("error", onEarlyError);
  window.addEventListener("unhandledrejection", onEarlyRejection);
  const start = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => void loadSentry(), { timeout: 4000 });
    else setTimeout(() => void loadSentry(), 1500);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
