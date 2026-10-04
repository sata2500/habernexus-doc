/** Okur tepki türleri (sunucu ve istemci ortak). */
export const REACTIONS = [
  { id: "like", emoji: "👍", label: "Beğendim" },
  { id: "insightful", emoji: "💡", label: "Bilgilendirici" },
  { id: "surprised", emoji: "😮", label: "Şaşırtıcı" },
  { id: "applause", emoji: "👏", label: "Tebrik" },
  { id: "angry", emoji: "😡", label: "Tepkili" },
] as const;

export type ReactionType = (typeof REACTIONS)[number]["id"];

export const REACTION_TYPES = REACTIONS.map((r) => r.id) as [ReactionType, ...ReactionType[]];

export interface ReactionSummary {
  /** Tepki tablosu henüz oluşturulmadıysa false (veritabanı güncellemesi bekliyor) */
  available: boolean;
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
}

export function emptyCounts(): Record<ReactionType, number> {
  return Object.fromEntries(REACTION_TYPES.map((t) => [t, 0])) as Record<ReactionType, number>;
}
