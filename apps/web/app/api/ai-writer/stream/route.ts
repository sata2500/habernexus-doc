import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/authz";
import { checkRateLimitAsync, getRequestIdentity } from "@/lib/server/rate-limit";
import { prisma } from "@/lib/prisma";

const StreamRequestSchema = z.object({
  topic: z.string().min(2).max(1000),
  excerpt: z.string().max(4000).optional(),
  instructions: z.string().max(2000).optional(),
  model: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("AUTHOR", "ADMIN");
    const ip = getRequestIdentity(req);

    // Rate Limit: 10 stream requests per minute per user/IP
    const rate = await checkRateLimitAsync(`stream:${session.user.id || ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Çok fazla canlı üretim isteği. Lütfen biraz bekleyin." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const json = await req.json();
    const parsed = StreamRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz veri" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API anahtarı yapılandırılmamış." }, { status: 500 });
    }

    const settings = await prisma.systemSettings.findFirst();
    const chosenModel = parsed.data.model || settings?.aiWriterModel || "google/gemini-2.0-flash-001";
    const basePrompt = settings?.aiWriterPrompt || "Sen deneyimli bir haber editörüsün. Akıcı, tarafsız ve HTML formatında kaliteli bir haber metni yaz.";

    const fullPrompt = `
Konu: ${parsed.data.topic}
${parsed.data.excerpt ? `Kaynak Özet: ${parsed.data.excerpt}` : ""}
${parsed.data.instructions ? `Ek Talimatlar: ${parsed.data.instructions}` : ""}

Talimat: ${basePrompt}
Format: HTML (h2, p, strong etiketleri ile). Başlık ekleme.
`;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com",
        "X-Title": "Haber Nexus Live Stream",
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [{ role: "user", content: fullPrompt }],
        stream: true,
      }),
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
      const errText = await openRouterResponse.text().catch(() => "");
      console.error("[Stream API] OpenRouter Error:", openRouterResponse.status, errText);
      return NextResponse.json({ error: "AI servisinden yanıt alınamadı." }, { status: 502 });
    }

    // SSE Stream Response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;

              if (trimmed === "data: [DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              if (trimmed.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  const textDelta = data.choices?.[0]?.delta?.content || "";
                  if (textDelta) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: textDelta })}\n\n`)
                    );
                  }
                } catch {
                  // Ignore JSON parse error for keep-alives
                }
              }
            }
          }
        } catch (streamErr) {
          console.error("[Stream API] Stream reading error:", streamErr);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Akış sırasında bağlantı kesildi." })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[Stream API Error]:", error);
    return NextResponse.json({ error: "Yetkisiz veya geçersiz istek." }, { status: 401 });
  }
}
