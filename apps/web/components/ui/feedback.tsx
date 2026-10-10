"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sitenin tasarımına uyan bildirim (toast) ve onay penceresi. Tarayıcının alert()/confirm()
 * kutularının yerine kullanılır; her yerden çağrılabilir:
 *   toast.success("Kaydedildi")
 *   if (await confirmDialog({ title: "Silinsin mi?", tone: "danger" })) { ... }
 * Görünüm, kök düzende bir kez yer alan <FeedbackHost /> tarafından çizilir.
 */

type ToastTone = "success" | "error" | "info";
interface ToastItem { id: number; tone: ToastTone; message: string }

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** danger: geri alınamayan işlemler (silme vb.) için kırmızı onay düğmesi */
  tone?: "danger" | "default";
  /** Verilirse onay düğmesi bu kelime yazılana kadar kapalı kalır (ör. hesap silme için "SİL") */
  requireText?: string;
}
interface ConfirmState extends ConfirmOptions { resolve: (ok: boolean) => void }

interface FeedbackState { toasts: ToastItem[]; confirm: ConfirmState | null }

let state: FeedbackState = { toasts: [], confirm: null };
const listeners = new Set<() => void>();
let nextId = 1;

function setState(next: Partial<FeedbackState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;
const SERVER_STATE: FeedbackState = { toasts: [], confirm: null };

const DURATION: Record<ToastTone, number> = { success: 3500, info: 4500, error: 6500 };

function dismiss(id: number) {
  setState({ toasts: state.toasts.filter((t) => t.id !== id) });
}

function show(tone: ToastTone, message: string) {
  const id = nextId++;
  // En fazla 3 bildirim üst üste: eskiler düşer
  setState({ toasts: [...state.toasts, { id, tone, message }].slice(-3) });
  setTimeout(() => dismiss(id), DURATION[tone]);
  return id;
}

export const toast = Object.assign((message: string) => show("info", message), {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
});

/** Onay penceresi açar; "Onayla" seçilirse true, vazgeçilirse ya da kapatılırsa false döner */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // Önceki açık pencere varsa vazgeçilmiş sayılır
  state.confirm?.resolve(false);
  return new Promise((resolve) => setState({ confirm: { ...options, resolve } }));
}

function closeConfirm(ok: boolean) {
  const c = state.confirm;
  if (!c) return;
  setState({ confirm: null });
  c.resolve(ok);
}

const TONE: Record<ToastTone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "text-success" },
  error: { icon: XCircle, cls: "text-error" },
  info: { icon: Info, cls: "text-primary-500" },
};

export function FeedbackHost() {
  const { toasts, confirm } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
  return (
    <>
      {/* Mobilde alt menünün üstünde, masaüstünde sağ altta */}
      <div
        aria-live="polite"
        className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:left-auto md:right-6 z-[var(--z-toast)] flex flex-col items-center md:items-end gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => {
          const { icon: Icon, cls } = TONE[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", cls)} aria-hidden="true" />
              <p className="flex-1 min-w-0 text-sm leading-snug break-words">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Bildirimi kapat"
                className="-m-1.5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      {confirm && <ConfirmModal {...confirm} />}
    </>
  );
}

function ConfirmModal({ title, message, confirmText = "Onayla", cancelText = "Vazgeç", tone = "default", requireText }: ConfirmState) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const locked = !!requireText && typed.trim().toLocaleUpperCase("tr") !== requireText.toLocaleUpperCase("tr");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Tehlikeli işlemlerde odak "Vazgeç"te başlar: yanlışlıkla Enter'a basmak silmesin
    (requireText ? inputRef : tone === "danger" ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm(false);
      if (e.key === "Tab") {
        // Odak pencerede kalsın
        const items = [inputRef.current, cancelRef.current, confirmRef.current].filter((el) => el && !(el as HTMLButtonElement).disabled) as HTMLElement[];
        const i = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [tone, requireText]);

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => closeConfirm(false)} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? "confirm-message" : undefined}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
      >
        <div className="flex items-start gap-3">
          {tone === "danger" && (
            <span className="h-10 w-10 shrink-0 rounded-2xl bg-error/10 text-error flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 space-y-1.5">
            <h2 id="confirm-title" className="text-base font-bold leading-snug">{title}</h2>
            {message && <p id="confirm-message" className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{message}</p>}
          </div>
        </div>
        {requireText && (
          <label className="mt-4 block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Onaylamak için <strong className="text-foreground">{requireText}</strong> yazın</span>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !locked) closeConfirm(true); }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-error/40"
            />
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => closeConfirm(false)}
            className="h-11 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors focus-ring"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => closeConfirm(true)}
            disabled={locked}
            className={cn(
              "h-11 px-5 rounded-xl text-sm font-semibold text-white transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed",
              tone === "danger" ? "bg-error hover:bg-error/90" : "bg-primary-500 hover:bg-primary-600",
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
