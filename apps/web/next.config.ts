import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * İçerik Güvenlik Politikası. Betikler yalnızca sitenin kendisinden yüklenir (dış kaynaklı betik yok).
 * 'unsafe-inline': Next.js'in sayfa içi başlatma betikleri için gerekli; nonce kullanmak her sayfayı
 * dinamik yapar (ISR/önbellek kaybolur). 'unsafe-eval' yalnızca geliştirmede (hızlı yenileme).
 * Görseller ve sesler haber kaynaklarından / Vercel Blob'dan geldiği için https: açık.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
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
  "frame-src 'none'",
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

export default nextConfig;
