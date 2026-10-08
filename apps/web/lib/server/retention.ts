import "server-only";

import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;

/**
 * Kişisel veri saklama süreleri (Gizlilik Politikası ve KVKK Aydınlatma Metni ile aynı olmalı).
 * Haberler, yorumlar ve doğrulanmış üye hesapları bu temizliğe girmez.
 */
export const RETENTION = {
  /** Çözülmüş (CLOSED) destek talepleri, son işlemden itibaren */
  closedTicketDays: 730,
  /** Onaylanmamış ya da abonelikten çıkılmış misafir bülten kayıtları, son değişiklikten itibaren */
  inactiveSubscriberDays: 365,
  /** E-postasını hiç doğrulamamış okur hesapları, kayıttan itibaren */
  unverifiedUserDays: 30,
} as const;

export function retentionCutoffs(now: Date) {
  const t = now.getTime();
  return {
    closedTicketsBefore: new Date(t - RETENTION.closedTicketDays * DAY),
    inactiveSubscribersBefore: new Date(t - RETENTION.inactiveSubscriberDays * DAY),
    unverifiedUsersBefore: new Date(t - RETENTION.unverifiedUserDays * DAY),
  };
}

/** Süresi dolan kayıtları siler; silinen kayıt sayılarını döndürür */
export async function runRetentionCleanup(now = new Date()) {
  const c = retentionCutoffs(now);
  const [tickets, subscribers, users, sessions, verifications] = await prisma.$transaction([
    // Mesajlar ilişkiyle birlikte silinir
    prisma.supportTicket.deleteMany({ where: { status: "CLOSED", updatedAt: { lt: c.closedTicketsBefore } } }),
    prisma.subscriber.deleteMany({ where: { isActive: false, updatedAt: { lt: c.inactiveSubscribersBefore } } }),
    // Yalnızca sıradan okur hesapları; yazar ve yöneticiler elle yönetilir
    prisma.user.deleteMany({ where: { emailVerified: false, role: "USER", createdAt: { lt: c.unverifiedUsersBefore } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return {
    supportTickets: tickets.count,
    subscribers: subscribers.count,
    unverifiedUsers: users.count,
    expiredSessions: sessions.count,
    expiredVerifications: verifications.count,
  };
}
