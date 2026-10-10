import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Yönetim panelinden açılabilen Google Analytics ve AdSense'in betik ve çerçeve adresleri.
 * Özellik kapalıyken bu adreslerden hiçbir şey yüklenmez; izin listesi yalnızca açıldığında çalışmalarını sağlar.
 */
const googleScriptHosts = [
  "https://www.googletagmanager.com",
  "https://*.googlesyndication.com",
  "https://*.googleadservices.com",
  "https://*.doubleclick.net",
  "https://*.adtrafficquality.google",
  "https://*.google.com",
  "https://*.gstatic.com",
].join(" ");
const googleFrameHosts = [
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.adtrafficquality.google",
  "https://*.google.com",
].join(" ");

/**
 * İçerik Güvenlik Politikası. Betikler sitenin kendisinden ve (açılırsa) Google ölçüm/reklam adreslerinden yüklenir.
 * 'unsafe-inline': Next.js'in sayfa içi başlatma betikleri için gerekli; nonce kullanmak her sayfayı
 * dinamik yapar (ISR/önbellek kaybolur). 'unsafe-eval' yalnızca geliştirmede (hızlı yenileme).
 * Görseller ve sesler haber kaynaklarından / Vercel Blob'dan geldiği için https: açık.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${googleScriptHosts}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Tarayıcıdan Vercel Blob'a doğrudan yükleme ve analiz uç noktaları
  "connect-src 'self' https:",
  "media-src 'self' blob: https:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Yalnızca AdSense reklam çerçeveleri
  `frame-src ${googleFrameHosts}`,
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Vercel Blob — medya kütüphanesi ve profil fotoğrafları
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        // Google OAuth avatar'ları
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        // GitHub avatar'ları (ileride OAuth eklenirse)
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        // Genel haber görselleri için açık izin
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Sentry: kaynak haritaları yalnızca SENTRY_AUTH_TOKEN (ve SENTRY_ORG, SENTRY_PROJECT) tanımlıysa
 * yüklenir; anahtar yoksa derleme aynen devam eder. Çalışma anındaki hata gönderimi DSN'e bağlıdır.
 */
const sentryUpload = !!(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !sentryUpload, deleteSourcemapsAfterUpload: true },
  // Tarayıcı hataları sentry.io yerine kendi alan adımız üzerinden gider: reklam engelleyiciler ve
  // "özel DNS" filtreleri sentry.io'yu engeller. Yol her derlemede rastgele üretilir; sabit "/monitoring"
  // gizlilik listelerinde (EasyPrivacy vb.) bulunduğu için engelleniyordu. proxy.ts bu yolu kapsamaz.
  tunnelRoute: true,
});
