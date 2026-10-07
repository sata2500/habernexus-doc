"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { inputClass } from "./AuthCard";

/** Şifre alanı: göster/gizle düğmeli */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/** "Google ile devam et" ve altındaki ayraç */
export function GoogleSignIn({ label, callbackURL, errorCallbackURL, disabled, onStart }: { label: string; callbackURL: string; errorCallbackURL: string; disabled?: boolean; onStart?: () => void }) {
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    onStart?.();
    // Başarılıysa tarayıcı Google'a yönlenir; hata dönerse düğme yeniden etkinleşir
    const { error } = await signIn.social({ provider: "google", callbackURL, errorCallbackURL }).catch(() => ({ error: true }));
    if (error) setBusy(false);
  };
  return (
    <>
      <button
        onClick={start}
        disabled={disabled || busy}
        type="button"
        className="w-full mb-6 py-3 px-4 flex justify-center items-center gap-3 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-ring"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {label}
      </button>
      <div className="relative mb-6" aria-hidden="true">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-sm"><span className="px-2 bg-card text-muted-foreground font-medium">veya e-posta ile</span></div>
      </div>
    </>
  );
}
