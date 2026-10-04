import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimitAsync, getRequestIdentity } from "@/lib/server/rate-limit";
import { classifyTtsError, getOrCreateArticleAudio, isTtsConfigured, TTS_VOICES, type TtsVoiceId } from "@/lib/tts";

export const maxDuration = 120;

const TtsRequestSchema = z.object({
  articleId: z.string().trim().min(1).max(100),
  voice: z.enum(Object.keys(TTS_VOICES) as [TtsVoiceId, ...TtsVoiceId[]]),
});

/**
 * Haberin gerçek insan sesine yakın seslendirmesini döner (gerekirse üretir).
 * POST /api/tts { articleId, voice }
 */
export async function POST(req: Request) {
  if (!isTtsConfigured()) {
    return NextResponse.json({ error: "Seslendirme servisi yapılandırılmamış." }, { status: 503 });
  }

  const rate = await checkRateLimitAsync(`tts:${getRequestIdentity(req)}`, 15, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const parsed = TtsRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const article = await prisma.article.findFirst({
    where: { id: parsed.data.articleId, status: "PUBLISHED" },
    select: { id: true, title: true, content: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Haber bulunamadı." }, { status: 404 });
  }

  try {
    const audio = await getOrCreateArticleAudio({
      articleId: article.id,
      title: article.title,
      content: article.content,
      voice: parsed.data.voice,
    });
    return NextResponse.json(audio, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const ttsError = classifyTtsError(error);
    console.error("TTS generation error:", ttsError.code, ttsError.model, error);
    return NextResponse.json(
      {
        error: ttsError.code === "quota"
          ? "Seslendirme servisi şu an yoğun. Lütfen birazdan tekrar deneyin."
          : "Ses şu anda oluşturulamadı.",
        code: ttsError.code,
      },
      { status: ttsError.code === "quota" ? 503 : 502 },
    );
  }
}
