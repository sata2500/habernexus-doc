/**
 * Sentry ortak ayarları. DSN tanımlı değilse Sentry hiç başlamaz (hiçbir istek gitmez).
 * Kişisel veri gönderilmez: IP, çerez ve istek gövdeleri kapalı; oturum kaydı (replay) yok.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "";

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
  // Performans izleme ücretsiz kotayı hızla doldurur; yalnızca hatalar ve küçük bir örnek
  tracesSampleRate: 0.05,
};
