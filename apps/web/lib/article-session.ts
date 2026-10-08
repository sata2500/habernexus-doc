/**
 * Haber sayfasındaki okuma oturumu: kaydırarak okuma ve sesli dinleme tek yerde birleşir.
 * İlerleme çubuğu, "kaldığın yerden devam" kaydı ve "okundu" işareti bu durumu kullanır.
 *
 * Kurallar:
 * - İlerleme = kaydırma ile dinleme ilerlemesinin büyüğü.
 * - "Okumaya başladı" sayılmak için sekme görünürken en az ENGAGE_SECONDS geçmeli ve okur
 *   sayfayı gerçekten ilerletmiş (ilk açılıştaki görünen kısmın ötesine kaydırmış) ya da dinlemiş olmalı.
 *   Böylece haberi açıp hemen çıkmak "yarım kaldı" kaydı oluşturmaz.
 * - "Okundu": metnin sonuna kaydırıp haberin uzunluğuna göre makul bir süre geçirmek (hızla
 *   aşağı kaydırmak okumak sayılmaz) ya da sesli dinlemeyi neredeyse sonuna kadar dinlemek.
 */

import { READ_COMPLETE_AT } from "./reading-progress";

export const LISTEN_COMPLETE_AT = 95;
const ENGAGE_SECONDS = 8;
const ENGAGE_SCROLL_GAIN = 8;

export interface ArticleSessionState {
  articleId: string | null;
  /** Kaydırarak ulaşılan en ileri nokta (0-100) */
  scroll: number;
  /** Sesli dinlemede ulaşılan en ileri nokta (0-100) */
  listen: number;
  /** Ses şu an çalıyor mu */
  listening: boolean;
  /** Dinlemede kalan süre (sn, okuma hızına göre) */
  listenRemaining: number | null;
  /** Sekme görünürken geçen süre (sn) */
  activeSeconds: number;
  engaged: boolean;
  completed: boolean;
  completedBy: "scroll" | "listen" | null;
  /** Bu oturumdan önce okunmuş mu (bu cihazda) */
  previouslyCompleted: boolean;
  /** Tahmini okuma süresi (dk) */
  estimatedMinutes: number;
}

const INITIAL: ArticleSessionState = {
  articleId: null, scroll: 0, listen: 0, listening: false, listenRemaining: null, activeSeconds: 0,
  engaged: false, completed: false, completedBy: null, previouslyCompleted: false, estimatedMinutes: 1,
};

let state: ArticleSessionState = INITIAL;
let baselineScroll: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<ArticleSessionState>) {
  const next = { ...state, ...patch };
  next.engaged = next.engaged || (
    next.activeSeconds >= ENGAGE_SECONDS &&
    ((baselineScroll !== null && next.scroll - baselineScroll >= ENGAGE_SCROLL_GAIN) || next.listen >= 3)
  );
  if (!next.completed) {
    if (next.listen >= LISTEN_COMPLETE_AT) {
      next.completed = true;
      next.completedBy = "listen";
    } else if (next.scroll >= READ_COMPLETE_AT && next.activeSeconds >= minReadSeconds(next.estimatedMinutes)) {
      next.completed = true;
      next.completedBy = "scroll";
    }
    if (next.completed) next.engaged = true;
  }
  state = next;
  listeners.forEach((l) => l());
}

/** Haberi bitmiş saymak için gereken en az süre: tahmini sürenin %30'u, 15–90 sn arası */
export function minReadSeconds(estimatedMinutes: number) {
  return Math.min(90, Math.max(15, Math.round(estimatedMinutes * 60 * 0.3)));
}

/** Haber sayfası açılınca başlatılır */
export function startArticleSession(articleId: string, estimatedMinutes: number, previouslyCompleted: boolean) {
  if (timer) clearInterval(timer);
  // Aynı haber yeniden açıldıysa (geri dönüş) yeni oturum başlar
  baselineScroll = null;
  state = { ...INITIAL, articleId, estimatedMinutes: Math.max(1, estimatedMinutes), previouslyCompleted };
  timer = setInterval(() => {
    if (document.visibilityState === "visible") set({ activeSeconds: state.activeSeconds + 1 });
  }, 1000);
  listeners.forEach((l) => l());
}

export function endArticleSession(articleId: string) {
  if (state.articleId !== articleId) return;
  if (timer) clearInterval(timer);
  timer = null;
}

export function reportScroll(progress: number) {
  if (!state.articleId) return;
  const p = Math.max(0, Math.min(100, progress));
  // İlk ölçüm: sayfa açıldığında zaten görünen kısım (okunmuş sayılmaz, yalnızca başlangıç)
  if (baselineScroll === null) baselineScroll = p;
  if (p > state.scroll) set({ scroll: p });
}

export function reportListen(progress: number, listening: boolean, remainingSeconds: number | null) {
  if (!state.articleId) return;
  set({ listen: Math.max(state.listen, Math.max(0, Math.min(100, progress))), listening, listenRemaining: remainingSeconds });
}

export function setListening(listening: boolean) {
  if (state.listening !== listening) set({ listening });
}

/**
 * Kaydedilecek ilerleme: okundu ise 100. Okundu sayılmamışsa en fazla 96 gönderilir; aksi hâlde
 * sunucu (>= 97) hızla sona kaydırılmış haberi de "okundu" işaretlerdi.
 */
export function sessionProgress(s: ArticleSessionState = state) {
  return s.completed ? 100 : Math.min(READ_COMPLETE_AT - 1, Math.round(Math.max(s.scroll, s.listen)));
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export const getSessionSnapshot = () => state;
export const getSessionServerSnapshot = () => INITIAL;
