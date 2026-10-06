import "server-only";

import { Client } from "@upstash/qstash";
import { getAppUrl } from "@/lib/utils";

/** Haber yazımı ve yayın sonrası kalite işlerini yürüten işçi */
export const WORKER_PATH = "/api/ai-writer/worker";

/** Üretimde QStash varsa uzun işler ayrı bir işçiye gönderilir; yerelde aynı istekte çalışır. */
export function isQueueAvailable() {
  return !!process.env.QSTASH_TOKEN && !getAppUrl().includes("localhost");
}

/** Bir işi QStash ile `path` adresindeki işçiye gönderir. Kuyruk yoksa false döner. */
export async function enqueueJob(path: string, body: Record<string, unknown>) {
  if (!isQueueAvailable()) return false;
  const client = new Client({ token: process.env.QSTASH_TOKEN! });
  await client.publishJSON({ url: `${getAppUrl()}${path}`, body });
  return true;
}
