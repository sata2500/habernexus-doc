"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPersonas() {
  return await prisma.aiPersona.findMany({
    include: {
      categories: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPersona(data: {
  name: string;
  description: string;
  prompt: string;
  imagePrompt: string;
  categoryIds: string[];
}) {
  try {
    const { categoryIds, ...personaData } = data;
    
    await prisma.aiPersona.create({
      data: {
        ...personaData,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePersona(id: string, data: {
  name: string;
  description: string;
  prompt: string;
  imagePrompt: string;
  categoryIds: string[];
}) {
  try {
    const { categoryIds, ...personaData } = data;
    
    await prisma.aiPersona.update({
      where: { id },
      data: {
        ...personaData,
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePersona(id: string) {
  try {
    await prisma.aiPersona.delete({
      where: { id },
    });
    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
