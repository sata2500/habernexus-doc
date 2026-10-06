import "server-only";

import { getAppUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { fetchPublicResource } from "@/lib/server/remote-fetch";
import { AI_TASKS, formatModelRef, parseModelRef, type AiProvider, type AiTask, type ModelRef } from "./models";
import { configuredProviders, hasKey, resolveModelChain } from "./resolve";

export { configuredProviders, resolveModelChain };

/**
 * Tüm yapay zekâ çağrılarının geçtiği tek katman (Google Gemini + OpenRouter).
 * - Görev bazlı model seçimi (admin panelinden)
 * - Kaldırılmış modelleri otomatik güncel modele yükseltme
 * - Geçici hatalarda tekrar deneme, anahtar/kota/model hatasında diğer sağlayıcıya geçiş
 * - Sağlayıcının gerçek hata mesajını yöneticiye taşıyan hata sınıfı
 */

export type AiErrorCode =
  | "config" | "auth" | "billing" | "quota" | "model" | "safety" | "timeout" | "unavailable" | "bad_response" | "unknown";

const ERROR_TEXT: Record<AiErrorCode, string> = {
  config: "API anahtarı tanımlı değil.",
  auth: "API anahtarı geçersiz, engellenmiş veya bu modele yetkisi yok.",
  billing: "Sağlayıcı hesabında faturalandırma/bakiye gerekiyor.",
  quota: "Kullanım kotası veya hız sınırı doldu.",
  model: "Model bulunamadı, kaldırılmış veya bu işlem için desteklenmiyor.",
  safety: "İçerik, sağlayıcının güvenlik filtrelerine takıldı.",
  timeout: "Sağlayıcı zamanında yanıt vermedi.",
  unavailable: "Sağlayıcı geçici olarak hizmet veremiyor.",
  bad_response: "Model beklenen biçimde yanıt vermedi.",
  unknown: "Beklenmeyen bir yapay zekâ hatası oluştu.",
};

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    public provider: AiProvider | null,
    public model: string | null,
    /** Sağlayıcının döndürdüğü ham hata (anahtar içermez) */
    public raw: string,
  ) {
    super(`${ERROR_TEXT[code]}${model ? ` (${provider}:${model})` : ""}`);
    this.name = "AiError";
  }

  get summary() {
    return ERROR_TEXT[this.code];
  }
}

// Zaman aşımı aynı modelle tekrar denenmez: 120 sn × 3 deneme, işçinin 300 sn sınırını aşıp işi
// yarıda bırakıyordu. Takılan model yerine doğrudan yedek modele geçilir.
const RETRYABLE: AiErrorCode[] = ["quota", "unavailable"];
const FALLBACK_ON: AiErrorCode[] = ["config", "auth", "billing", "quota", "model", "unavailable", "timeout"];

function scrub(text: string) {
  // Olası anahtar sızıntılarını maskele
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza…")
    .replace(/sk-or-[0-9A-Za-z_-]{10,}/g, "sk-or-…")
    .slice(0, 600);
}

export function toAiError(error: unknown, ref?: ModelRef | null): AiError {
  if (error instanceof AiError) return error;
  const provider = ref?.provider ?? null;
  const model = ref?.model ?? null;
  let message = error instanceof Error ? error.message : String(error);
  // Google SDK hata mesajını JSON gövdesiyle döndürür: okunur kısmı ve durumunu çıkar
  const inner = message.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
  const innerStatus = message.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1];
  if (inner) message = `${inner.replace(/\\n/g, " ").replace(/\\"/g, '"')}${innerStatus ? ` [${innerStatus}]` : ""}`;
  const raw = scrub(message);
  const status = (error as { status?: number })?.status;
  const t = raw.toLowerCase();

  let code: AiErrorCode = "unknown";
  if (t.includes("billing") || t.includes("prepay") || t.includes("insufficient credits") || t.includes("payment required") || status === 402) code = "billing";
  else if (status === 429 || t.includes("resource_exhausted") || t.includes("quota") || t.includes("rate limit") || t.includes("rate-limit")) code = "quota";
  else if (status === 401 || status === 403 || t.includes("api key") || t.includes("api_key") || t.includes("permission_denied") || t.includes("unauthorized") || t.includes("no auth credentials")) code = "auth";
  else if (status === 404 || t.includes("not found") || t.includes("is not a valid model") || t.includes("no endpoints found") || t.includes("not supported") || t.includes("deprecated")) code = "model";
  else if (t.includes("safety") || t.includes("blocked") || t.includes("moderation")) code = "safety";
  else if (t.includes("timeout") || t.includes("aborted") || t.includes("timed out")) code = "timeout";
  else if (status === 500 || status === 502 || status === 503 || t.includes("unavailable") || t.includes("overloaded") || t.includes("high demand")) code = "unavailable";

  return new AiError(code, provider, model, raw);
}

/* ───────────────────────── Model çözümleme ───────────────────────── */

export async function loadAiSettings() {
  return prisma.systemSettings.findUnique({ where: { id: "global" } });
}

export async function getTaskModel(task: AiTask) {
  return resolveModelChain(task, await loadAiSettings())[0] ?? null;
}

/* ───────────────────────── Sağlayıcı çağrıları ───────────────────────── */

const REQUEST_TIMEOUT_MS = 120_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function googleClient() {
  if (!process.env.GEMINI_API_KEY) throw new AiError("config", "google", null, "GEMINI_API_KEY yok");
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function openRouterFetch(body: Record<string, unknown>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiError("config", "openrouter", null, "OPENROUTER_API_KEY yok");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getAppUrl(),
      "X-Title": "Haber Nexus",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    const err = new Error(data?.error?.message || `${res.status} ${res.statusText}`) as Error & { status?: number };
    err.status = data?.error?.code && typeof data.error.code === "number" ? data.error.code : res.status;
    throw err;
  }
  return data as {
    choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] }; finish_reason?: string }[];
  };
}

export interface TextRequest {
  prompt: string;
  system?: string;
  json?: boolean;
  /** Güncel bilgi için web/Google araması kullan */
  search?: boolean;
  temperature?: number;
}

async function textWithRef(ref: ModelRef, req: TextRequest): Promise<string> {
  if (ref.provider === "google") {
    const ai = await googleClient();
    const response = await ai.models.generateContent({
      model: ref.model,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        temperature: req.temperature,
        // Google araması ile JSON MIME birlikte kullanılamıyor; o durumda metinden ayrıştırılır
        responseMimeType: req.json && !req.search ? "application/json" : undefined,
        tools: req.search ? [{ googleSearch: {} }] : undefined,
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });
    const text = response.text ?? "";
    if (!text.trim()) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason;
      throw new AiError(reason && /SAFETY|BLOCK/i.test(String(reason)) ? "safety" : "bad_response", ref.provider, ref.model, `Boş yanıt (${reason ?? "neden yok"})`);
    }
    return text;
  }

  const data = await openRouterFetch({
    model: ref.model,
    messages: [
      ...(req.system ? [{ role: "system", content: req.system }] : []),
      { role: "user", content: req.prompt },
    ],
    temperature: req.temperature,
    ...(req.json && !req.search ? { response_format: { type: "json_object" } } : {}),
    ...(req.search ? { tools: [{ type: "openrouter:web_search" }] } : {}),
  });
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new AiError("bad_response", ref.provider, ref.model, `Boş yanıt (${data.choices?.[0]?.finish_reason ?? "neden yok"})`);
  return text;
}

async function runWithFallback<T>(chain: ModelRef[], fn: (ref: ModelRef) => Promise<T>): Promise<{ result: T; ref: ModelRef; attempts: AiError[] }> {
  const attempts: AiError[] = [];
  for (const ref of chain) {
    if (!hasKey(ref.provider)) {
      attempts.push(new AiError("config", ref.provider, ref.model, `${ref.provider} anahtarı tanımlı değil`));
      continue;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return { result: await fn(ref), ref, attempts };
      } catch (error) {
        const e = toAiError(error, ref);
        if (RETRYABLE.includes(e.code) && attempt < 2) {
          await sleep(attempt === 0 ? 2_000 : 6_000);
          continue;
        }
        attempts.push(e);
        break;
      }
    }
    const last = attempts[attempts.length - 1];
    if (last && !FALLBACK_ON.includes(last.code)) break;
  }
  const primaryError = attempts.find((a) => a.code !== "config") ?? attempts[0];
  throw primaryError ?? new AiError("config", null, null, "Kullanılabilir yapay zekâ sağlayıcısı yok");
}

/** Metin üretir. `task` admin panelinde seçilen modeli belirler. */
export async function generateText(task: Exclude<AiTask, "image" | "tts">, req: TextRequest, opts: { model?: string } = {}) {
  const chain = resolveModelChain(task, await loadAiSettings(), opts.model);
  const { result, ref, attempts } = await runWithFallback(chain, (r) => textWithRef(r, req));
  if (attempts.length) console.warn(`[AI] ${task} yedek modelle tamamlandı: ${formatModelRef(ref)}`, attempts.map((a) => `${a.provider}:${a.model} → ${a.code}`));
  return { text: result, model: formatModelRef(ref) };
}

export interface WebSource {
  url: string;
  title: string | null;
}

/** Web araması yapar; yanıt metniyle birlikte arama motorunun döndürdüğü gerçek kaynak adreslerini verir. */
async function searchWithRef(ref: ModelRef, req: TextRequest): Promise<{ text: string; sources: WebSource[] }> {
  if (ref.provider === "google") {
    const ai = await googleClient();
    const response = await ai.models.generateContent({
      model: ref.model,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        temperature: req.temperature,
        tools: [{ googleSearch: {} }],
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .map((c) => (c.web?.uri ? { url: c.web.uri, title: c.web.title ?? null } : null))
      .filter((s): s is WebSource => !!s);
    return { text: response.text ?? "", sources };
  }
  const data = (await openRouterFetch({
    model: ref.model,
    messages: [
      ...(req.system ? [{ role: "system", content: req.system }] : []),
      { role: "user", content: req.prompt },
    ],
    temperature: req.temperature,
    tools: [{ type: "openrouter:web_search" }],
  })) as { choices?: { message?: { content?: string | null; annotations?: { type?: string; url_citation?: { url?: string; title?: string } }[] } }[] };
  const message = data.choices?.[0]?.message;
  const sources = (message?.annotations ?? [])
    .map((a) => (a.type === "url_citation" && a.url_citation?.url ? { url: a.url_citation.url, title: a.url_citation.title ?? null } : null))
    .filter((s): s is WebSource => !!s);
  return { text: message?.content ?? "", sources };
}

/**
 * Web araması (admin panelinde göreve seçilen modelle). Kaynak adresleri modelin yazdığı metinden değil,
 * arama altyapısının döndürdüğü atıflardan alınır; yine de çağıran taraf bu adresleri kendisi doğrulamalıdır.
 */
export async function searchWeb(task: Exclude<AiTask, "image" | "tts">, req: Omit<TextRequest, "search" | "json">) {
  const chain = resolveModelChain(task, await loadAiSettings());
  const { result, ref } = await runWithFallback(chain, (r) => searchWithRef(r, req));
  return { ...result, model: formatModelRef(ref) };
}

/** Model yanıtından JSON nesnesini güvenle ayrıştırır (```json blokları, ön/son metin). */
export function parseJsonResponse<T = unknown>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new AiError("bad_response", null, null, `JSON ayrıştırılamadı: ${cleaned.slice(0, 200)}`);
  }
}

/** HTML üreten modellerin eklediği ```html çitlerini ve belge iskeletini temizler. */
export function cleanHtmlResponse(text: string) {
  return text
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .trim();
}

/* ───────────────────────── Görsel ───────────────────────── */

export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
  model: string;
}

function decodeDataUrl(url: string) {
  const match = url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function imageWithRef(ref: ModelRef, prompt: string, referenceImageUrl?: string): Promise<{ buffer: Buffer; mimeType: string }> {
  let reference: { data: string; mimeType: string } | null = null;
  if (referenceImageUrl) {
    try {
      const buf = await fetchPublicResource(referenceImageUrl, { maxBytes: 8 * 1024 * 1024 });
      reference = { data: buf.toString("base64"), mimeType: "image/jpeg" };
    } catch {
      reference = null; // Referans indirilemezse yalnızca metinden üret
    }
  }

  if (ref.provider === "google") {
    const ai = await googleClient();
    if (ref.model.startsWith("imagen")) {
      const res = await ai.models.generateImages({
        model: ref.model,
        prompt,
        config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "16:9", abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      });
      const bytes = res.generatedImages?.[0]?.image?.imageBytes;
      if (!bytes) throw new AiError("bad_response", ref.provider, ref.model, "Görsel dönmedi");
      return { buffer: Buffer.from(bytes, "base64"), mimeType: "image/jpeg" };
    }
    const res = await ai.models.generateContent({
      model: ref.model,
      contents: [{
        role: "user",
        parts: [{ text: prompt }, ...(reference ? [{ inlineData: reference }] : [])],
      }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "16:9" },
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new AiError("bad_response", ref.provider, ref.model, "Görsel dönmedi");
    return { buffer: Buffer.from(part.inlineData.data, "base64"), mimeType: part.inlineData.mimeType || "image/png" };
  }

  const data = await openRouterFetch({
    model: ref.model,
    modalities: ["image", "text"],
    image_config: { aspect_ratio: "16:9" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...(reference ? [{ type: "image_url", image_url: { url: `data:${reference.mimeType};base64,${reference.data}` } }] : []),
      ],
    }],
  });
  const message = data.choices?.[0]?.message;
  const url = message?.images?.[0]?.image_url?.url || (typeof message?.content === "string" ? message.content.trim() : "");
  const decoded = url ? decodeDataUrl(url) : null;
  if (decoded) return decoded;
  if (url.startsWith("http")) {
    return { buffer: await fetchPublicResource(url, { maxBytes: 8 * 1024 * 1024 }), mimeType: "image/png" };
  }
  throw new AiError("bad_response", ref.provider, ref.model, "Görsel dönmedi");
}

/** Kapak görseli üretir (Blob'a kaydetmez). */
export async function generateImage(prompt: string, opts: { referenceImageUrl?: string; model?: string } = {}): Promise<ImageResult> {
  const chain = resolveModelChain("image", await loadAiSettings(), opts.model);
  const { result, ref } = await runWithFallback(chain, (r) => imageWithRef(r, prompt, opts.referenceImageUrl));
  if (result.buffer.length === 0 || result.buffer.length > 12 * 1024 * 1024) {
    throw new AiError("bad_response", ref.provider, ref.model, "Görsel boyutu geçersiz");
  }
  return { ...result, model: formatModelRef(ref) };
}

/* ───────────────────────── Tanılama ───────────────────────── */

export interface ModelTestResult {
  task: AiTask;
  model: string;
  ok: boolean;
  ms: number;
  detail: string;
  code?: AiErrorCode;
  raw?: string;
}

/** Tek bir modeli yedeksiz dener; yöneticiye gerçek hatayı gösterir. */
export async function testModel(task: AiTask, value: string): Promise<ModelTestResult> {
  const ref = parseModelRef(value);
  const started = Date.now();
  const base = { task, model: value };
  if (!ref) return { ...base, ok: false, ms: 0, detail: "Model seçilmedi.", code: "config" };
  if (!hasKey(ref.provider)) {
    return { ...base, ok: false, ms: 0, detail: `${ref.provider === "google" ? "GEMINI_API_KEY" : "OPENROUTER_API_KEY"} tanımlı değil.`, code: "config" };
  }
  try {
    if (AI_TASKS[task].output === "image") {
      const img = await imageWithRef(ref, "A simple flat illustration of a newspaper on a desk, soft light, no text.");
      return { ...base, ok: true, ms: Date.now() - started, detail: `Görsel üretildi (${Math.round(img.buffer.length / 1024)} KB)` };
    }
    if (AI_TASKS[task].output === "audio") {
      const { synthesizeTestAudio } = await import("@/lib/tts");
      const bytes = await synthesizeTestAudio(ref.model);
      return { ...base, ok: true, ms: Date.now() - started, detail: `Ses üretildi (${Math.round(bytes / 1024)} KB)` };
    }
    const text = await textWithRef(ref, { prompt: "Yalnızca 'tamam' yaz.", temperature: 0 });
    return { ...base, ok: true, ms: Date.now() - started, detail: `Yanıt: “${text.trim().slice(0, 40)}”` };
  } catch (error) {
    const e = toAiError(error, ref);
    return { ...base, ok: false, ms: Date.now() - started, detail: e.summary, code: e.code, raw: e.raw };
  }
}

/* ───────────────────────── Model kataloğu ───────────────────────── */

export interface CatalogModel {
  ref: string;
  provider: AiProvider;
  id: string;
  name: string;
  outputs: ("text" | "image" | "audio")[];
  free: boolean;
  /** 1M token başına girdi/çıktı USD (biliniyorsa) */
  price?: { input: number; output: number };
}

const catalogCache = new Map<AiProvider, { at: number; models: CatalogModel[] }>();
const CATALOG_TTL_MS = 60 * 60 * 1000;

async function fetchGoogleCatalog(): Promise<CatalogModel[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error?.message || `${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return ((data?.models ?? []) as { name: string; displayName?: string; supportedGenerationMethods?: string[] }[])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") || m.supportedGenerationMethods?.includes("predict"))
    .filter((m) => !/embedding|aqa|gemma-|learnlm/i.test(m.name))
    .map((m) => {
      const id = m.name.replace(/^models\//, "");
      const outputs: CatalogModel["outputs"] = /tts/.test(id) ? ["audio"] : /image|imagen/.test(id) ? ["image"] : ["text"];
      return { ref: `google:${id}`, provider: "google" as const, id, name: m.displayName || id, outputs, free: false };
    });
}

async function fetchOpenRouterCatalog(): Promise<CatalogModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenRouter katalog hatası: ${res.status}`);
  const data = await res.json();
  return ((data?.data ?? []) as {
    id: string; name: string;
    architecture?: { output_modalities?: string[] };
    pricing?: { prompt?: string; completion?: string };
  }[])
    .filter((m) => !m.id.endsWith(":batch"))
    .map((m) => {
      const out = m.architecture?.output_modalities ?? ["text"];
      const input = Number(m.pricing?.prompt ?? 0) * 1e6;
      const output = Number(m.pricing?.completion ?? 0) * 1e6;
      return {
        ref: `openrouter:${m.id}`,
        provider: "openrouter" as const,
        id: m.id,
        name: m.name,
        outputs: out.includes("image") ? ["image", ...(out.includes("text") ? (["text"] as const) : [])] : ["text"],
        free: input === 0 && output === 0,
        price: input >= 0 && output >= 0 ? { input: Math.round(input * 100) / 100, output: Math.round(output * 100) / 100 } : undefined,
      };
    });
}

/** Sağlayıcının güncel model listesi (1 saat önbellekli). */
export async function getModelCatalog(provider: AiProvider, refresh = false): Promise<CatalogModel[]> {
  const cached = catalogCache.get(provider);
  if (!refresh && cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.models;
  const models = provider === "google" ? await fetchGoogleCatalog() : await fetchOpenRouterCatalog();
  catalogCache.set(provider, { at: Date.now(), models });
  return models;
}
