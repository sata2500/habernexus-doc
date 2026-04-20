"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAiModels() {
  return await prisma.aiModel.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function syncModelsFromOpenRouter() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error("OpenRouter API hatası");
    const json = await res.json();
    
    const models = json.data;
    if (!Array.isArray(models)) throw new Error("Geçersiz API yanıtı");

    let updatedCount = 0;
    for (const m of models) {
      // Ücret kontrolü
      const isFree = parseFloat(m.pricing?.prompt || "0") === 0 && 
                     parseFloat(m.pricing?.completion || "0") === 0;

      // Model Tipi Belirleme (OpenRouter Modalities Analizi)
      let type: "TEXT" | "IMAGE" | "MULTIMODAL" = "TEXT";
      const modelId = m.id.toLowerCase();
      const modelName = m.name.toLowerCase();
      
      // 1. İsim/ID Kontrolü (Görsel Modelleri için)
      const imageKeywords = ["stable-diffusion", "flux", "dall-e", "midjourney", "imagen", "vision", "video", "multimodal"];
      if (imageKeywords.some(kw => modelId.includes(kw) || modelName.includes(kw))) {
        if (modelId.includes("vision") || modelId.includes("multimodal")) {
          type = "MULTIMODAL";
        } else {
          type = "IMAGE";
        }
      }

      // 2. Modality Kontrolü (Varsa)
      const modalities = m.architecture?.modality || "";
      if (modalities.includes("image")) {
        type = "IMAGE";
      }

      await prisma.aiModel.upsert({
        where: { id: m.id },
        update: {
          name: m.name,
          description: m.description,
          isFree,
          type, // Tipini de güncelle
        },
        create: {
          id: m.id,
          name: m.name,
          description: m.description,
          type,
          isFree,
          isActive: false,
        }
      });
      updatedCount++;
    }
    
    revalidatePath("/admin/ai-writer/models");
    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error("Sync Error:", err);
    return { success: false, error: err.message };
  }
}

export async function upsertManualModel(data: {
  id: string;
  name: string;
  type: "TEXT" | "IMAGE" | "MULTIMODAL";
  isFree: boolean;
  isActive: boolean;
}) {
  try {
    await prisma.aiModel.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        type: data.type,
        isFree: data.isFree,
        isActive: data.isActive,
      },
      create: {
        ...data,
      }
    });
    revalidatePath("/admin/ai-writer/models");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleModelActive(id: string, isActive: boolean) {
  try {
    await prisma.aiModel.update({
      where: { id },
      data: { isActive }
    });
    revalidatePath("/admin/ai-writer/models");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteModel(id: string) {
  try {
    await prisma.aiModel.delete({ where: { id } });
    revalidatePath("/admin/ai-writer/models");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
