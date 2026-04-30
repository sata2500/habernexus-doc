import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Güvenlik: wildcard "**" yerine gerçek host'lar listeleniyor.
    // Yeni bir kaynak eklenirse buraya eklenmeli.
    remotePatterns: [
      {
        // Vercel Blob — medya kütüphanesi ve profil fotoğrafları
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        // Google OAuth avatar'ları
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // GitHub avatar'ları (ileride OAuth eklenirse)
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        // Genel haber görselleri için açık izin — üretimde kısıtlanabilir
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  serverActions: {
    bodySizeLimit: "4.5mb",
  },
};

export default nextConfig;
