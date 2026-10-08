import { getMonetizationRow } from "@/lib/server/monetization";
import { ADSENSE_PUB_PATTERN } from "@/lib/monetization";

export const revalidate = 3600;

/**
 * ads.txt (IAB): bu sitede reklam satmaya yetkili hesaplar. AdSense yayıncı kimliği ve
 * yönetim panelinde eklenen diğer reklam ağı satırlarından oluşur.
 */
export async function GET() {
  const lines: string[] = [];
  try {
    const row = await getMonetizationRow();
    if (row.adsensePublisherId && ADSENSE_PUB_PATTERN.test(row.adsensePublisherId)) {
      // AdSense'in sabit sertifika kimliği (f08c47fec0942fa0)
      lines.push(`google.com, ${row.adsensePublisherId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`);
    }
    for (const line of (row.adsTxtExtra ?? "").split(/\r?\n/)) {
      const t = line.trim();
      if (t && t.length <= 300) lines.push(t);
    }
  } catch (e) {
    console.error("ads.txt error:", e);
  }
  return new Response(lines.join("\n") + (lines.length ? "\n" : ""), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
