import "server-only";

import { getAppUrl } from "@/lib/utils";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bülten bağlantıları. Kayıtlı kullanıcıların abonelikten çıkış bağlantısı, oturum açmadan
 * çalışsın diye kullanıcı kimliğinin HMAC imzasını taşır (tahmin edilemez, değiştirilemez).
 */

const BASE_URL = getAppUrl;

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET tanımlı değil");
  return s;
}

export function userSignature(userId: string) {
  return createHmac("sha256", secret()).update(`newsletter:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUserSignature(userId: string, sig: string) {
  if (!/^[a-f0-9]{32}$/.test(sig)) return false;
  const expected = Buffer.from(userSignature(userId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function guestUnsubscribeUrl(token: string) {
  return `${BASE_URL()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function userUnsubscribeUrl(userId: string) {
  return `${BASE_URL()}/newsletter/unsubscribe?u=${encodeURIComponent(userId)}&s=${userSignature(userId)}`;
}

export function confirmUrl(token: string) {
  return `${BASE_URL()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

/** Gmail/Yahoo toplu gönderici kuralı: tek tıkla abonelikten çıkış başlıkları (RFC 8058) */
export function unsubscribeHeaders(oneClickUrl: string) {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Tek tıklık çıkış uç noktası (posta istemcileri POST gönderir) */
export function oneClickUrl(params: { token?: string; userId?: string }) {
  const q = params.token ? `t=${encodeURIComponent(params.token)}` : `u=${encodeURIComponent(params.userId!)}&s=${userSignature(params.userId!)}`;
  return `${BASE_URL()}/api/newsletter/unsubscribe?${q}`;
}
