import "server-only";

import { Receiver } from "@upstash/qstash";

let receiver: Receiver | null = null;

/**
 * QStash imzasını doğrular. İmza anahtarları tanımlı değilse istek her zaman reddedilir
 * (boş anahtarla doğrulama sahte imzaya açık olurdu). Gövde metni doğrulamadan sonra okunabilir.
 */
export async function verifyQStashRequest(req: Request): Promise<{ ok: true; body: string } | { ok: false; status: number; error: string }> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) {
    console.error("[QStash] İmza anahtarları tanımlı değil; istek reddedildi.");
    return { ok: false, status: 503, error: "Zamanlanmış görev imzası yapılandırılmamış." };
  }
  const signature = req.headers.get("upstash-signature");
  if (!signature) return { ok: false, status: 401, error: "Missing signature" };

  const body = await req.text();
  receiver ??= new Receiver({ currentSigningKey: current, nextSigningKey: next });
  const valid = await receiver.verify({ signature, body }).catch(() => false);
  return valid ? { ok: true, body } : { ok: false, status: 401, error: "Invalid signature" };
}
