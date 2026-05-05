"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SliderSchema = z.object({
  name: z.string().min(1, "İsim gereklidir"),
  autoPlay: z.boolean().default(true),
  interval: z.number().min(1000).default(5000),
  height: z.string().optional(),
  mobileHeight: z.string().optional(),
  titleSize: z.string().optional(),
  descriptionSize: z.string().optional(),
  isActive: z.boolean().default(true),
});

const SlideSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("Geçerli bir resim URL'si giriniz"),
  link: z.string().optional().nullable(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  sliderId: z.string(),
});

async function checkAdmin() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getSlider(id: string = "homepage") {
  try {
    const slider = await prisma.slider.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });
    return slider;
  } catch (error) {
    console.error("Error fetching slider:", error);
    return null;
  }
}

export async function updateSlider(id: string, data: z.infer<typeof SliderSchema>) {
  try {
    await checkAdmin();
    const validated = SliderSchema.parse(data);

    const slider = await prisma.slider.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/");
    revalidatePath("/admin/slider");
    return { success: true, slider };
  } catch (error) {
    console.error("Error updating slider:", error);
    return { success: false, error: "Slider güncellenirken bir hata oluştu." };
  }
}

export async function upsertSlide(data: z.infer<typeof SlideSchema>) {
  try {
    await checkAdmin();
    const validated = SlideSchema.parse(data);
    const { id, ...rest } = validated;

    let slide;
    if (id) {
      slide = await prisma.slide.update({
        where: { id },
        data: rest,
      });
    } else {
      slide = await prisma.slide.create({
        data: rest,
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/slider");
    return { success: true, slide };
  } catch (error) {
    console.error("Error upserting slide:", error);
    return { success: false, error: "Slide kaydedilirken bir hata oluştu." };
  }
}

export async function deleteSlide(id: string) {
  try {
    await checkAdmin();
    await prisma.slide.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/admin/slider");
    return { success: true };
  } catch (error) {
    console.error("Error deleting slide:", error);
    return { success: false, error: "Slide silinirken bir hata oluştu." };
  }
}

export async function reorderSlides(slideIds: string[]) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(
      slideIds.map((id, index) =>
        prisma.slide.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error reordering slides:", error);
    return { success: false, error: "Sıralama güncellenirken bir hata oluştu." };
  }
}
