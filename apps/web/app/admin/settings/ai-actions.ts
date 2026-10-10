"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSafeActionError, adminOnly } from "@/lib/server/authz";
import {
  configuredProviders, getModelCatalog, loadAiSettings, resolveModelChain, testModel, toAiError,
} from "@/lib/ai/client";
import { AI_TASKS, formatModelRef, isRetiredModel, parseModelRef, type AiProvider, type AiTask } from "@/lib/ai/models";
import { DEFAULT_EDITORIAL_CRITERIA } from "@/lib/ai-analyzer";

const TASKS = Object.keys(AI_TASKS) as AiTask[];
const ModelRefSchema = z.string().trim().max(200).regex(/^(google|openrouter):[\w.\-/:]+$/, "Geçersiz model");

const AiSettingsSchema = z.object({
  models: z.object({
    writer: ModelRefSchema,
    analyzer: ModelRefSchema,
    image: ModelRefSchema,
    tts: ModelRefSchema.refine((v) => v.startsWith("google:"), "Seslendirme yalnızca Google ile çalışır"),
  }),
  writerPrompt: z.string().trim().min(10).max(20000),
  imagePrompt: z.string().trim().min(5).max(10000),
  editorialCriteria: z.string().trim().max(10000),
  searchEnabled: z.boolean(),
  useRssImage: z.boolean(),
});

export type AiSettingsInput = z.infer<typeof AiSettingsSchema>;

export interface AiTaskState {
  task: AiTask;
  stored: string;
  effective: string | null;
  /** Kayıtlı model kaldırılmış/eski: otomatik olarak `effective` kullanılıyor */
  retired: boolean;
}

export async function getAiOverview() {
  await requireRole("ADMIN");
  const settings = await loadAiSettings();
  const stored: Record<AiTask, string> = {
    writer: settings?.aiWriterModel ?? "",
    analyzer: settings?.aiAnalyzerModel ?? "",
    image: settings?.aiWriterImageModel ?? "",
    tts: (settings as { aiTtsModel?: string } | null)?.aiTtsModel ?? "",
  };
  const tasks: AiTaskState[] = TASKS.map((task) => {
    const ref = parseModelRef(stored[task]);
    const effective = resolveModelChain(task, settings)[0];
    return {
      task,
      stored: ref ? formatModelRef(ref) : "",
      effective: effective ? formatModelRef(effective) : null,
      retired: !!ref && isRetiredModel(ref.model),
    };
  });
  return {
    providers: configuredProviders(),
    tasks,
    writerPrompt: settings?.aiWriterPrompt ?? "",
    imagePrompt: settings?.aiWriterImagePrompt ?? "",
    editorialCriteria: (settings as { aiAnalyzerPrompt?: string | null } | null)?.aiAnalyzerPrompt ?? "",
    defaultEditorialCriteria: DEFAULT_EDITORIAL_CRITERIA,
    searchEnabled: settings?.aiWriterSearchEnabled ?? false,
    useRssImage: settings?.aiWriterUseRssImage ?? true,
  };
}

export async function saveAiSettings(input: AiSettingsInput) {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = AiSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Geçersiz ayar." };
  const d = parsed.data;
  try {
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });
    await prisma.systemSettings.update({
      where: { id: "global" },
      data: {
        aiWriterModel: d.models.writer,
        aiAnalyzerModel: d.models.analyzer,
        aiWriterImageModel: d.models.image,
        aiTtsModel: d.models.tts,
        aiWriterPrompt: d.writerPrompt,
        aiWriterImagePrompt: d.imagePrompt,
        aiAnalyzerPrompt: d.editorialCriteria || null,
        aiWriterSearchEnabled: d.searchEnabled,
        aiWriterUseRssImage: d.useRssImage,
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/ai-writer");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Ayarlar kaydedilemedi. Veritabanı güncellemesi bekliyor olabilir (Sistem sekmesi).") };
  }
}

export async function testModelAction(task: AiTask, model: string) {
  const denied = await adminOnly();
  if (denied) return denied;
  if (!TASKS.includes(task)) return { ok: false, detail: "Geçersiz görev.", ms: 0, task, model };
  return testModel(task, model);
}

export async function getModelCatalogAction(provider: AiProvider, refresh = false) {
  const denied = await adminOnly();
  if (denied) return denied;
  if (provider !== "google" && provider !== "openrouter") return { success: false as const, error: "Geçersiz sağlayıcı." };
  try {
    return { success: true as const, models: await getModelCatalog(provider, refresh) };
  } catch (error) {
    const e = toAiError(error, { provider, model: "katalog" });
    return { success: false as const, error: `${e.summary} ${e.raw}` };
  }
}
