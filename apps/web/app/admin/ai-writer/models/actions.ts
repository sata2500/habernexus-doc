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

      // Yetenek ve Modalite Analizi
      const inputModalities = m.architecture?.input_modalities || ["text"];
      const outputModalities = m.architecture?.output_modalities || ["text"];
      const supportedParameters = m.supported_parameters || [];
      const hasSearchPricing = m.pricing?.web_search !== undefined;

      const supportsSearch = supportedParameters.includes("tools") || hasSearchPricing;
      const supportsVision = inputModalities.includes("image") && outputModalities.includes("text");
      const supportsT2I = outputModalities.includes("image");
      const supportsI2I = inputModalities.includes("image") && outputModalities.includes("image");

      // Model Tipi Belirleme
      let type: "TEXT" | "IMAGE" | "MULTIMODAL" = "TEXT";
      if (supportsT2I || supportsI2I) {
        type = "IMAGE";
      } else if (supportsVision) {
        type = "MULTIMODAL";
      }

      await prisma.aiModel.upsert({
        where: { id: m.id },
        update: {
          name: m.name,
          description: m.description,
          isFree,
          type,
          inputModalities,
          outputModalities,
          supportsSearch,
          supportsVision,
          supportsT2I,
          supportsI2I,
        },
        create: {
          id: m.id,
          name: m.name,
          description: m.description,
          type,
          isFree,
          isActive: false,
          inputModalities,
          outputModalities,
          supportsSearch,
          supportsVision,
          supportsT2I,
          supportsI2I,
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
