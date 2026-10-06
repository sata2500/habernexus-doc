"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import { unsubscribeByToken, unsubscribeSignedUser } from "@/app/actions/newsletter";

export function UnsubscribeConfirm({ token, userId, sig }: { token?: string; userId?: string; sig?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const confirm = () =>
    start(async () => {
      setResult(token ? await unsubscribeByToken(token) : await unsubscribeSignedUser(userId ?? "", sig ?? ""));
    });

  if (result?.success) {
    return (
      <div className="space-y-4">
        <span className="h-16 w-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8" /></span>
        <h1 className="text-2xl font-bold font-display">Abonelik iptal edildi</h1>
        <p className="text-muted-foreground">Artık günlük bülten e-postalarını almayacaksınız. İstediğiniz zaman yeniden abone olabilirsiniz.</p>
        <Link href="/" className="inline-flex h-11 items-center px-6 rounded-xl bg-primary-600 text-white text-sm font-semibold">Haberleri okumaya devam et</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <span className="h-16 w-16 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto"><MailX className="h-8 w-8" /></span>
      <h1 className="text-2xl font-bold font-display">Bültenden çıkmak istiyor musunuz?</h1>
      <p className="text-muted-foreground">Onayladığınızda günlük Haber Nexus bülteni artık e-posta adresinize gönderilmez.</p>
      {result?.error && <p className="flex items-center justify-center gap-2 text-sm text-error"><XCircle className="h-4 w-4" /> {result.error}</p>}
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button onClick={confirm} disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 px-6 rounded-xl bg-error text-white text-sm font-semibold disabled:opacity-60 cursor-pointer">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Abonelikten çık
        </button>
        <Link href="/" className="inline-flex h-11 items-center justify-center px-6 rounded-xl border border-border text-sm font-semibold">Vazgeç</Link>
      </div>
    </div>
  );
}
