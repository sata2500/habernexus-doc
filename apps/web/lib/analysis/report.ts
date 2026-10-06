/** Kayıtlı analiz raporundan liste rozetinde gösterilecek puan (yeni raporda genel puan) */
export function displayScore(report: unknown, qualityScore: number | null): { value: number; label: string } | null {
  if (report && typeof report === "object" && !Array.isArray(report)) {
    const r = report as { version?: unknown; overall?: unknown };
    if (r.version === 2 && typeof r.overall === "number") return { value: r.overall, label: "Puan" };
  }
  return qualityScore === null ? null : { value: qualityScore, label: "Kalite" };
}
