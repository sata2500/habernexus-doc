"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_OPEN_EVENT,
  parseConsent,
  READ_HISTORY_COOKIE,
  serializeConsent,
} from "@/lib/consent";
import { clearProgress } from "@/lib/reading-progress";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function readCookie() {
  return document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1) ?? "";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
}

function saveConsent(personalization: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(personalization)}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  if (!personalization) {
    // Onay geri alınınca daha önce tutulanlar da silinir
    document.cookie = `${READ_HISTORY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    clearProgress();
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * Çerez onay bandı. Sunucuda hiçbir şey çizilmez (sayfalar önbellekten sunulur; tercih tarayıcıdadır).
 * "Reddet" "Kabul et" kadar kolaydır; seçim yapılmadan site kullanılabilir (çerez duvarı yok).
 */
export function CookieConsent() {
  // null: sunucu / henüz okunmadı
  const raw = useSyncExternalStore(subscribe, readCookie, () => null);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (raw === null) return null;
  const current = parseConsent(raw ? decodeURIComponent(raw) : null);
  if (current && !reopened) return null;

  const choose = (personalization: boolean) => {
    saveConsent(personalization);
    setReopened(false);
  };

  return (
    <section
      role="region"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-border bg-card text-card-foreground shadow-lg p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
        <div className="space-y-1 text-sm min-w-0">
          <h2 id="cookie-consent-title" className="font-semibold text-base">Çerez tercihiniz</h2>
          <p className="text-muted-foreground">
            Sitenin çalışması için gerekli çerezlerin yanında, <strong className="text-foreground">“Sizin İçin”</strong> önerileri ve
            {" "}<strong className="text-foreground">“Okumaya devam et”</strong> için okuduğunuz haberleri bu cihazda hatırlamak istiyoruz.
            Reklam veya izleme çerezi kullanmıyoruz.{" "}
            <Link href="/cookies" className="underline underline-offset-2 hover:text-foreground">Çerez Politikası</Link>
            {current && <> · Şu anki tercihiniz: <strong className="text-foreground">{current.personalization ? "kabul" : "ret"}</strong></>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => choose(false)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 sm:flex-none")}>
            Reddet
          </button>
          <button type="button" onClick={() => choose(true)} className={cn(buttonVariants({ size: "sm" }), "flex-1 sm:flex-none")}>
            Kabul et
          </button>
        </div>
      </div>
    </section>
  );
}

/** Alt bilgide: tercihi daha sonra değiştirmek için bandı yeniden açar */
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))} className={className}>
      Çerez tercihleri
    </button>
  );
}
