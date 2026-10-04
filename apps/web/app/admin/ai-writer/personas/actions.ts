"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/authz";

const PersonaSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(80),
  role: z.string().trim().max(80).optional().default(""),
  image: z.string().trim().max(2000).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
  prompt: z.string().trim().min(10, "Yazım talimatı en az 10 karakter olmalı.").max(8000),
  imagePrompt: z.string().trim().max(4000).optional().default(""),
  categoryIds: z.array(z.string().min(1)).max(100),
  isActive: z.boolean().optional().default(true),
});

export type PersonaInput = z.input<typeof PersonaSchema>;
type Result = { success: true } | { success: false; error: string };

export async function getPersonas() {
  await requireRole("ADMIN");
  return prisma.aiPersona.findMany({
    include: {
      categories: { include: { category: { select: { id: true, name: true } } } },
      _count: { select: { articles: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

function revalidate() {
  revalidatePath("/admin/ai-writer/personas");
  revalidatePath("/admin/ai-writer");
}

function toData(input: z.output<typeof PersonaSchema>) {
  const { categoryIds, role, image, description, ...rest } = input;
  return {
    data: { ...rest, role: role || "Haber Editörü", image: image || null, description: description || null },
    categoryIds: [...new Set(categoryIds)],
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") return "Bu adla bir persona zaten var.";
  console.error("[Persona]", error);
  return fallback;
}

export async function createPersona(input: PersonaInput): Promise<Result> {
  await requireRole("ADMIN");
  const parsed = PersonaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  const { data, categoryIds } = toData(parsed.data);
  try {
    await prisma.aiPersona.create({
      data: { ...data, categories: { create: categoryIds.map((categoryId) => ({ categoryId })) } },
    });
    revalidate();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Persona oluşturulamadı.") };
  }
}

export async function updatePersona(id: string, input: PersonaInput): Promise<Result> {
  await requireRole("ADMIN");
  const parsed = PersonaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  const { data, categoryIds } = toData(parsed.data);
  try {
    await prisma.$transaction(async (tx) => {
      // Sıra (rotasyon) bilgisini korumak için yalnızca kaldırılan kategoriler silinir
      await tx.aiPersonaOnCategory.deleteMany({ where: { personaId: id, categoryId: { notIn: categoryIds } } });
      await tx.aiPersona.update({ where: { id }, data });
      await tx.aiPersonaOnCategory.createMany({
        data: categoryIds.map((categoryId) => ({ personaId: id, categoryId })),
        skipDuplicates: true,
      });
    });
    revalidate();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Persona güncellenemedi.") };
  }
}

export async function setPersonaActive(id: string, isActive: boolean): Promise<Result> {
  await requireRole("ADMIN");
  try {
    await prisma.aiPersona.update({ where: { id }, data: { isActive } });
    revalidate();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Durum değiştirilemedi.") };
  }
}

/** Personanın yazdığı haberler silinmez; yazar olarak tekrar asıl kullanıcı görünür. */
export async function deletePersona(id: string): Promise<Result> {
  await requireRole("ADMIN");
  try {
    await prisma.aiPersona.delete({ where: { id } });
    revalidate();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Persona silinemedi.") };
  }
}
