import "server-only";

import { createHash } from "node:crypto";
import { head, put, BlobNotFoundError } from "@vercel/blob";
import { TTS_VOICES, type TtsVoiceId } from "./tts-voices";
import { extractPcm, htmlToSpeechText, pcmToWav, splitForTts } from "./tts-audio";

export { TTS_VOICES, type TtsVoiceId };

/**
 * Gemini TTS ile haber seslendirme.
 * Üretilen ses Vercel Blob'da saklanır: her haber + ses + içerik sürümü için yalnızca bir kez üretilir.
 */

// Önce kararlı tam model; erişilemez/kota dolarsa hafif ve eski modeller denenir (hepsinin ücretsiz katmanı var)
const TTS_MODELS = [
  process.env.GEMINI_TTS_MODEL,
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-2.5-flash-preview-tts",
].filter((m, i, all): m is string => !!m && all.indexOf(m) === i);

const STYLE_PROMPT = "Bir haber spikeri gibi doğal, net ve tarafsız bir tonla, Türkçe oku:";
const MAX_RETRY_WAIT_MS = 20_000;

export function isTtsConfigured() {
  return !!process.env.GEMINI_API_KEY && !!process.env.BLOB_READ_WRITE_TOKEN;
}

export type TtsErrorCode = "quota" | "auth" | "model" | "billing" | "no_audio" | "unknown";

export class TtsError extends Error {
  constructor(public code: TtsErrorCode, message: string, public model?: string) {
    super(message);
    this.name = "TtsError";
  }
}

/** Sağlayıcı hatasını kullanıcıya/yöneticiye gösterilebilir bir koda çevirir. */
export function classifyTtsError(error: unknown, model?: string): TtsError {
  if (error instanceof TtsError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  const text = raw.toLowerCase();
  if (status === 429 || text.includes("resource_exhausted") || text.includes("quota") || text.includes("rate limit")) {
    return new TtsError("quota", "Gemini kullanım kotası/hız sınırı doldu.", model);
  }
  if (text.includes("billing") || text.includes("prepay") || text.includes("credit")) {
    return new TtsError("billing", "Gemini hesabında faturalandırma/bakiye gerekli görünüyor.", model);
  }
  if (status === 401 || status === 403 || text.includes("api key") || text.includes("permission")) {
    return new TtsError("auth", "Gemini API anahtarı geçersiz veya bu modele yetkisi yok.", model);
  }
  if (status === 404 || text.includes("not found") || text.includes("not supported")) {
    return new TtsError("model", "Seslendirme modeli bulunamadı veya desteklenmiyor.", model);
  }
  return new TtsError("unknown", raw.slice(0, 300), model);
}

/** Hata metnindeki "retryDelay": "23s" bilgisini milisaniyeye çevirir. */
function retryDelayMs(error: unknown) {
  const match = (error instanceof Error ? error.message : String(error)).match(/retry(?:Delay)?["':\s]+(\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) : 5_000;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function synthesizeWithModel(model: string, text: string, voiceName: string): Promise<Buffer> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: `${STYLE_PROMPT}\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const data = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!data) throw new TtsError("no_audio", "Model ses verisi döndürmedi.", model);
  return extractPcm(Buffer.from(data, "base64"));
}

async function synthesizeChunk(text: string, voiceName: string): Promise<Buffer> {
  let lastError: TtsError | undefined;
  for (const model of TTS_MODELS) {
    // Hız sınırında bir kez bekleyip aynı modeli tekrar dene, sonra sıradaki modele geç
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await synthesizeWithModel(model, text, voiceName);
      } catch (error) {
        lastError = classifyTtsError(error, model);
        const wait = retryDelayMs(error);
        if (lastError.code === "quota" && attempt === 0 && wait <= MAX_RETRY_WAIT_MS) {
          await sleep(wait);
          continue;
        }
        break;
      }
    }
    // Anahtar hatası tüm modellerde aynı olacağı için boşuna deneme
    if (lastError?.code === "auth") break;
  }
  throw lastError ?? new TtsError("unknown", "TTS üretilemedi");
}

/** Admin paneli tanılama: kısa bir cümleyi her modelle seslendirmeyi dener (kaydetmez). */
export async function diagnoseTts() {
  const results: { model: string; ok: boolean; ms: number; bytes?: number; code?: TtsErrorCode; message?: string }[] = [];
  if (!process.env.GEMINI_API_KEY) {
    return { configured: false, blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN, results };
  }
  for (const model of TTS_MODELS) {
    const started = Date.now();
    try {
      const pcm = await synthesizeWithModel(model, "Haber Nexus seslendirme testi.", "Kore");
      results.push({ model, ok: true, ms: Date.now() - started, bytes: pcm.length });
    } catch (error) {
      const e = classifyTtsError(error, model);
      results.push({ model, ok: false, ms: Date.now() - started, code: e.code, message: e.message });
    }
  }
  return { configured: true, blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN, results };
}

/**
 * Haberin seslendirmesini döner; yoksa üretip saklar.
 */
export async function getOrCreateArticleAudio({
  articleId,
  title,
  content,
  voice,
}: {
  articleId: string;
  title: string;
  content: string;
  voice: TtsVoiceId;
}): Promise<{ url: string; cached: boolean }> {
  const { voiceName } = TTS_VOICES[voice];
  const text = htmlToSpeechText(title, content);
  // İçerik değişirse yeni ses üretilsin diye özet hash dosya adına eklenir
  const version = createHash("sha256").update(`${voiceName}\n${text}`).digest("hex").slice(0, 16);
  const pathname = `tts/${articleId}/${voice}-${version}.wav`;

  try {
    const existing = await head(pathname);
    return { url: existing.url, cached: true };
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }

  const chunks = splitForTts(text);
  const pcmParts: Buffer[] = [];
  // Sırayla üret: sağlayıcı hız limitlerine takılmamak için
  for (const chunk of chunks) pcmParts.push(await synthesizeChunk(chunk, voiceName));

  const wav = pcmToWav(Buffer.concat(pcmParts));
  const blob = await put(pathname, wav, {
    access: "public",
    contentType: "audio/wav",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return { url: blob.url, cached: false };
}
