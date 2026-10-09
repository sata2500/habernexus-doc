/**
 * Görev için kullanılacak modeli belirler. Saf mantık: test edilebilir,
 * yalnızca ortam değişkenlerinden hangi sağlayıcı anahtarlarının tanımlı olduğunu okur.
 */
import { DEFAULT_MODELS, parseModelRef, type AiProvider, type AiTask, type ModelRef } from "./models";

/** SystemSettings satırının yapay zekâ ile ilgili alanları */
export interface AiSettingsLike {
  aiWriterModel?: string | null;
  aiAnalyzerModel?: string | null;
  aiWriterImageModel?: string | null;
  aiTtsModel?: string | null;
}

type SettingsRow = AiSettingsLike | null | undefined;

export function hasKey(provider: AiProvider) {
  return provider === "google" ? !!process.env.GEMINI_API_KEY : !!process.env.OPENROUTER_API_KEY;
}

export function configuredProviders(): Record<AiProvider, boolean> {
  return { google: hasKey("google"), openrouter: hasKey("openrouter") };
}

function storedValue(task: AiTask, settings: SettingsRow): string | null {
  if (!settings) return null;
  switch (task) {
    case "writer": return settings.aiWriterModel ?? null;
    case "analyzer": return settings.aiAnalyzerModel ?? null;
    case "image": return settings.aiWriterImageModel ?? null;
    case "tts": return settings.aiTtsModel ?? null;
  }
}

function defaultRef(task: AiTask, prefer?: AiProvider): ModelRef | null {
  const order: AiProvider[] = prefer ? [prefer, prefer === "google" ? "openrouter" : "google"] : ["google", "openrouter"];
  for (const p of order) {
    const model = DEFAULT_MODELS[task][p];
    if (model && hasKey(p)) return { provider: p, model };
  }
  const p = order.find((x) => DEFAULT_MODELS[task][x]) ?? "google";
  return DEFAULT_MODELS[task][p] ? { provider: p, model: DEFAULT_MODELS[task][p]! } : null;
}

/**
 * Görev için kullanılacak model: yalnızca admin panelinde seçilen model. Başka sağlayıcıya ya da
 * başka modele kendiliğinden geçilmez; seçilen model çalışmazsa hata yöneticiye gösterilir.
 * Panelde hiç model seçilmemişse (eski kurulum) anahtarı tanımlı sağlayıcının önerilen modeli kullanılır.
 * Dizi döndürür (çağıranlar için geriye uyumluluk) ama her zaman en fazla tek öğe içerir.
 */
export function resolveModelChain(task: AiTask, settings: SettingsRow, override?: string | null): ModelRef[] {
  let ref = parseModelRef(override ?? storedValue(task, settings));
  // Seslendirme yalnızca Google'da var; başka sağlayıcı kaydedilmişse geçersiz sayılır
  if (task === "tts" && ref && ref.provider !== "google") ref = null;
  if (!ref) ref = defaultRef(task, task === "tts" ? "google" : undefined);
  return ref ? [ref] : [];
}
