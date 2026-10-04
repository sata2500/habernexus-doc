/**
 * Görev için model zincirini (birincil + yedekler) belirler. Saf mantık: test edilebilir,
 * yalnızca ortam değişkenlerinden hangi sağlayıcı anahtarlarının tanımlı olduğunu okur.
 */
import { crossProviderRef, DEFAULT_MODELS, isRetiredModel, parseModelRef, type AiProvider, type AiTask, type ModelRef } from "./models";

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
 * Görev için kullanılacak model ve yedekleri (sırayla denenir).
 */
export function resolveModelChain(task: AiTask, settings: SettingsRow, override?: string | null): ModelRef[] {
  let primary = parseModelRef(override ?? storedValue(task, settings));
  if (primary && isRetiredModel(primary.model)) {
    primary = defaultRef(task, primary.provider);
  }
  if (task === "tts" && primary?.provider !== "google") primary = defaultRef("tts", "google");
  if (!primary) primary = defaultRef(task);

  const chain: ModelRef[] = [];
  const push = (ref: ModelRef | null) => {
    if (ref && !chain.some((r) => r.provider === ref.provider && r.model === ref.model)) chain.push(ref);
  };
  push(primary);
  if (primary && task !== "tts") push(crossProviderRef(primary));
  push(defaultRef(task, primary?.provider));
  if (task !== "tts") push(defaultRef(task, primary?.provider === "google" ? "openrouter" : "google"));
  if (task === "tts") push({ provider: "google", model: "gemini-3.8-flash-lite-tts" });
  return chain;
}

