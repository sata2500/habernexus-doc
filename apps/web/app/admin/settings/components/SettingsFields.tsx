"use client";

import { useId } from "react";
import { Info } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all";

/** Etiketli alan: etiket ve açıklama alana bağlıdır (ekran okuyucular okur) */
export function Field({ label, icon: Icon, hint, children }: {
  label: string;
  icon: React.ElementType;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary-500" aria-hidden="true" />
        {label}
      </label>
      {children({ id, "aria-describedby": hintId })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
          {hint}
        </p>
      )}
    </div>
  );
}

type Native = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

export function TextInput({ value, onChange, type = "text", ...rest }: Native & { value: string; onChange: (v: string) => void }) {
  return <input {...rest} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} h-11`} />;
}

export function TextArea({ value, onChange, rows = 3, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & { value: string; onChange: (v: string) => void }) {
  return <textarea {...rest} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} py-3 resize-y`} />;
}

export function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="text-base font-bold font-display flex items-center gap-2 border-b border-border pb-3">
      <Icon className="h-4 w-4 text-primary-500" aria-hidden="true" />
      {children}
    </h3>
  );
}
