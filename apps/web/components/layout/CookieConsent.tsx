"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  CONSENT_GROUPS,
  CONSENT_MAX_AGE,
  CONSENT_OPEN_EVENT,
  needsConsent,
  parseConsent,
  READ_HISTORY_COOKIE,
  serializeConsent,
  type ConsentChoices,
  type ConsentGroup,
} from "@/lib/consent";
import { updateGoogleConsent } from "@/lib/google-consent";
import { clearProgress } from "@/lib/reading-progress";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const GROUP_TEXT: Record<ConsentGroup, { title: string; body: string }> = {
  personalization: {
    title: "Kişiselleştirme",
    body: "“Sizin İçin” önerileri ve “Okumaya devam et” için okuduğunuz haberler bu cihazda hatırlanır.",
  },
  analytics: {
    title: "Ziyaret istatistikleri",
    body: "Google Analytics ile hangi sayfaların okunduğunu ölçeriz. Veriler toplu olarak değerlendirilir.",
  },
  ads: {
    title: "Kişiselleştirilmiş reklamlar",
    body: "Google, ilgi alanlarınıza göre reklam göstermek için çerez kullanır. Kapalıyken de reklam görebilirsiniz, ancak kişiselleştirilmez.",
  },
};

function readCookie() {
  return document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1) ?? "";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
}

function saveConsent(choices: ConsentChoices) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(choices)}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  if (!choices.personalization) {
    // Onay geri alınınca daha önce tutulanlar da silinir
    document.cookie = `${READ_HISTORY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    clearProgress();
  }
  updateGoogleConsent(choices);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Tarayıcıda okunan güncel tercih (sunucuda null) */
export function useConsent(): ConsentChoices | null | undefined {
  const raw = useSyncExternalStore(subscribe, readCookie, () => null);
  if (raw === null) return undefined;
  return parseConsent(raw ? decodeURIComponent(raw) : null);
}

/**
 * Çerez onay bandı. Yalnızca sitede açık olan gruplar sorulur (analitik ve reklam yönetim
 * panelinden açılır). "Reddet" "Kabul et" kadar kolaydır; seçim yapılmadan site kullanılabilir.
 * Sunucuda çizilmez: sayfalar önbellekten sunulur, tercih tarayıcıdadır.
 */
export function CookieConsent({ analytics, ads }: { analytics: boolean; ads: boolean }) {
  const current = useConsent();
  const [reopened, setReopened] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<Record<ConsentGroup, boolean> | null>(null);

  useEffect(() => {
    const open = () => {
      setReopened(true);
      setCustomizing(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (current === undefined) return null;
  const active: Record<ConsentGroup, boolean> = { personalization: true, analytics, ads };
  if (!reopened && !needsConsent(current, active)) return null;

  const groups = CONSENT_GROUPS.filter((g) => active[g]);
  const values = draft ?? Object.fromEntries(CONSENT_GROUPS.map((g) => [g, current?.[g] === true])) as Record<ConsentGroup, boolean>;

  const finish = (pick: (g: ConsentGroup) => boolean) => {
    // Sitede kapalı gruplar için önceki karar korunur (yoksa "sorulmadı" kalır)
    const next = Object.fromEntries(CONSENT_GROUPS.map((g) => [g, active[g] ? pick(g) : (current?.[g] ?? null)])) as ConsentChoices;
    saveConsent(next);
    setReopened(false);
    setCustomizing(false);
    setDraft(null);
  };

  return (
    <section
      role="region"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-lg p-4 sm:p-5 space-y-3">
        <div className="space-y-1 text-sm">
          <h2 id="cookie-consent-title" className="font-semibold text-base">Çerez tercihiniz</h2>
          <p className="text-muted-foreground">
            Sitenin çalışması için gerekli çerezlerin yanında, aşağıdaki amaçlar için izninizi istiyoruz. İstediğiniz zaman sayfanın
            altındaki “Çerez tercihleri” bağlantısından değiştirebilirsiniz.{" "}
            <Link href="/cookies" className="underline underline-offset-2 hover:text-foreground">Çerez Politikası</Link>
          </p>
        </div>

        {customizing ? (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g}>
                <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values[g]}
                    onChange={(e) => setDraft({ ...values, [g]: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
                  />
                  <span className="text-sm">
                    <span className="block font-medium">{GROUP_TEXT[g].title}</span>
                    <span className="block text-muted-foreground">{GROUP_TEXT[g].body}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            İzin istediğimiz konular: {groups.map((g) => GROUP_TEXT[g].title.toLocaleLowerCase("tr")).join(", ")}.
            {!ads && !analytics && " Reklam veya izleme çerezi kullanmıyoruz."}
          </p>
        )}

        {/* Telefonda: Reddet ve Kabul et yan yana (eşit ağırlıkta), ayrıntılı seçim alt satırda */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={() => finish(() => false)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap")}>
            Reddet
          </button>
          {customizing ? (
            <button type="button" onClick={() => finish((g) => values[g])} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "col-span-2 order-last sm:order-none whitespace-nowrap")}>
              Seçimi kaydet
            </button>
          ) : (
            <button type="button" onClick={() => setCustomizing(true)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "col-span-2 order-last sm:order-none whitespace-nowrap")}>
              Ayarla
            </button>
          )}
          <button type="button" onClick={() => finish(() => true)} className={cn(buttonVariants({ size: "sm" }), "whitespace-nowrap")}>
            Tümünü kabul et
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
