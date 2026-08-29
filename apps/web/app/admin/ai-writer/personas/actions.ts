"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/authz";

export async function getPersonas() {
  await requireRole("ADMIN");

  return prisma.aiPersona.findMany({
    include: {
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type PersonaInput = {
  name: string;
  role?: string;
  image?: string;
  description: string;
  prompt: string;
  imagePrompt: string;
  categoryIds: string[];
};

export async function createPersona(data: PersonaInput) {
  await requireRole("ADMIN");

  try {
    const { categoryIds, ...personaData } = data;

    await prisma.aiPersona.create({
      data: {
        ...personaData,
        categories: {
          create: categoryIds.map((id) => ({
            category: { connect: { id } },
          })),
        },
      },
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error) {
    console.error("Create Persona Error:", error);
    return { success: false, error: "Persona oluşturulamadı." };
  }
}

export async function updatePersona(id: string, data: PersonaInput) {
  await requireRole("ADMIN");

  try {
    const { categoryIds, ...personaData } = data;

    await prisma.$transaction(async (tx) => {
      await tx.aiPersonaOnCategory.deleteMany({ where: { personaId: id } });
      await tx.aiPersona.update({
        where: { id },
        data: {
          ...personaData,
          categories: {
            create: categoryIds.map((categoryId) => ({
              category: { connect: { id: categoryId } },
            })),
          },
        },
      });
    });

    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error) {
    console.error("Update Persona Error:", error);
    return { success: false, error: "Persona güncellenemedi." };
  }
}

export async function deletePersona(id: string) {
  await requireRole("ADMIN");

  try {
    await prisma.aiPersona.delete({ where: { id } });
    revalidatePath("/admin/ai-writer/personas");
    return { success: true };
  } catch (error) {
    console.error("Delete Persona Error:", error);
    return { success: false, error: "Persona silinemedi." };
  }
}
