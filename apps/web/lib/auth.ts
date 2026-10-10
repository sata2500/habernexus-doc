import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendEmail } from "./mail";
import { AuthEmailTemplate } from "@/components/mail/AuthEmailTemplate";
import { checkRateLimitAsync } from "./server/rate-limit";
import { getAppUrl } from "./utils";

const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

/** Profil fotoğrafı yalnızca kendi depolamamızdan ya da Google hesap fotoğrafından olabilir */
function isAllowedAvatar(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname.endsWith(".public.blob.vercel-storage.com") || u.hostname.endsWith("googleusercontent.com"));
  } catch {
    return false;
  }
}

/**
 * Sitenin adresi ve güvenilen kökenler sabitlenir: adres istekten (Host başlığı) türetilirse sahte
 * başlıkla şifre sıfırlama bağlantısı başka siteye yönlendirilebilir; yönlendirme (callbackURL) ve
 * istek kökeni denetimleri de bu listeye göre yapılır. Vercel önizleme adresleri de güvenilir sayılır.
 */
const isProduction = process.env.NODE_ENV === "production";
const authBaseURL = process.env.BETTER_AUTH_URL || (isProduction ? getAppUrl() : undefined);
const trustedOrigins = [
  authBaseURL,
  isProduction ? getAppUrl() : undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
].filter((o): o is string => !!o).map((o) => o.replace(/\/$/, ""));

export const auth = betterAuth({
  baseURL: authBaseURL,
  trustedOrigins: trustedOrigins.length ? [...new Set(trustedOrigins)] : undefined,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // E-posta adresini doğrulamayan hesap giriş yapamaz (Google hesapları zaten doğrulanmıştır)
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // Şifre değişince açık oturumlar kapanır (çalınmış oturum kalmasın)
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.NODE_ENV !== "production") console.info("[Auth] Şifre sıfırlama bağlantısı (geliştirme):", url);
      await sendEmail({
        to: user.email,
        subject: "Haber Nexus şifre sıfırlama",
        react: AuthEmailTemplate({
          title: "Şifrenizi sıfırlayın",
          intro: `Merhaba ${user.name}, hesabınız için şifre sıfırlama isteği aldık. Yeni şifre belirlemek için aşağıdaki düğmeye tıklayın.`,
          buttonLabel: "Yeni şifre belirle",
          url,
          note: "Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; şifreniz değişmez.",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Doğrulanmamış hesapla giriş denenirse yeni bağlantı otomatik gönderilir
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      if (process.env.NODE_ENV !== "production") console.info("[Auth] Doğrulama bağlantısı (geliştirme):", url);
      await sendEmail({
        to: user.email,
        subject: "Haber Nexus e-posta adresinizi doğrulayın",
        react: AuthEmailTemplate({
          title: "E-posta adresinizi doğrulayın",
          intro: `Merhaba ${user.name}, Haber Nexus'a hoş geldiniz! Hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulayın.`,
          buttonLabel: "E-postamı doğrula",
          url,
          note: "Bağlantı 24 saat geçerlidir. Bu hesabı siz oluşturmadıysanız e-postayı yok sayabilirsiniz.",
        }),
      });
    },
  },
  // Google ile giriş yalnızca anahtarlar tanımlıysa açılır
  socialProviders: googleConfigured
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  advanced: {
    // Hız sınırı ve oturum kaydı için gerçek istemci adresi (Vercel başlıkları öncelikli)
    ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] },
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
      // Bülten yalnızca açık onayla: kayıt formundaki kutu işaretlenirse true
      newsletterSubscribed: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
    },
  },
  // Kaba kuvvet denemelerine karşı istek sınırları (üretimde etkin). Sayaçlar Redis'te tutulur:
  // sunucusuz ortamda her istek başka bir örneğe düşebildiğinden bellek içi sayaç sınırı fiilen uygulamaz.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customStorage: {
      consume: async (key, rule) => {
        const r = await checkRateLimitAsync(`auth:${key}`, rule.max, rule.window * 1000);
        return { allowed: r.allowed, retryAfter: r.allowed ? null : r.retryAfterSeconds };
      },
    },
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 600, max: 5 },
      "/send-verification-email": { window: 600, max: 3 },
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
