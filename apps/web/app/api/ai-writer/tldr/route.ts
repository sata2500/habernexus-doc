import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { title, text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Metin bulunamadı." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API anahtarı eksik." }, { status: 500 });
    }

    const settings = await prisma.systemSettings.findFirst();
    const model = settings?.aiAnalyzerModel || "google/gemini-2.0-flash-001";

    const prompt = `Aşağıdaki haber makalesini oku ve okuyucu için en önemli 3 öz cümleden oluşan özet çıkar.
Başlık: "${title}"
Metin:
${text}

Format: YALNIZCA geçerli bir JSON objesi döndür:
{ "bullets": ["1. Cümle", "2. Cümle", "3. Cümle"] }`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://habernexus.com",
        "X-Title": "Haber Nexus TLDR",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());

    return NextResponse.json({ bullets: parsed.bullets || [] });
  } catch (error: unknown) {
    console.error("TLDR API error:", error);
    return NextResponse.json({ bullets: [] });
  }
}
