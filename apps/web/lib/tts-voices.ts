/** Seslendirme sesleri (sunucu ve istemci ortak). voiceName: Gemini TTS hazır ses adı. */
export const TTS_VOICES = {
  "kadin-1": { voiceName: "Kore", gender: "Kadın", label: "Net" },
  "kadin-2": { voiceName: "Sulafat", gender: "Kadın", label: "Sıcak" },
  "erkek-1": { voiceName: "Charon", gender: "Erkek", label: "Bilgilendirici" },
  "erkek-2": { voiceName: "Algieba", gender: "Erkek", label: "Yumuşak" },
} as const;

export type TtsVoiceId = keyof typeof TTS_VOICES;

export const DEFAULT_TTS_VOICE: TtsVoiceId = "kadin-1";

export function isTtsVoiceId(value: unknown): value is TtsVoiceId {
  return typeof value === "string" && value in TTS_VOICES;
}
