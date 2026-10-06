import { after } from "next/server";
import { prisma } from "./prisma";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

import { AiError, cleanHtmlResponse, generateImage, generateText, toAiError } from "./ai/client";
import { analyzeArticle } from "./article-analyzer";
import { fetchPublicResource } from "./server/remote-fetch";
import type { Prisma } from "./generated/client";
import { findPublishedDuplicate } from "./news/stories";
import { LIKELY_DUPLICATE, signature, storySimilarity } from "./news/text";
import { stripLeadingTitleHeading } from "./article-content";
import { WRITER_FORMAT } from "./news/writing-guide";
import { invalidateArticle } from "./server/article-cache";
import { attachTags, buildSeoPackage, uniqueArticleSlug } from "./news/seo";
import { enqueueJob, WORKER_PATH } from "./server/queue";
import { restoreContentSnapshot, takeContentSnapshot } from "./analysis/snapshot";


/** Üretilen kapak görselini Vercel Blob'a kaydeder. */
async function saveCoverImage(buffer: Buffer, mimeType: string) {
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  const { url } = await put(`articles/ai-${Date.now()}.${ext}`, buffer, { access: "public", contentType: mimeType });
  return url;
}

/** Kapak görseli üret; başarısızsa RSS görselini sisteme aktar. */
async function produceCoverImage(imagePromptBase: string, title: string, rssImageUrl: string | null, useRssImageAsReference: boolean) {
  try {
    const prompt = `${imagePromptBase}\nHaber başlığı: "${title}"\nStil: Fotogerçekçi haber fotoğrafı, 16:9, üzerinde yazı veya logo yok.`;
    const image = await generateImage(prompt, { referenceImageUrl: useRssImageAsReference && rssImageUrl ? rssImageUrl : undefined });
    return await saveCoverImage(image.buffer, image.mimeType);
  } catch (error) {
    console.warn("[AI Writer] Kapak görseli üretilemedi:", toAiError(error).message);
  }
  if (!rssImageUrl) return null;
  try {
    const buffer = await fetchPublicResource(rssImageUrl, { maxBytes: 8 * 1024 * 1024 });
    return buffer.length > 0 ? await saveCoverImage(buffer, "image/jpeg") : rssImageUrl;
  } catch {
    return rssImageUrl;
  }
}

const CLAIM_STALE_MS = 15 * 60 * 1000;
const MAX_WRITE_ATTEMPTS = 3;

type WriteResult =
  | { success: true; articleId: string; title: string; slug?: string; skipped?: boolean; reason?: string }
  | { success: false; error: string };

/** Konunun kategorisine göre persona seçer (kategoriye atanmış personalar sırayla, yoksa genel persona). */
async function pickPersona(categoryId: string | null) {
  const personaLink = categoryId
    ? await prisma.aiPersonaOnCategory.findFirst({
        where: { categoryId, persona: { isActive: true } },
        orderBy: { lastUsedAt: "asc" },
        include: { persona: true },
      })
    : null;
  let persona = personaLink?.persona ?? null;
  if (!persona) {
    const general = await prisma.aiPersona.findMany({ where: { isActive: true, categories: { none: {} } } });
    persona = general.length ? general[Math.floor(Math.random() * general.length)] : null;
  }
  if (persona && personaLink) {
    await prisma.aiPersonaOnCategory.update({
      where: { personaId_categoryId: { personaId: persona.id, categoryId: personaLink.categoryId } },
      data: { lastUsedAt: new Date() },
    });
  }
  return persona;
}

async function findCategoryId(name: string | null | undefined) {
  if (!name) return null;
  const category = (await prisma.category.findUnique({ where: { name } }))
    ?? (await prisma.category.findFirst({ where: { name: { contains: name, mode: "insensitive" } } }));
  return category?.id ?? null;
}

function istanbul(d: Date) {
  return d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" });
}

/**
 * Karar Merkezi'ndeki bir konuyu haberleştirir.
 * - Konu atomik olarak kilitlenir (aynı konu iki kez yazılamaz).
 * - Yazmadan hemen önce yayındaki haberlerle son kez karşılaştırılır.
 * - Konudaki tüm kaynaklar birlikte kullanılır; devam haberlerinde önceki habere bağlantı verilir.
 */
export async function writeStory(storyId: string): Promise<WriteResult> {
  const token = randomUUID();
  const claim = await prisma.newsStory.updateMany({
    where: {
      id: storyId,
      articleId: null,
      OR: [
        { status: "READY" },
        { status: "WRITING", processingAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } },
      ],
    },
    data: { status: "WRITING", processingAt: new Date(), processingToken: token, attempts: { increment: 1 } },
  });
  if (claim.count !== 1) {
    return { success: false, error: "Bu konu başka bir işlem tarafından yazılıyor ya da artık yazılabilir durumda değil." };
  }

  const release = async (data: Prisma.NewsStoryUpdateManyMutationInput) =>
    prisma.newsStory.updateMany({ where: { id: storyId, processingToken: token }, data: { processingAt: null, processingToken: null, ...data } });

  try {
    const story = await prisma.newsStory.findUniqueOrThrow({
      where: { id: storyId },
      include: {
        items: {
          orderBy: { publishedAt: "asc" },
          take: 6,
          include: { source: { select: { name: true, language: true } }, article: { select: { id: true } } },
        },
      },
    });
    if (story.items.length === 0) {
      await release({ status: "FAILED", lastError: "Konunun kaynak haberi kalmadı." });
      return { success: false, error: "Konunun kaynak haberi kalmadı." };
    }

    // 1) Son tekrar kontrolü: bu arada aynı haber yayınlandıysa yazma
    const duplicate = await findPublishedDuplicate(story);
    if (duplicate) {
      await release({ status: "DUPLICATE", duplicateArticleId: duplicate.id, score: 0, reason: `Aynı haber zaten yayında: "${duplicate.title}"` });
      return { success: true, articleId: duplicate.id, title: duplicate.title, slug: duplicate.slug, skipped: true, reason: "Aynı haber zaten yayında." };
    }
    // Aynı olayı anlatan başka bir konu şu an yazılıyorsa bekle
    const others = await prisma.newsStory.findMany({ where: { status: "WRITING", id: { not: storyId } }, select: { tokens: true, entities: true } });
    if (others.some((o) => storySimilarity({ tokens: story.tokens, entities: story.entities }, o) >= LIKELY_DUPLICATE)) {
      await release({ status: "READY", attempts: { decrement: 1 } });
      return { success: false, error: "Benzer bir konu şu an yazılıyor; sonra tekrar denenecek." };
    }

    const settings = await prisma.systemSettings.findFirst();
    if (!settings) throw new Error("Sistem ayarları bulunamadı.");

    const categoryId = await findCategoryId(story.categoryName);
    const persona = await pickPersona(categoryId);
    const globalSystemPrompt = settings.aiWriterPrompt || "Sen profesyonel bir haber yazarısın.";
    const systemPrompt = persona?.prompt.trim() ? `${globalSystemPrompt}\n\nÖzel Yazım Talimatları:\n${persona.prompt}` : globalSystemPrompt;
    const imagePromptBase = persona?.imagePrompt.trim() || settings.aiWriterImagePrompt || "Professional news cover image.";
    const useGoogleSearch = settings.aiWriterSearchEnabled || false;

    const related = story.relatedArticleId
      ? await prisma.article.findUnique({ where: { id: story.relatedArticleId }, select: { title: true, slug: true, excerpt: true, publishedAt: true, status: true } })
      : null;

    const sources = story.items
      .map((i, n) => `Kaynak ${n + 1} — ${i.source.name}${i.publishedAt ? ` (${istanbul(i.publishedAt)})` : ""}\nBaşlık: ${i.title}\nÖzet: ${i.excerpt || "(yok)"}`)
      .join("\n\n");
    const textPrompt = `Bugün: ${istanbul(new Date())}
Konu: ${story.headline || story.title}
${story.summary ? `Olay özeti: ${story.summary}\n` : ""}${story.eventAt ? `Olay zamanı: ${istanbul(story.eventAt)} — zaman ifadelerini (geçmiş/gelecek) buna göre doğru kullan.\n` : ""}
Aşağıdaki ${story.items.length} kaynağın bilgilerini birleştirerek tek, özgün ve kapsamlı bir haber yaz. Kaynaklar arasında çelişki varsa bunu belirt.

${sources}
${related ? `\nBU BİR DEVAM HABERİDİR. Daha önce şu haberi yayımladık: "${related.title}"${related.publishedAt ? ` (${istanbul(related.publishedAt)})` : ""}. ${related.excerpt ?? ""}
Önceki haberi tekrar etme; yeni gelişmeye odaklan, gerekirse tek cümlelik bağlam ver.` : ""}${useGoogleSearch ? "\nKonuyu web/Google araması ile doğrula ve en güncel bilgileri kullan." : ""}`;

    const { text: rawContent, model: usedModel } = await generateText("writer", {
      system: `${systemPrompt}\n\n${WRITER_FORMAT}`,
      prompt: textPrompt,
      search: useGoogleSearch,
      temperature: 0.7,
    });
    const sourceTitle = (story.headline || story.title).trim().slice(0, 140);
    let content = stripLeadingTitleHeading(sourceTitle, cleanHtmlResponse(rawContent));
    if (!content) throw new Error("Yapay zekâ metin üretemedi.");
    console.log(`[AI Writer] Metin üretildi: ${usedModel}`);

    // SEO paketi: özgün arama başlığı, meta açıklama (spot) ve etiketler
    const seo = await buildSeoPackage({ title: sourceTitle, content, summary: story.summary, category: story.categoryName });
    const title = seo.title;
    content = stripLeadingTitleHeading(title, content);
    if (related?.status === "PUBLISHED") {
      content += `\n<p><strong>İlgili haber:</strong> <a href="/article/${related.slug}">${escapeHtml(related.title)}</a></p>`;
    }

    const rssImage = story.items.find((i) => i.imageUrl)?.imageUrl ?? null;
    const imageUrl = await produceCoverImage(imagePromptBase, title, rssImage, settings.aiWriterUseRssImage !== false);

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");
    await addToMediaLibrary(imageUrl, adminUser.id);

    // Kaynak bağlantısı için henüz makaleye bağlanmamış ilk haber
    const primaryItem = story.items.find((i) => !i.article) ?? null;
    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title,
          slug: await uniqueArticleSlug(title, tx),
          content,
          excerpt: seo.description || story.summary || story.items[0].excerpt,
          coverImage: imageUrl,
          status: "PUBLISHED",
          authorId: adminUser.id,
          sourceRssItemId: primaryItem?.id ?? null,
          aiPersonaId: persona?.id ?? null,
          categoryId,
          publishedAt: new Date(),
          lang: story.items[0].source.language || "tr",
        },
      });
      const done = await tx.newsStory.updateMany({
        where: { id: storyId, processingToken: token },
        data: { status: "PUBLISHED", articleId: created.id, processingAt: null, processingToken: null, lastError: null, reason: null },
      });
      if (done.count !== 1) throw new Error("Konu kilidi kayboldu; haber kaydedilmedi.");
      await tx.rssFeedItem.updateMany({ where: { storyId }, data: { usedForArticle: true } });
      return created;
    });

    await attachTags(article.id, seo.tags, article.lang);
    await invalidateArticle(article.slug);
    await afterPublish(article);
    return { success: true, articleId: article.id, title: article.title, slug: article.slug };
  } catch (error) {
    const aiError = error instanceof AiError ? error : null;
    const message = aiError
      ? `${aiError.message}${aiError.raw ? ` Ayrıntı: ${aiError.raw}` : ""}`
      : error instanceof Error ? error.message : "AI ile haber üretimi tamamlanamadı.";
    console.error("AI Writer Hatası:", message);
    const current = await prisma.newsStory.findUnique({ where: { id: storyId }, select: { attempts: true } }).catch(() => null);
    const failed = (current?.attempts ?? 0) >= MAX_WRITE_ATTEMPTS;
    await release({
      status: failed ? "FAILED" : "READY",
      lastError: message.slice(0, 500),
      ...(failed && { reason: `${MAX_WRITE_ATTEMPTS} denemede yazılamadı: ${message.slice(0, 200)}` }),
    }).catch((e) => console.error("AI Writer kilit bırakma hatası:", e));
    return { success: false, error: message };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function addToMediaLibrary(imageUrl: string | null, userId: string) {
  if (!imageUrl || !imageUrl.includes("public.blob.vercel-storage.com")) return;
  await prisma.media.create({
    data: { url: imageUrl, filename: imageUrl.split("/").pop() || `Cover_${Date.now()}.png`, size: 0, mimeType: "image/png", status: "RAW", userId },
  }).catch((e) => console.error("Media kütüphanesine eklenemedi:", e));
}

/** Yayın sonrası: Google bildirimi ve Telegram (yanıt beklenmez), ardından kalite işi. */
export async function afterPublish(article: { id: string; title: string; slug: string; excerpt: string | null; coverImage: string | null }) {
  try {
    const { notifyGoogle, getArticleUrl } = await import("./google-indexing");
    after(() => notifyGoogle(getArticleUrl(article.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));
    const { publishToTelegram } = await import("./social-publisher");
    after(() => publishToTelegram({ title: article.title, excerpt: article.excerpt, slug: article.slug, coverImage: article.coverImage }).catch(err => console.error("Telegram publish error:", err)));
  } catch (e) {
    console.error("Yayın sonrası bildirimler yüklenemedi:", e);
  }

  // Analiz ve özgünleştirme birkaç dakika sürebilir: üretimde ayrı bir işçide (kendi süre sınırıyla) çalışır
  const queued = await enqueueJob(WORKER_PATH, { task: "quality", articleId: article.id }).catch((e) => {
    console.warn("[AI Writer] Kalite işi kuyruğa alınamadı, bu istekte çalışacak:", e instanceof Error ? e.message : e);
    return false;
  });
  if (!queued) after(() => runQualityPass(article.id));
}

const COPY_FIX_THRESHOLD = 10;
const FULL_REWRITE_THRESHOLD = 30;

/**
 * Yeni yayımlanan haberin kalite işi: analiz → kaynaklardan aynen alınmış paragrafları özgünleştirme
 * (en fazla 2 tur) → oran hâlâ yüksekse metnin tamamını yeniden yazma. Her düzeltme yalnızca oranı
 * düşürdüyse kalır; aksi halde önceki metin geri yüklenir.
 */
export async function runQualityPass(articleId: string) {
  try {
    const analysis = await analyzeArticle(articleId);
    if (!analysis.success) return;
    let rate = analysis.plagiarismRate;

    const { fixCopiedPassages } = await import("./analysis/fix-copies");
    for (let round = 1; round <= 2 && rate > COPY_FIX_THRESHOLD; round++) {
      console.log(`[AI Writer] Kaynaklarla aynen örtüşme %${rate}; kopya paragraflar özgünleştiriliyor (${round}/2)`);
      const fixed = await fixCopiedPassages(articleId).catch((e) => ({ success: false as const, error: String(e) }));
      if (!fixed.success || fixed.after === null) break;
      rate = fixed.after;
    }

    if (rate > FULL_REWRITE_THRESHOLD) {
      console.log(`[AI Writer] Örtüşme hâlâ %${rate}; metin tamamen yeniden yazılıyor`);
      await rewriteArticleWithAI(articleId, { originalityRate: rate, notify: false });
    }
  } catch (e) {
    console.error("[AI Writer] Otomatik kalite işi hatası:", e);
  }
}

/** Bir RSS haberinden yazım (eski uç noktalar için): haberin konusu yoksa tek haberlik konu açılır. */
export async function writeArticleWithAI(suggestionId: string): Promise<WriteResult> {
  const item = await prisma.rssFeedItem.findUnique({
    where: { id: suggestionId },
    select: { id: true, title: true, storyId: true, publishedAt: true, createdAt: true, article: { select: { id: true, title: true } } },
  });
  if (!item) return { success: false, error: "Öneri bulunamadı." };
  if (item.article) return { success: true, articleId: item.article.id, title: item.article.title, skipped: true };

  let storyId = item.storyId;
  if (!storyId) {
    const sigs = signature(item.title);
    const at = item.publishedAt ?? item.createdAt;
    const story = await prisma.newsStory.create({
      data: { title: item.title, tokens: sigs.tokens, entities: sigs.entities, firstSeenAt: at, lastSeenAt: at, status: "READY", items: { connect: { id: item.id } } },
    });
    storyId = story.id;
  } else {
    // Elle yazdırılan konu eşiğin altında olsa da yazılabilir
    await prisma.newsStory.updateMany({ where: { id: storyId, status: { in: ["NEW", "LOW_SCORE", "EXPIRED", "DISMISSED", "FAILED"] } }, data: { status: "READY", attempts: 0 } });
  }
  return writeStory(storyId);
}

/** Son analizdeki eksik ve önerileri yeniden yazım talimatına dönüştürür (varsa) */
function analysisNotes(report: unknown) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return "";
  const r = report as { fixes?: unknown; suggestions?: unknown; seo?: { focusKeyword?: unknown }; quality?: { issues?: unknown } };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  // Spot, kapak görseli ve etiket gibi metin dışı eksikler yeniden yazımla düzelmez
  const items = [...list(r.quality?.issues), ...list(r.fixes), ...list(r.suggestions)]
    .filter((x) => !/spot|kapak|görsel|etiket|adres|url/i.test(x))
    .slice(0, 10);
  const keyword = typeof r.seo?.focusKeyword === "string" ? r.seo.focusKeyword : null;
  if (!items.length && !keyword) return "";
  return `\nSon kalite analizinde tespit edilenler; yeniden yazarken bunları gider:\n${items.map((x) => `- ${x}`).join("\n")}${keyword ? `\n- Odak ifade: "${keyword}" (giriş paragrafında ve bir ara başlıkta doğal biçimde kullan)` : ""}\n`;
}

interface RewriteOptions {
  /** Otomatik özgünleştirme: kopya oranı bu değerden düşmezse önceki metin geri yüklenir */
  originalityRate?: number;
  /** Yayındaki haber için Google'a güncelleme bildirimi (yeni yayımlanan haberde zaten gönderildi) */
  notify?: boolean;
}

export async function rewriteArticleWithAI(articleId: string, options: RewriteOptions = {}) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { aiPersona: true }
    });
    if (!article) throw new Error("Makale bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();
    const systemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber editörüsün.";
    const finalPrompt = article.aiPersona?.prompt.trim()
      ? `${systemPrompt}\n\nÖzel Yazım Talimatları:\n${article.aiPersona.prompt}`
      : systemPrompt;
    const auto = options.originalityRate !== undefined;
    const task = auto
      ? `Bu haberin metninin %${options.originalityRate}'i başka haber sitelerindeki cümlelerle aynı. Aynı bilgileri (isim, rakam, tarih, yer, doğrudan alıntılar) koruyarak metni kelime seçimi ve cümle yapısı tamamen farklı, özgün ve tarafsız bir dille yeniden yaz. Bağlantıları (<a href>) koru; yeni bilgi ekleme.`
      : "Aşağıdaki haberi tamamen özgün, akıcı ve yüksek kaliteli olacak şekilde yeniden yaz. Anlatım bozukluklarını düzelt, bilgileri ve bağlantıları koru.";

    console.log(`[AI Writer] ${auto ? "Otomatik özgünleştirme" : "Manuel yeniden yazım"}: "${article.title}" (${article.id})`);

    const { text } = await generateText("writer", {
      system: `${finalPrompt}\n\n${WRITER_FORMAT}`,
      prompt: `${task}
${auto ? "" : analysisNotes(article.analysisReport)}
Başlık: ${article.title}

Mevcut metin:
${article.content.slice(0, 20000)}`,
      search: !auto && (settings?.aiWriterSearchEnabled ?? false),
      temperature: auto ? 0.8 : 0.7,
    });
    const content = stripLeadingTitleHeading(article.title, cleanHtmlResponse(text));
    if (!content) throw new Error("Yeniden yazım başarısız oldu, içerik üretilemedi.");

    const snapshot = auto ? await takeContentSnapshot(articleId) : null;
    const updatedArticle = await prisma.article.update({ where: { id: articleId }, data: { content } });
    await invalidateArticle(updatedArticle.slug);

    const analysis = await analyzeArticle(articleId);
    if (auto && snapshot && analysis.success && analysis.plagiarismRate >= options.originalityRate!) {
      await invalidateArticle(await restoreContentSnapshot(articleId, snapshot));
      console.log(`[AI Writer] Yeniden yazım oranı düşürmedi (%${analysis.plagiarismRate}); önceki metin korundu`);
      return { success: false as const, error: "Yeniden yazım kopya oranını düşürmedi; önceki metin korundu." };
    }

    if (updatedArticle.status === "PUBLISHED" && options.notify !== false) {
      const { notifyGoogle, getArticleUrl } = await import("./google-indexing");
      after(() => notifyGoogle(getArticleUrl(updatedArticle.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));
    }

    return { success: true as const, analysis };
  } catch (error: unknown) {
    const errMsg = error instanceof AiError
      ? `${error.message}${error.raw ? ` Ayrıntı: ${error.raw}` : ""}`
      : error instanceof Error ? error.message : String(error);
    console.error("Yeniden Yazım Hatası:", errMsg);
    return { success: false as const, error: errMsg };
  }
}
