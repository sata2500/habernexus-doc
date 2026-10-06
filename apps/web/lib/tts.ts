import "server-only";

import { createHash } from "node:crypto";
import { head, put, BlobNotFoundError } from "@vercel/blob";
import { TTS_VOICES, type TtsVoiceId } from "./tts-voices";
import { extractPcm, htmlToSpeechText, pcmToWav, splitForTts } from "./tts-audio";
import { AiError, loadAiSettings, resolveModelChain, toAiError } from "./ai/client";

export { TTS_VOICES, type TtsVoiceId };

/**
 * Gemini TTS ile haber seslendirme.
 * Üretilen ses Vercel Blob'da saklanır: her haber + ses + içerik sürümü için yalnızca bir kez üretilir.
 */

/**
 * Ses dosyası sürümü. Seslendirme metni ya da yöntemi değiştiğinde artırılır ki eski kayıtlar
 * (ör. talimat cümlesinin de okunduğu ilk sürüm) yeniden üretilsin.
 */
const AUDIO_VERSION = "v2";
const MAX_RETRY_WAIT_MS = 20_000;

export function isTtsConfigured() {
  return !!process.env.GEMINI_API_KEY && !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Admin panelinde seçilen seslendirme modeli ve yedekleri */
async function ttsModels() {
  return resolveModelChain("tts", await loadAiSettings()).map((r) => r.model);
}

/** Sağlayıcı hatasını sınıflandırır (ortak yapay zekâ hata sınıfı) */
export function classifyTtsError(error: unknown, model?: string): AiError {
  return toAiError(error, model ? { provider: "google", model } : null);
}

/** Hata metnindeki "retryDelay": "23s" bilgisini milisaniyeye çevirir. */
function retryDelayMs(error: unknown) {
  const match = (error instanceof Error ? error.message : String(error)).match(/retry(?:Delay)?["':\s]+(\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) : 5_000;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Tek parçanın en fazla bekleme süresi (takılan istek tüm seslendirmeyi kilitlemesin) */
const CHUNK_TIMEOUT_MS = 90_000;
/** Aynı anda üretilen parça sayısı: hız ile sağlayıcı sınırı arasında denge */
const CHUNK_CONCURRENCY = 2;
// Aynı haber/ses için eşzamanlı ilk istekler tek üretimi paylaşır (çift maliyet olmasın)
const inflight = new Map<string, Promise<{ url: string; cached: boolean }>>();

async function synthesizeWithModel(model: string, text: string, voiceName: string): Promise<Buffer> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    // Yalnızca okunacak metin gönderilir: metne eklenen üslup talimatı model tarafından sesli okunabiliyordu
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      abortSignal: AbortSignal.timeout(CHUNK_TIMEOUT_MS),
    },
  });
  const data = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!data) throw new AiError("bad_response", "google", model, "Model ses verisi döndürmedi.");
  return extractPcm(Buffer.from(data, "base64"));
}

async function synthesizeChunk(text: string, voiceName: string): Promise<Buffer> {
  let lastError: AiError | undefined;
  for (const model of await ttsModels()) {
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
    if (lastError?.code === "auth" || lastError?.code === "config") break;
  }
  throw lastError ?? new AiError("unknown", "google", null, "TTS üretilemedi");
}

/** Admin tanılaması: kısa bir cümleyi verilen modelle seslendirir, bayt sayısını döner. */
export async function synthesizeTestAudio(model: string) {
  const pcm = await synthesizeWithModel(model, "Haber Nexus seslendirme testi.", "Kore");
  return pcm.length;
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
  const version = createHash("sha256").update(`${AUDIO_VERSION}\n${voiceName}\n${text}`).digest("hex").slice(0, 16);
  const pathname = `tts/${articleId}/${voice}-${version}.wav`;

  try {
    const existing = await head(pathname);
    return { url: existing.url, cached: true };
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }

  let job = inflight.get(pathname);
  if (!job) {
    job = (async () => {
      const chunks = splitForTts(text);
      const pcmParts: Buffer[] = new Array(chunks.length);
      // En fazla 2 parça aynı anda (uzun haberler süre sınırına takılmasın), sıra korunur
      let next = 0;
      const worker = async () => {
        while (next < chunks.length) {
          const i = next++;
          pcmParts[i] = await synthesizeChunk(chunks[i]!, voiceName);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, worker));

      const wav = pcmToWav(Buffer.concat(pcmParts));
      const blob = await put(pathname, wav, {
        access: "public",
        contentType: "audio/wav",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return { url: blob.url, cached: false };
    })().finally(() => inflight.delete(pathname));
    inflight.set(pathname, job);
  }
  return job;
}
