import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ endpoint: z.string().url().max(1000) });

/** Aboneliği siler. Adres yalnızca o tarayıcıda bilindiği için ayrıca kimlik doğrulaması gerekmez. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return NextResponse.json({ ok: true });
}
