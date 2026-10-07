"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, adminOnly } from "@/lib/server/authz";

const SliderSettingsSchema = z.object({
  autoPlay: z.boolean(),
  interval: z.number().int().min(2000).max(30000),
  isActive: z.boolean(),
});

const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional()
  .transform((v) => (v ? new Date(v) : null));

const SlideSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(400).optional().nullable(),
  imageUrl: z.string().trim().url("Bir görsel yükleyin."),
  link: z.string().trim().max(500).optional().nullable()
    .refine((v) => !v || v.startsWith("/") || /^https?:\/\//i.test(v), "Bağlantı / ile ya da https:// ile başlamalı."),
  isActive: z.boolean().default(true),
  startTime: optionalDate,
  endTime: optionalDate,
}).refine((s) => !s.startTime || !s.endTime || s.startTime < s.endTime, { message: "Bitiş zamanı başlangıçtan sonra olmalı.", path: ["endTime"] });

export type SlideInput = z.input<typeof SlideSchema>;

const SLIDER_ID = "homepage";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/admin/slider");
}

/** Ana sayfa slider'ı (herkese açık okuma). */
export async function getSlider(id: string = SLIDER_ID) {
  try {
    return await prisma.slider.findUnique({ where: { id }, include: { slides: { orderBy: { order: "asc" } } } });
  } catch (error) {
    console.error("Error fetching slider:", error);
    return null;
  }
}

/** Admin paneli için: slider kaydı yoksa oluşturur. */
export async function ensureSlider() {
  await requireRole("ADMIN");
  return prisma.slider.upsert({
    where: { id: SLIDER_ID },
    update: {},
    create: { id: SLIDER_ID, name: "Ana Sayfa Slider" },
    include: { slides: { orderBy: { order: "asc" } } },
  });
}

export async function updateSliderSettings(input: z.input<typeof SliderSettingsSchema>) {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = SliderSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Geçersiz ayar." };
  await prisma.slider.update({ where: { id: SLIDER_ID }, data: parsed.data });
  revalidate();
  return { success: true as const };
}

export async function saveSlide(input: SlideInput) {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = SlideSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  const { id, ...data } = parsed.data;
  try {
    if (id) {
      await prisma.slide.update({ where: { id }, data });
    } else {
      const last = await prisma.slide.findFirst({ where: { sliderId: SLIDER_ID }, orderBy: { order: "desc" }, select: { order: true } });
      await prisma.slide.create({ data: { ...data, sliderId: SLIDER_ID, order: (last?.order ?? -1) + 1 } });
    }
    revalidate();
    return { success: true as const };
  } catch (error) {
    console.error("Error saving slide:", error);
    return { success: false as const, error: "Slayt kaydedilemedi." };
  }
}

export async function setSlideActive(id: string, isActive: boolean) {
  const denied = await adminOnly();
  if (denied) return denied;
  await prisma.slide.update({ where: { id }, data: { isActive } });
  revalidate();
  return { success: true as const };
}

export async function deleteSlide(id: string) {
  const denied = await adminOnly();
  if (denied) return denied;
  try {
    await prisma.slide.delete({ where: { id } });
    revalidate();
    return { success: true as const };
  } catch (error) {
    console.error("Error deleting slide:", error);
    return { success: false as const, error: "Slayt silinemedi." };
  }
}

export async function reorderSlides(slideIds: string[]) {
  const denied = await adminOnly();
  if (denied) return denied;
  const ids = z.array(z.string().min(1)).max(100).parse(slideIds);
  await prisma.$transaction(ids.map((id, order) => prisma.slide.update({ where: { id }, data: { order } })));
  revalidate();
  return { success: true as const };
}

/** "Haberden doldur" için yayındaki haberlerde arama. */
export async function searchArticlesForSlide(q: string) {
  await requireRole("ADMIN");
  const query = q.trim().slice(0, 100);
  return prisma.article.findMany({
    where: { status: "PUBLISHED", ...(query && { title: { contains: query, mode: "insensitive" } }) },
    orderBy: { publishedAt: "desc" },
    take: 8,
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true },
  });
}
