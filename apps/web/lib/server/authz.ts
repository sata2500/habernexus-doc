import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const ROLES = ["USER", "AUTHOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export class AuthorizationError extends Error {
  readonly code: "UNAUTHORIZED" | "FORBIDDEN";
  readonly status: 401 | 403;

  constructor(code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code === "UNAUTHORIZED" ? "Oturum açmanız gerekiyor." : "Bu işlem için yetkiniz yok.");
    this.name = "AuthorizationError";
    this.code = code;
    this.status = code === "UNAUTHORIZED" ? 401 : 403;
  }
}

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new AuthorizationError("UNAUTHORIZED");
  }

  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  const role = session.user.role as Role | undefined;

  if (!role || !roles.includes(role)) {
    throw new AuthorizationError("FORBIDDEN");
  }

  return session;
}

/**
 * Sunucu işleminde yakalanan hatayı kullanıcıya gösterilebilir metne çevirir: yetki hataları
 * kendi açıklamasıyla, diğerleri (veritabanı vb.) günlüğe yazılıp genel bir mesajla döner.
 */
export function getSafeActionError(error: unknown, fallback = "İşlem gerçekleştirilemedi.") {
  if (error instanceof AuthorizationError) {
    return error.message;
  }

  console.error("Server action error:", error);
  return fallback;
}

/** `{ success: false, error }` sonucu üretir (try/catch bloklarında tek satır) */
export function actionError(error: unknown, fallback?: string) {
  return { success: false as const, error: getSafeActionError(error, fallback) };
}

/**
 * Değişiklik yapan yönetici işlemleri için: yetki yoksa (ör. oturum süresi dolmuş) istisna
 * fırlatmak yerine gösterilebilir bir sonuç döner. Kullanım:
 *   const denied = await adminOnly(); if (denied) return denied;
 */
export async function adminOnly(): Promise<{ success: false; error: string } | null> {
  try {
    await requireRole("ADMIN");
    return null;
  } catch (error) {
    return { success: false, error: getSafeActionError(error, "Bu işlem için yetkiniz yok.") };
  }
}
