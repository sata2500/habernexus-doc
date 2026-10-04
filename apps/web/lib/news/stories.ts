import "server-only";

import type { Prisma, StoryUrgency } from "@/lib/generated/client";
import { prisma } from "@/lib/prisma";
import { AiError, generateText, parseJsonResponse } from "@/lib/ai/client";
import { DEFAULT_EDITORIAL_CRITERIA } from "@/lib/ai-analyzer";
import {
  buildIdf, keyTokens, LIKELY_DUPLICATE, POSSIBLE_DUPLICATE, SAME_STORY, signature, storySimilarity, timeHints,
  type TitleSignature,
} from "./text";
import { computeScore, deriveExpiry, VALIDITY_HOURS } from "./score";

/**
 * Karar Merkezi boru hattı:
 *   RSS haberi → konu kümesi (NewsStory) → yapay zekâ analizi (tekrar / devam / aciliyet / değer)
 *   → Google Trends eşleşmesi → puan → yazım sırası.
 * Her adım tekrar çalıştırılabilir (idempotent) ve yapay zekâ yokken kural tabanlı çalışır.
 */

const HOUR = 3_600_000;
/** Yeni haberlerin eşleştirileceği konu penceresi */
const STORY_WINDOW_HOURS = 72;
/** Yayınlanmış bir konuya bu süreden sonra gelen haber "devam haberi" adayıdır */
const FOLLOW_UP_AFTER_HOURS = 6;
/** Yapay zekânın "haber değeri yok" dediği sınır */
const LOW_VALUE = 35;
const ANALYZE_BATCH = 12;
/** Kural tabanlı değerlendirilen konular bu süre boyunca yapay zekâyla yeniden denenir */
const FALLBACK_RETRY_HOURS = 12;

export const OPEN_STATUSES = ["NEW", "READY", "WRITING"] as const;

type StoryRow = {
  id: string;
  title: string;
  tokens: string[];
  entities: string[];
  status: string;
  articleId: string | null;
  expiresAt: Date | null;
  article: { publishedAt: Date | null } | null;
  /** Konu başlığı ve konudaki haberlerin başlıkları */
  sigs: TitleSignature[];
};

/** Konunun en çok benzeyen başlığıyla benzerlik (konu birden fazla haberden oluşabilir) */
function bestSimilarity(target: TitleSignature, sigs: TitleSignature[], idf?: (t: string) => number) {
  let best = 0;
  for (const s of sigs) best = Math.max(best, storySimilarity(target, s, idf));
  return best;
}

const ITEM_TITLES = { orderBy: { publishedAt: "asc" as const }, take: 6, select: { title: true } };

function sig(s: { tokens: string[]; entities: string[] }): TitleSignature {
  return { tokens: s.tokens, entities: s.entities };
}

/** Konudaki farklı kaynak ve haber sayısını yeniden hesaplar. */
async function refreshCounts(storyIds: string[]) {
  if (storyIds.length === 0) return;
  const items = await prisma.rssFeedItem.findMany({
    where: { storyId: { in: storyIds } },
    select: { storyId: true, sourceId: true, publishedAt: true, createdAt: true },
  });
  const byStory = new Map<string, { sources: Set<string>; count: number; first: number; last: number }>();
  for (const it of items) {
    const at = (it.publishedAt ?? it.createdAt).getTime();
    const s = byStory.get(it.storyId!) ?? { sources: new Set(), count: 0, first: at, last: at };
    s.sources.add(it.sourceId);
    s.count++;
    s.first = Math.min(s.first, at);
    s.last = Math.max(s.last, at);
    byStory.set(it.storyId!, s);
  }
  await prisma.$transaction(
    [...byStory].map(([id, s]) =>
      prisma.newsStory.update({
        where: { id },
        data: { sourceCount: s.sources.size, itemCount: s.count, firstSeenAt: new Date(s.first), lastSeenAt: new Date(Math.max(s.last, Date.now() - 1)) },
      })
    )
  );
}

/**
 * 1) Kümelendirme: konusu belirlenmemiş haberleri mevcut konulara bağlar ya da yeni konu açar.
 * Yapay zekâ kullanmaz; hızlıdır ve her taramadan sonra çalışır.
 */
export async function clusterNewItems(limit = 400) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { maxNewsAgeHours: true } });
  const maxAge = settings?.maxNewsAgeHours ?? 24;
  const since = new Date(Date.now() - STORY_WINDOW_HOURS * HOUR);

  const items = await prisma.rssFeedItem.findMany({
    where: {
      storyId: null,
      usedForArticle: false,
      dismissed: false,
      status: { notIn: ["EXPIRED_STALE", "DISMISSED"] },
      createdAt: { gte: since },
    },
    orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, title: true, sourceId: true, publishedAt: true, createdAt: true },
  });
  if (items.length === 0) return { assigned: 0, created: 0, skipped: 0 };

  const stories: StoryRow[] = (await prisma.newsStory.findMany({
    where: { lastSeenAt: { gte: since } },
    select: { id: true, title: true, tokens: true, entities: true, status: true, articleId: true, expiresAt: true, article: { select: { publishedAt: true } }, items: ITEM_TITLES },
  })).map(({ items, ...s }) => ({ ...s, sigs: [sig(s), ...items.map((i) => signature(i.title))] }));

  const idf = buildIdf([...stories.map((s) => s.tokens), ...items.map((i) => keyTokens(i.title))]);
  const touched = new Set<string>();
  let assigned = 0, created = 0, skipped = 0;

  for (const item of items) {
    const at = item.publishedAt ?? item.createdAt;
    // Çok eski haberler konu açmaz (tarayıcının yaş sınırıyla aynı kural)
    if (maxAge > 0 && Date.now() - at.getTime() > maxAge * HOUR) {
      await prisma.rssFeedItem.update({ where: { id: item.id }, data: { status: "EXPIRED_STALE" } });
      skipped++;
      continue;
    }

    const itemSig = signature(item.title);
    let best: StoryRow | null = null;
    let bestSim = 0;
    for (const s of stories) {
      const sim = bestSimilarity(itemSig, s.sigs, idf);
      if (sim > bestSim) { bestSim = sim; best = s; }
    }

    let relatedArticleId: string | null = null;
    if (best && bestSim >= SAME_STORY) {
      // Süresi dolmuş konuya (ör. olay saati geçmiş ön haber) eklenmez; yeni aşama yeni konudur
      let attach = best.status !== "EXPIRED" && !(best.expiresAt && best.expiresAt.getTime() <= at.getTime());
      if (best.status === "PUBLISHED") {
        // Yayınlanmış konuya yalnızca neredeyse aynı başlık ve kısa süre içinde gelen haber eklenir;
        // aksi halde yeni gelişme olabilir: ayrı konu açılır ve "devam haberi" adayı olarak değerlendirilir.
        const publishedAt = best.article?.publishedAt ?? null;
        const late = !publishedAt || at.getTime() - publishedAt.getTime() > FOLLOW_UP_AFTER_HOURS * HOUR;
        attach = bestSim >= LIKELY_DUPLICATE && !late;
        if (!attach) relatedArticleId = best.articleId;
      }
      if (attach) {
        await prisma.rssFeedItem.update({ where: { id: item.id }, data: { storyId: best.id } });
        best.sigs.push(itemSig);
        // Değerlendirilmiş konuya yeni bir açıdan haber geldiyse başlık, özet ve aciliyet yeniden değerlendirilir
        if (best.status === "READY" && bestSim < LIKELY_DUPLICATE) {
          await prisma.newsStory.updateMany({ where: { id: best.id, status: "READY" }, data: { status: "NEW" } });
          best.status = "NEW";
        }
        touched.add(best.id);
        assigned++;
        continue;
      }
    }

    const story = await prisma.newsStory.create({
      data: {
        title: item.title,
        tokens: itemSig.tokens,
        entities: itemSig.entities,
        firstSeenAt: at,
        lastSeenAt: at,
        relatedArticleId,
        items: { connect: { id: item.id } },
      },
      select: { id: true, title: true, tokens: true, entities: true, status: true, articleId: true, expiresAt: true },
    });
    stories.push({ ...story, article: null, sigs: [itemSig] });
    touched.add(story.id);
    created++;
  }

  await refreshCounts([...touched]);
  return { assigned, created, skipped };
}

interface AiStoryResult {
  id: string;
  newsworthiness: number;
  category?: string;
  headline?: string;
  summary?: string;
  duplicateOfArticle?: string | null;
  followUpOfArticle?: string | null;
  sameAsStory?: string | null;
  urgency?: string;
  eventAt?: string | null;
  validHours?: number | null;
  reasoning?: string;
}

const URGENCIES: StoryUrgency[] = ["BREAKING", "TIME_SENSITIVE", "NORMAL", "EVERGREEN"];

function istanbulTime(d: Date) {
  return d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });
}

/**
 * 2) Analiz: yeni konuları yapay zekâyla değerlendirir. Yayındaki haberlerle tekrar/devam ilişkisi,
 * aynı olayın başka konusu, aciliyet, olay zamanı, kategori ve özgün başlık belirlenir.
 */
export async function analyzeStories(
  limit = ANALYZE_BATCH,
  /** Testler için: yapay zekâ çağrısının yerine geçen fonksiyon */
  options: { complete?: (prompt: string) => Promise<string> } = {},
) {
  const now = new Date();
  const hasKeys = !!(options.complete || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY);
  // Yapay zekâ yokken değerlendirme ucuzdur; bekleyen tüm konular tek seferde işlenir
  if (!hasKeys) limit = Math.max(limit, 300);
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

  const stories = await prisma.newsStory.findMany({
    where: {
      OR: [
        { status: "NEW" },
        // Yapay zekâ yokken kural tabanlı değerlendirilenler, sonra tekrar denenir
        { status: "READY", analysis: { path: ["fallback"], equals: true }, analyzedAt: { lt: new Date(now.getTime() - HOUR) }, firstSeenAt: { gte: new Date(now.getTime() - FALLBACK_RETRY_HOURS * HOUR) } },
      ],
    },
    orderBy: [{ sourceCount: "desc" }, { firstSeenAt: "desc" }],
    take: limit,
    include: {
      items: {
        orderBy: { publishedAt: "asc" },
        take: 5,
        select: { id: true, title: true, excerpt: true, publishedAt: true, source: { select: { name: true, categoryHint: true } } },
      },
    },
  });
  if (stories.length === 0) return { analyzed: 0, duplicates: 0, merged: 0, ready: 0, aiUsed: false as boolean, error: undefined as string | undefined };

  // Tekrar kontrolü için son 7 günün yayınları ve açık konular
  const [articles, openStories, categories] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: new Date(now.getTime() - 7 * 24 * HOUR) } },
      select: { id: true, title: true, excerpt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 600,
    }),
    prisma.newsStory.findMany({
      where: { status: { in: ["NEW", "READY", "WRITING"] }, lastSeenAt: { gte: new Date(now.getTime() - STORY_WINDOW_HOURS * HOUR) } },
      select: { id: true, title: true, tokens: true, entities: true, status: true, items: ITEM_TITLES },
    }),
    prisma.category.findMany({ select: { name: true } }),
  ]);
  const articleSigs = articles.map((a) => ({ ...a, sig: signature(a.title) }));
  const idf = buildIdf([...articleSigs.map((a) => a.sig.tokens), ...openStories.map((s) => s.tokens)]);

  // Her konu için aday makaleler ve kardeş konular
  const context = stories.map((story) => {
    const sigs = [sig(story), ...story.items.map((i) => signature(i.title))];
    const best = (target: TitleSignature) => Math.max(...sigs.map((s) => storySimilarity(s, target, idf)));
    const candidates = articleSigs
      .map((a) => ({ a, sim: best(a.sig) }))
      .filter((x) => x.sim >= POSSIBLE_DUPLICATE || x.a.id === story.relatedArticleId)
      .sort((x, y) => y.sim - x.sim)
      .slice(0, 4);
    const siblings = openStories
      .filter((s) => s.id !== story.id)
      .map((s) => ({ s, sim: Math.max(best(sig(s)), ...s.items.map((i) => best(signature(i.title)))) }))
      .filter((x) => x.sim >= POSSIBLE_DUPLICATE)
      .sort((x, y) => y.sim - x.sim)
      .slice(0, 3);
    return { story, candidates, siblings };
  });

  let duplicates = 0, merged = 0, ready = 0, analyzed = 0;
  const results = new Map<string, AiStoryResult>();
  let aiUsed = false;
  let error: string | undefined;

  if (hasKeys) {
    try {
      const editorial = settings?.aiAnalyzerPrompt?.trim() || DEFAULT_EDITORIAL_CRITERIA;
      const blocks = context.map(({ story, candidates, siblings }) => {
        const sources = story.items.map((i) => `  - ${i.source.name}${i.publishedAt ? ` (${istanbulTime(i.publishedAt)})` : ""}: ${i.title}`).join("\n");
        const excerpt = story.items.find((i) => i.excerpt)?.excerpt?.slice(0, 300) ?? "";
        const arts = candidates.map(({ a }) => `  - [${a.id}] ${a.title} (yayın: ${a.publishedAt ? istanbulTime(a.publishedAt) : "?"})`).join("\n");
        const sibs = siblings.map(({ s }) => `  - [${s.id}] ${s.title}`).join("\n");
        return `KONU [${story.id}] — ${story.sourceCount} kaynak
Haberler:
${sources}
Özet: ${excerpt || "(yok)"}
${arts ? `Yayındaki benzer haberlerimiz:\n${arts}\n` : ""}${sibs ? `Sıradaki benzer konular:\n${sibs}\n` : ""}`;
      }).join("\n---\n");

      const prompt = `Şu an (İstanbul saati): ${istanbulTime(now)}
Bir haber sitesinin yayın masasısın. Aşağıdaki konuları değerlendir.

Editoryal kriterler:
${editorial}

Kurallar:
- "newsworthiness": 0-100 haber değeri. Okur ilgisi, önem ve güncellik.
- "duplicateOfArticle": Konu, "yayındaki benzer haberlerimiz"den biriyle AYNI olayı anlatıyorsa ve yeni bir bilgi içermiyorsa o haberin kimliği; değilse null.
- "followUpOfArticle": Konu yayındaki bir haberin önemli YENİ GELİŞMESİ ise (sonuç, açıklama, yeni rakam) o haberin kimliği; değilse null. Aynı bilgiyi tekrar eden haber devam haberi değildir.
- "sameAsStory": Konu, "sıradaki benzer konular"dan biriyle aynı olaysa onun kimliği; değilse null.
- "urgency": BREAKING (son dakika, hemen yazılmalı) | TIME_SENSITIVE (belirli bir zamana bağlı: maç, seçim, karar, etkinlik) | NORMAL | EVERGREEN (uzun süre güncel kalır).
- "eventAt": Haber gelecekteki planlı bir olayı anlatıyorsa (ör. yarınki maç) olayın ISO 8601 zamanı (+03:00); yoksa null.
- "validHours": Haberin kaç saat boyunca yazılmaya değer kalacağı (1-168).
- "category": Yalnızca şu listeden: ${categories.map((c) => c.name).join(", ") || "Gündem"}
- "headline": Kaynakları kopyalamayan, en fazla 90 karakterlik özgün Türkçe başlık.
- "summary": Olayı anlatan 1-2 cümle.
- "reasoning": Kararın kısa gerekçesi.

${blocks}

Yanıt (yalnızca JSON): { "items": [ { "id": "...", "newsworthiness": 0, "category": "...", "headline": "...", "summary": "...", "duplicateOfArticle": null, "followUpOfArticle": null, "sameAsStory": null, "urgency": "NORMAL", "eventAt": null, "validHours": 24, "reasoning": "..." } ] }`;

      const text = options.complete
        ? await options.complete(prompt)
        : (await generateText("analyzer", { prompt, json: true, temperature: 0.2 })).text;
      const parsed = parseJsonResponse<{ items?: AiStoryResult[] }>(text);
      for (const r of parsed.items ?? []) if (r && typeof r.id === "string") results.set(r.id, r);
      aiUsed = results.size > 0;
    } catch (e) {
      error = e instanceof AiError ? `${e.message}${e.raw ? ` Ayrıntı: ${e.raw}` : ""}` : e instanceof Error ? e.message : String(e);
      console.error("[Stories] Yapay zekâ analizi başarısız, kural tabanlı devam ediliyor:", error);
    }
  } else {
    error = "Yapay zekâ anahtarı tanımlı değil; kural tabanlı değerlendirildi.";
  }

  const mergedAway = new Set<string>();
  for (const { story, candidates, siblings } of context) {
    if (mergedAway.has(story.id)) continue;
    analyzed++;
    const ai = results.get(story.id);
    const articleIds = new Set(candidates.map((c) => c.a.id));
    const siblingIds = new Set(siblings.map((s) => s.s.id).filter((id) => !mergedAway.has(id)));
    const topArticle = candidates[0];

    // a) Aynı olayın başka bir konusu → birleştir
    const sameAs = ai?.sameAsStory && siblingIds.has(ai.sameAsStory) ? ai.sameAsStory : null;
    if (sameAs) {
      await prisma.rssFeedItem.updateMany({ where: { storyId: story.id }, data: { storyId: sameAs } });
      await prisma.newsStory.delete({ where: { id: story.id } });
      await refreshCounts([sameAs]);
      mergedAway.add(story.id);
      merged++;
      continue;
    }

    const firstAt = story.firstSeenAt;
    const hints = timeHints(`${story.title} ${story.items.map((i) => `${i.title} ${i.excerpt ?? ""}`).join(" ")}`);
    const urgency: StoryUrgency = ai?.urgency && URGENCIES.includes(ai.urgency as StoryUrgency)
      ? (ai.urgency as StoryUrgency)
      : hints.breaking ? "BREAKING" : hints.upcoming ? "TIME_SENSITIVE" : "NORMAL";
    const eventAt = parseEventAt(ai?.eventAt, now);
    const validHours = typeof ai?.validHours === "number" ? Math.round(ai.validHours) : null;
    const expiresAt = deriveExpiry(firstAt, urgency, eventAt, validHours);
    const categoryName = ai?.category?.trim() || story.items[0]?.source.categoryHint || null;
    const aiScore = ai ? clampScore(ai.newsworthiness) : null;

    const base: Prisma.NewsStoryUpdateInput = {
      urgency, eventAt, expiresAt, categoryName,
      aiScore,
      headline: ai?.headline?.trim().slice(0, 140) || null,
      summary: ai?.summary?.trim().slice(0, 600) || null,
      analyzedAt: now,
    };

    // b) Yayındaki haberin tekrarı mı?
    const aiDuplicate = ai?.duplicateOfArticle && articleIds.has(ai.duplicateOfArticle) ? ai.duplicateOfArticle : null;
    const aiFollowUp = ai?.followUpOfArticle && articleIds.has(ai.followUpOfArticle) ? ai.followUpOfArticle : null;
    // Yapay zekâ yoksa ya da "devam haberi" demediyse: çok benzer başlık kesin tekrar sayılır
    const ruleDuplicate = !aiFollowUp && topArticle && topArticle.sim >= LIKELY_DUPLICATE ? topArticle.a.id : null;
    const duplicateOf = aiDuplicate ?? (ai ? (ruleDuplicate && !story.relatedArticleId ? ruleDuplicate : null) : ruleDuplicate);
    if (duplicateOf) {
      const dup = candidates.find((c) => c.a.id === duplicateOf)!.a;
      await prisma.newsStory.update({
        where: { id: story.id },
        data: { ...base, status: "DUPLICATE", duplicateArticleId: dup.id, score: 0, reason: `Aynı haber zaten yayında: "${dup.title}"`, analysis: analysisJson(ai, null) },
      });
      duplicates++;
      continue;
    }

    // c) Devam haberi ise önceki makaleyle ilişkilendir; değilse ilişkiyi kaldır
    const relatedArticleId = aiFollowUp ?? (ai ? null : story.relatedArticleId);

    if (aiScore !== null && aiScore < LOW_VALUE) {
      await prisma.newsStory.update({
        where: { id: story.id },
        data: { ...base, relatedArticleId, status: "LOW_SCORE", score: 0, reason: ai?.reasoning ? `Haber değeri düşük: ${ai.reasoning}` : "Haber değeri düşük", analysis: analysisJson(ai, null) },
      });
      continue;
    }

    const scored = computeScore({ aiScore, sourceCount: story.sourceCount, trendScore: story.trendScore, startAt: firstAt, urgency, eventAt, expiresAt }, now);
    if (scored.expired) {
      await prisma.newsStory.update({
        where: { id: story.id },
        data: { ...base, relatedArticleId, status: "EXPIRED", score: 0, reason: "Güncelliğini yitirdi", analysis: analysisJson(ai, scored.parts) },
      });
      continue;
    }

    await prisma.newsStory.update({
      where: { id: story.id },
      data: {
        ...base,
        relatedArticleId,
        status: "READY",
        score: scored.total,
        reason: ai?.reasoning?.slice(0, 300) || (ai ? null : "Kural tabanlı değerlendirildi (yapay zekâ kullanılamadı)"),
        analysis: analysisJson(ai, scored.parts),
      },
    });
    ready++;
  }

  return { analyzed, duplicates, merged, ready, aiUsed, error };
}

function analysisJson(ai: AiStoryResult | undefined, parts: object | null): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify({ fallback: !ai, parts, ai: ai ?? null }));
}

function clampScore(n: unknown) {
  return Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
}

function parseEventAt(raw: unknown, now: Date): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Makul aralık dışındaki tarihleri yok say
  if (d.getTime() < now.getTime() - 2 * 24 * HOUR || d.getTime() > now.getTime() + 14 * 24 * HOUR) return null;
  return d;
}

/**
 * 3) Google Trends eşleşmesi: son 24 saatin trendleri açık konularla karşılaştırılır.
 * Trend kelimelerinin konu başlığında geçme oranı × trendin trafik puanı = trend puanı.
 */
export async function matchTrendsToStories() {
  const since = new Date(Date.now() - 24 * HOUR);
  const [trends, stories] = await Promise.all([
    prisma.googleTrend.findMany({ where: { updatedAt: { gte: since } }, orderBy: { trafficScore: "desc" }, take: 60 }),
    prisma.newsStory.findMany({
      where: { status: { in: ["NEW", "READY", "WRITING"] }, lastSeenAt: { gte: new Date(Date.now() - STORY_WINDOW_HOURS * HOUR) } },
      select: { id: true, tokens: true, trendScore: true, trendKeyword: true, items: { select: { title: true, excerpt: true }, take: 5 } },
    }),
  ]);

  const trendTokens = trends.map((t) => ({ t, tokens: keyTokens(t.keyword) })).filter((x) => x.tokens.length > 0);
  let matched = 0;
  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (const story of stories) {
    const bag = new Set([...story.tokens, ...story.items.flatMap((i) => keyTokens(`${i.title} ${i.excerpt ?? ""}`))]);
    let bestScore = 0;
    let bestKeyword: string | null = null;
    for (const { t, tokens } of trendTokens) {
      const hits = tokens.filter((k) => bag.has(k)).length;
      // Tek kelimelik trendler için kelime anlamlı uzunlukta olmalı; çok kelimelilerde çoğunluk eşleşmeli
      const quality = tokens.length === 1 ? (hits === 1 && tokens[0].length >= 4 ? 1 : 0) : hits / tokens.length;
      if (quality < (tokens.length <= 2 ? 1 : 0.6)) continue;
      const score = Math.round(t.trafficScore * quality);
      if (score > bestScore) { bestScore = score; bestKeyword = t.keyword; }
    }
    if (bestScore !== story.trendScore || bestKeyword !== story.trendKeyword) {
      updates.push(prisma.newsStory.update({ where: { id: story.id }, data: { trendScore: bestScore, trendKeyword: bestKeyword } }));
    }
    if (bestScore > 0) matched++;
  }
  if (updates.length) await prisma.$transaction(updates);
  return { matched, trends: trends.length };
}

/**
 * 4) Yeniden puanlama: tazelik zamanla düştüğü için puanlar her çalışmada güncellenir;
 * süresi dolan konular "güncelliğini yitirdi" olarak ayrılır.
 */
export async function rescoreStories() {
  const now = new Date();
  const stories = await prisma.newsStory.findMany({
    where: { status: { in: ["NEW", "READY"] } },
    select: { id: true, status: true, aiScore: true, sourceCount: true, trendScore: true, firstSeenAt: true, urgency: true, eventAt: true, expiresAt: true, analysis: true },
  });
  let expired = 0;
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const s of stories) {
    const expiresAt = s.expiresAt ?? new Date(s.firstSeenAt.getTime() + VALIDITY_HOURS[s.urgency] * HOUR);
    const r = computeScore({ aiScore: s.aiScore, sourceCount: s.sourceCount, trendScore: s.trendScore, startAt: s.firstSeenAt, urgency: s.urgency, eventAt: s.eventAt, expiresAt }, now);
    const prev = (s.analysis && typeof s.analysis === "object" ? s.analysis : {}) as Record<string, unknown>;
    if (r.expired) {
      expired++;
      updates.push(prisma.newsStory.update({ where: { id: s.id }, data: { status: "EXPIRED", score: 0, reason: s.eventAt ? "Olay zamanı geçti" : "Güncelliğini yitirdi" } }));
    } else if (s.status === "READY") {
      updates.push(prisma.newsStory.update({ where: { id: s.id }, data: { score: r.total, expiresAt: r.expiresAt, analysis: { ...prev, parts: r.parts } as Prisma.InputJsonValue } }));
    }
  }
  for (let i = 0; i < updates.length; i += 100) await prisma.$transaction(updates.slice(i, i + 100));
  return { rescored: stories.length, expired };
}

/** Yazım sırası: eşiği geçen (ya da öne alınmış), süresi dolmamış konular, önceliğe göre. */
export async function getWritingQueue(limit: number) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { storyMinScore: true } });
  const min = settings?.storyMinScore ?? 60;
  return prisma.newsStory.findMany({
    where: {
      status: "READY",
      OR: [{ score: { gte: min } }, { pinned: true }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    },
    orderBy: [{ pinned: "desc" }, { score: "desc" }, { firstSeenAt: "desc" }],
    take: limit,
    select: { id: true, title: true, score: true },
  });
}

/** Eski konuları ve trendleri temizler (yayınlanan haberler etkilenmez). */
export async function cleanupStories(retentionDays: number) {
  const before = new Date(Date.now() - Math.max(retentionDays, 3) * 24 * HOUR);
  const [stories, trends] = await Promise.all([
    prisma.newsStory.deleteMany({ where: { lastSeenAt: { lt: before }, status: { not: "WRITING" } } }),
    prisma.googleTrend.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 3 * 24 * HOUR) } } }),
  ]);
  return { stories: stories.count, trends: trends.count };
}

/**
 * Yazmadan hemen önce son kontrol: konu, bu arada yayınlanmış bir haberin aynısı mı?
 * Devam haberi olarak işaretlenmiş konularda ilişkili makale hariç tutulur.
 */
export async function findPublishedDuplicate(story: { tokens: string[]; entities: string[]; relatedArticleId: string | null; firstSeenAt: Date }) {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(story.firstSeenAt.getTime() - 3 * 24 * HOUR) } },
    select: { id: true, title: true, slug: true },
    take: 400,
    orderBy: { publishedAt: "desc" },
  });
  const me = sig(story);
  let best: { id: string; title: string; slug: string; sim: number } | null = null;
  for (const a of articles) {
    if (a.id === story.relatedArticleId) continue;
    const sim = storySimilarity(me, signature(a.title));
    if (sim >= LIKELY_DUPLICATE && (!best || sim > best.sim)) best = { ...a, sim };
  }
  return best;
}
