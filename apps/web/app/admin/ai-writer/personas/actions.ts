"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPersonas() {
  return await prisma.aiPersona.findMany({
    include: {
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPersona(data: {
  name: string;
  role?: string;
  image?: string;
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
          create: categoryIds.map((id) => ({
            category: { connect: { id } }
          })),
        },
      },
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error: any) {
    console.error("Create Persona Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePersona(id: string, data: {
  name: string;
  role?: string;
  image?: string;
  description: string;
  prompt: string;
  imagePrompt: string;
  categoryIds: string[];
}) {
  try {
    const { categoryIds, ...personaData } = data;
    
    // Önce mevcut ilişkileri temizle
    await prisma.aiPersonaOnCategory.deleteMany({
      where: { personaId: id }
    });

    // Yeni verilerle güncelle ve ilişkileri kur
    await prisma.aiPersona.update({
      where: { id },
      data: {
        ...personaData,
        categories: {
          create: categoryIds.map((id) => ({
            category: { connect: { id } }
          })),
        },
      },
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error: any) {
    console.error("Update Persona Error:", error);
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
    console.error("Delete Persona Error:", error);
    return { success: false, error: error.message };
  }
}
