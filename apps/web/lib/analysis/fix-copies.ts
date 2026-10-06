import "server-only";

import { prisma } from "@/lib/prisma";
import { generateText, parseJsonResponse } from "@/lib/ai/client";
import { analyzeArticle } from "@/lib/article-analyzer";
import { normalize } from "@/lib/news/text";

/**
 * "Kopyaları gider": analizde kaynaklardan aynen alındığı tespit edilen cümlelerin geçtiği
 * paragraflar (yalnızca onlar) yapay zekâ yazar modeliyle özgünleştirilir; bilgi, bağlantı ve
 * vurgular korunur. Ardından haber yeniden analiz edilir ve önce/sonra oranı döner.
 */

const MAX_PARAGRAPHS = 10;

interface Passage { text: string }

function storedPassages(report: unknown): Passage[] {
  const r = report as { version?: number; originality?: { passages?: unknown } } | null;
  if (!r || r.version !== 2 || !Array.isArray(r.originality?.passages)) return [];
  return (r.originality!.passages as unknown[]).filter((p): p is Passage => !!p && typeof (p as Passage).text === "string");
}

const plain = (html: string) => normalize(html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));

export async function fixCopiedPassages(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true, title: true, content: true, analysisReport: true, plagiarismRate: true } });
  if (!article) return { success: false as const, error: "Haber bulunamadı." };
  const passages = storedPassages(article.analysisReport);
  if (passages.length === 0) return { success: false as const, error: "Analizde kopya cümle bulunmadı. Önce haberi yeniden analiz edin." };
  const before = article.plagiarismRate ?? 0;

  // Kopya cümleyi içeren paragraf/madde blokları (HTML'deki birebir halleriyle)
  const needles = passages.map((p) => plain(p.text)).filter((n) => n.length > 20);
  const blocks = [...article.content.matchAll(/<(p|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const targets = [...new Set(blocks.filter((b) => {
    const text = plain(b);
    return needles.some((n) => text.includes(n));
  }))].slice(0, MAX_PARAGRAPHS);
  if (targets.length === 0) return { success: false as const, error: "Kopya cümleler metinde bulunamadı (haber analizden sonra değişmiş olabilir). Yeniden analiz edin." };

  const { text } = await generateText("writer", {
    json: true,
    temperature: 0.8,
    system: "Sen titiz bir Türk haber editörüsün. Başka kaynaklardan aynen alınmış paragrafları, bilgileri değiştirmeden tamamen kendi cümlelerinle yeniden yazarsın.",
    prompt: `Aşağıdaki paragraflarda başka haber sitelerinden aynen alınmış cümleler var. Her paragrafı:
- Aynı bilgileri (isim, rakam, tarih, yer, alıntı yapılan kişinin sözü) koruyarak, kelime seçimi ve cümle yapısı tamamen farklı olacak şekilde yeniden yaz.
- Doğrudan alıntıları (tırnak içindeki sözler) değiştirme; onları "... dedi" gibi atıfla koru.
- HTML etiketlerini koru: paragraf <p> ise <p>, madde <li> ise <li> olarak döndür; <a href> bağlantılarını ve <strong> vurgularını koru.
- Yeni bilgi ekleme, yorum katma, uzunluğu çok değiştirme. Doğru Türkçe yazım kullan.

Paragraflar:
${targets.map((t, i) => `[${i + 1}] ${t}`).join("\n\n")}

Yalnızca şu JSON'u döndür (her paragraf için bir öğe, aynı sırayla):
{ "paragraphs": [ { "id": 1, "html": "<p>...</p>" } ] }`,
  });
  const parsed = parseJsonResponse<{ paragraphs?: { id?: number; html?: string }[] }>(text);
  let content = article.content;
  let rewritten = 0;
  for (const item of parsed.paragraphs ?? []) {
    const original = typeof item.id === "number" ? targets[item.id - 1] : undefined;
    const html = typeof item.html === "string" ? item.html.trim() : "";
    if (!original || !html) continue;
    const tag = original.match(/^<(\w+)/)?.[1]?.toLowerCase();
    // Güvenlik ve yapı: aynı etiketle başlayıp bitmeli, betik/başlık içermemeli
    if (!tag || !new RegExp(`^<${tag}\\b[\\s\\S]*</${tag}>$`, "i").test(html) || /<(script|iframe|h1|style)\b/i.test(html)) continue;
    if (plain(html).length < plain(original).length * 0.5) continue; // bilgi kaybı şüphesi
    content = content.replace(original, html);
    rewritten++;
  }
  if (rewritten === 0) return { success: false as const, error: "Yapay zekâ geçerli bir düzeltme üretemedi; tekrar deneyin." };

  await prisma.article.update({ where: { id: article.id }, data: { content } });
  const analysis = await analyzeArticle(article.id);
  return {
    success: true as const,
    rewritten,
    before,
    after: analysis.success ? analysis.plagiarismRate : null,
    analysis,
  };
}
