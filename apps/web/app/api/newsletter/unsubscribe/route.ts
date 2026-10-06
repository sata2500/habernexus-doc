import { NextRequest, NextResponse } from "next/server";
import { unsubscribeGuest, unsubscribeUser } from "@/lib/server/newsletter";

/**
 * Tek tıkla abonelikten çıkış (RFC 8058). Gmail/Outlook "Abonelikten çık" düğmesi buraya POST gönderir.
 * GET ile açılırsa onay sayfasına yönlendirilir (bağlantıyı açmak tek başına çıkış yapmaz).
 */
export async function POST(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const t = p.get("t");
  const u = p.get("u");
  const s = p.get("s");
  const ok = t ? await unsubscribeGuest(t) : u && s ? await unsubscribeUser(u, s) : false;
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const target = new URL("/newsletter/unsubscribe", req.nextUrl.origin);
  if (p.get("t")) target.searchParams.set("token", p.get("t")!);
  if (p.get("u")) target.searchParams.set("u", p.get("u")!);
  if (p.get("s")) target.searchParams.set("s", p.get("s")!);
  return NextResponse.redirect(target);
}
