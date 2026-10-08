import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "./sentry.shared";

// Tarayıcıdaki hatalar (DSN yoksa kapalı)
if (sentryBaseOptions.enabled) {
  Sentry.init({
    ...sentryBaseOptions,
    // Tarayıcı eklentileri ve reklam engelleyicilerden gelen gürültü
    ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", /adsbygoogle/i],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i, /googlesyndication\.com/i, /googletagmanager\.com/i],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
