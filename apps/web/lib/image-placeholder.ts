/**
 * Haber Nexus — Görsel Yükleme ve Shimmer / Blur Placeholder Yardımcısı
 * Next.js Image bileşenleri için CLS (Cumulative Layout Shift) engelleyici
 * ve yumuşak animasyonlu base64 SVG placeholder'lar üretir.
 */

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

/**
 * Shimmer SVG animasyonu üretir.
 */
export function generateShimmerSvg(w: number = 700, h: number = 475): string {
  return `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1e293b" offset="20%" />
      <stop stop-color="#334155" offset="50%" />
      <stop stop-color="#1e293b" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1e293b" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite"  />
</svg>`;
}

/**
 * Next.js Image placeholder="blur" ve blurDataURL için data URI döndürür.
 */
export function getShimmerDataUrl(w: number = 700, h: number = 475): string {
  return `data:image/svg+xml;base64,${toBase64(generateShimmerSvg(w, h))}`;
}

/**
 * Standart kapak görselleri için hazır 16:9 Blur Placeholder Data URL'i.
 */
export const ARTICLE_COVER_BLUR_DATA_URL = getShimmerDataUrl(800, 450);

/**
 * Slider görselleri için 21:9 Blur Placeholder Data URL'i.
 */
export const SLIDER_BLUR_DATA_URL = getShimmerDataUrl(1200, 500);

/**
 * Kare avatar ve profil fotoğrafları için Blur Data URL'i.
 */
export const AVATAR_BLUR_DATA_URL = getShimmerDataUrl(200, 200);
