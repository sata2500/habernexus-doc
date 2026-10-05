import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

/** Profil fotoğrafı yalnızca kendi depolamamızdan ya da Google hesap fotoğrafından olabilir */
function isAllowedAvatar(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname.endsWith(".public.blob.vercel-storage.com") || u.hostname.endsWith("googleusercontent.com"));
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }
  },
  user: {
    additionalFields: {
      // Rol yalnızca sunucuda (admin panelinden) değişir; istemci gönderemez
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  // Kaba kuvvet denemelerine karşı istek sınırları (üretimde etkin)
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 600, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
      "/forget-password": { window: 600, max: 3 },
      "/request-password-reset": { window: 600, max: 3 },
      "/change-password": { window: 600, max: 5 },
      "/change-email": { window: 600, max: 3 },
      "/update-user": { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      update: {
        // Kullanıcının kendi profilini güncellerken gönderebileceği alanları denetle
        before: async (data) => {
          const image = (data as { image?: unknown }).image;
          if (typeof image === "string" && image && !isAllowedAvatar(image)) {
            throw new APIError("BAD_REQUEST", { message: "Profil fotoğrafı yalnızca siteye yüklenen bir görsel olabilir." });
          }
          const name = (data as { name?: unknown }).name;
          if (typeof name === "string" && (name.trim().length < 2 || name.length > 80)) {
            throw new APIError("BAD_REQUEST", { message: "Ad 2-80 karakter olmalı." });
          }
          return { data };
        },
      },
    },
  },
});
