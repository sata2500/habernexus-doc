"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { subscribeToNewsletter } from "@/app/(main)/newsletter-actions";

/** Haber sonunda gösterilen kısa bülten kayıt kutusu. */
export function NewsletterInline() {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResult(null);
    start(async () => {
      const res = await subscribeToNewsletter(email.trim());
      setResult(res.success ? { ok: true, text: res.message || "Bültene kaydoldunuz." } : { ok: false, text: res.error || "Kayıt yapılamadı." });
      if (res.success) setEmail("");
    });
  };

  return (
    <section aria-labelledby="newsletter-inline-title" className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-5 sm:p-6 mb-12">
      {result?.ok ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {result.text}
        </p>
      ) : (
        <>
          <h2 id="newsletter-inline-title" className="flex items-center gap-2 font-bold font-display">
            <Mail className="h-5 w-5 text-primary-500" /> Günün özeti e-postanızda
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Her sabah öne çıkan haberleri kısa bir e-postayla alın. İstediğiniz zaman ayrılabilirsiniz.</p>
          <form onSubmit={submit} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              aria-label="E-posta adresiniz"
              autoComplete="email"
              className="h-11 flex-1 min-w-0 rounded-xl border border-border bg-background px-3.5 text-base sm:text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Abone ol
            </button>
          </form>
          {result && !result.ok && <p role="alert" className="mt-2 text-sm text-error">{result.text}</p>}
        </>
      )}
    </section>
  );
}
