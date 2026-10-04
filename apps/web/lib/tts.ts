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

// Önce kararlı tam model, erişilemezse hafif model denenir
const TTS_MODELS = [
  process.env.GEMINI_TTS_MODEL,
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
].filter((m): m is string => !!m);

const STYLE_PROMPT = "Bir haber spikeri gibi doğal, net ve tarafsız bir tonla, Türkçe oku:";

export function isTtsConfigured() {
  return !!process.env.GEMINI_API_KEY && !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function synthesizeChunk(text: string, voiceName: string): Promise<Buffer> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let lastError: unknown;
  for (const model of TTS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: `${STYLE_PROMPT}\n\n${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const data = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (!data) throw new Error(`${model}: ses verisi dönmedi`);
      return extractPcm(Buffer.from(data, "base64"));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("TTS üretilemedi");
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
