/**
 * Haber konusu (story) önceliklendirme puanı. Saf fonksiyon; Karar Merkezi'nde
 * puanın nereden geldiği bileşenleriyle birlikte gösterilir.
 */

export type Urgency = "BREAKING" | "TIME_SENSITIVE" | "NORMAL" | "EVERGREEN";

/** Aciliyete göre konunun varsayılan geçerlilik süresi (saat) */
export const VALIDITY_HOURS: Record<Urgency, number> = {
  BREAKING: 12,
  TIME_SENSITIVE: 18,
  NORMAL: 36,
  EVERGREEN: 96,
};

export interface ScoreInput {
  /** Yapay zekânın haber değeri puanı (0-100); yoksa 50 sayılır */
  aiScore: number | null;
  /** Haberi veren farklı kaynak sayısı */
  sourceCount: number;
  /** Google Trends ilgisi (0-100) */
  trendScore: number;
  /** Konunun ilk görüldüğü an (en erken kaynak yayını) */
  startAt: Date;
  urgency: Urgency;
  /** Planlı olay zamanı (maç, toplantı vb.) */
  eventAt: Date | null;
  /** Bu andan sonra haber yazmak anlamsız */
  expiresAt: Date | null;
}

export interface ScoreResult {
  total: number;
  parts: { importance: number; coverage: number; freshness: number; trend: number; urgency: number };
  expiresAt: Date;
  expired: boolean;
}

const COVERAGE = [0, 25, 55, 72, 84, 92, 100];
const HOUR = 3_600_000;

export function computeScore(input: ScoreInput, now: Date = new Date()): ScoreResult {
  const importance = clamp(input.aiScore ?? 50);
  const coverage = COVERAGE[Math.min(Math.max(input.sourceCount, 0), COVERAGE.length - 1)];

  const end = input.expiresAt ?? new Date(input.startAt.getTime() + VALIDITY_HOURS[input.urgency] * HOUR);
  const span = Math.max(end.getTime() - input.startAt.getTime(), HOUR);
  const remaining = (end.getTime() - now.getTime()) / span;
  // Karekök eğrisi: ilk saatlerde yavaş, sona doğru hızlı düşer
  const freshness = Math.round(100 * Math.sqrt(Math.min(1, Math.max(0, remaining))));
  const expired = now.getTime() >= end.getTime();

  // Trend ve aciliyet ek puandır; trend eşleşmesi olmayan iyi haber de sıraya girebilir
  const trend = Math.round(clamp(input.trendScore) * 0.15);
  let urgency = 0;
  if (input.eventAt) {
    const until = input.eventAt.getTime() - now.getTime();
    if (until > 0 && until <= 36 * HOUR) urgency = 10; // olaydan önce yazılmalı
  }
  if (input.urgency === "BREAKING" && now.getTime() - input.startAt.getTime() < 3 * HOUR) urgency = Math.max(urgency, 8);

  const total = expired ? 0 : clamp(Math.round(0.55 * importance + 0.25 * coverage + 0.2 * freshness + trend + urgency));
  return { total, parts: { importance, coverage, freshness, trend, urgency }, expiresAt: end, expired };
}

/** Planlı olay haberlerinde son geçerlilik: olay başlayınca ön haber eskir. */
export function deriveExpiry(startAt: Date, urgency: Urgency, eventAt: Date | null, validHours: number | null): Date {
  if (eventAt && eventAt.getTime() > startAt.getTime() && eventAt.getTime() - startAt.getTime() <= 7 * 24 * HOUR) return eventAt;
  return new Date(startAt.getTime() + (validHours && validHours > 0 ? Math.min(validHours, 168) : VALIDITY_HOURS[urgency]) * HOUR);
}

function clamp(n: number) {
  return Math.min(100, Math.max(0, n));
}
