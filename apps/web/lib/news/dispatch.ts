import "server-only";

import { Client } from "@upstash/qstash";
import { getAppUrl } from "@/lib/utils";
import { writeStory } from "@/lib/ai-writer";

/**
 * Konuları yazdırır. Üretimde her konu QStash üzerinden ayrı bir işçiye gönderilir
 * (sayfa isteği zaman aşımına uğramaz); yerelde ya da QStash yoksa sırayla burada yazılır.
 */
export async function dispatchStories(storyIds: string[]) {
  if (storyIds.length === 0) return { mode: "none" as const, enqueued: 0, written: 0, failed: 0, errors: [] as string[] };
  const appUrl = getAppUrl();
  const useQueue = !!process.env.QSTASH_TOKEN && !appUrl.includes("localhost");

  if (useQueue) {
    const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
    let enqueued = 0;
    const errors: string[] = [];
    for (const storyId of storyIds) {
      try {
        await qstash.publishJSON({ url: `${appUrl}/api/ai-writer/worker`, body: { storyId } });
        enqueued++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { mode: "queue" as const, enqueued, written: 0, failed: errors.length, errors };
  }

  let written = 0;
  const errors: string[] = [];
  for (const storyId of storyIds) {
    const r = await writeStory(storyId);
    if (r.success && !r.skipped) written++;
    else if (!r.success) errors.push(r.error);
  }
  return { mode: "sync" as const, enqueued: 0, written, failed: errors.length, errors };
}

export function describeDispatch(r: Awaited<ReturnType<typeof dispatchStories>>) {
  if (r.mode === "none") return "Yazım sırasında eşiği geçen konu yok.";
  if (r.mode === "queue") return `${r.enqueued} konu yazıma gönderildi; birkaç dakika içinde yayınlanacak.${r.failed ? ` ${r.failed} konu gönderilemedi.` : ""}`;
  return `${r.written} haber yazıldı.${r.failed ? ` ${r.failed} konu yazılamadı: ${r.errors[0]}` : ""}`;
}
