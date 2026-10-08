import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitAsync, getRequestIdentity } from "@/lib/server/rate-limit";
import { isPushConfigured } from "@/lib/server/push";

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Geçersiz adres."),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Tarayıcı bildirim aboneliğini kaydeder (okur tarayıcıda izin verdikten sonra) */
export async function POST(req: Request) {
  if (!isPushConfigured()) return NextResponse.json({ ok: false, error: "Bildirimler şu an kullanılamıyor." }, { status: 503 });
  const rate = await checkRateLimitAsync(`push-sub:${getRequestIdentity(req)}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ ok: false, error: "Çok fazla istek." }, { status: 429 });

  const parsed = SubscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Geçersiz abonelik." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  const userId = session?.user?.id ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
    update: { p256dh: keys.p256dh, auth: keys.auth, failureCount: 0, ...(userId && { userId }) },
  });
  return NextResponse.json({ ok: true });
}
