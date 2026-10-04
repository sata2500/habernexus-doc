"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, Save } from "lucide-react";
import { updateStaticPage } from "@/app/actions/static-pages";

const TiptapEditor = dynamic(() => import("@/app/author/components/TiptapEditor").then((m) => m.TiptapEditor), {
  ssr: false,
  loading: () => <div className="h-72 rounded-xl border border-border bg-muted/30 animate-pulse" />,
});

const inputClass = "w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

/** Sayfaya göre ek iletişim alanları */
const EXTRA_FIELDS: Record<string, { key: "email" | "phone" | "address"; label: string; placeholder: string }[]> = {
  contact: [
    { key: "email", label: "E-posta", placeholder: "info@habernexus.com" },
    { key: "phone", label: "Telefon", placeholder: "+90 ..." },
    { key: "address", label: "Adres", placeholder: "Mahalle, sokak, ilçe / il" },
  ],
  advertise: [{ key: "email", label: "Reklam e-postası", placeholder: "reklam@habernexus.com" }],
};

export function PageEditor({ page, extra: initialExtra }: {
  page: { id: string; slug: string; title: string; description: string; content: string };
  extra: { email: string; phone: string; address: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description);
  const [content, setContent] = useState(page.content);
  const [extra, setExtra] = useState(initialExtra);
  const [saving, startSave] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const fields = EXTRA_FIELDS[page.slug];

  const save = () => {
    setStatus(null);
    startSave(async () => {
      const res = await updateStaticPage(page.id, { title, description, content, ...(fields && { extraData: extra }) });
      setStatus(res.success ? { ok: true, text: "Kaydedildi" } : { ok: false, text: res.error });
      if (res.success) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold font-display">{page.title}</h1>
        <Link href={`/${page.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500">
          Sayfayı gör <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Başlık</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Arama motoru açıklaması</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Google sonuçlarında görünen 1-2 cümle" className={inputClass} />
        </label>
        {fields?.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-xs font-semibold">{f.label}</span>
            <input value={extra[f.key]} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} placeholder={f.placeholder} className={inputClass} />
          </label>
        ))}
      </section>

      <section className="space-y-1.5">
        <span className="text-xs font-semibold">İçerik</span>
        <TiptapEditor content={content} onChange={setContent} />
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          {status && (
            <span role="status" className={status.ok ? "text-sm text-success inline-flex items-center gap-1" : "text-sm text-error"}>
              {status.ok && <CheckCircle2 className="h-4 w-4" />} {status.text}
            </span>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
