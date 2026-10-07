"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2, PenTool, ShieldCheck, User as UserIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { cn } from "@/lib/utils";
import { updateUserBio } from "../actions";

const MAX_BIO = 1000;

const ROLE_BADGE: Record<string, { label: string; className: string; icon: typeof ShieldCheck | null }> = {
  ADMIN: { label: "Yönetici", className: "bg-error text-white border border-error/20", icon: ShieldCheck },
  AUTHOR: { label: "Yazar", className: "bg-primary-500 text-white dark:bg-primary-500/15 dark:text-primary-400 border border-primary-500/20", icon: PenTool },
  USER: { label: "Okur", className: "bg-muted text-muted-foreground border border-border/40", icon: null },
};

const fieldClass =
  "w-full px-4 py-3 rounded-xl bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/60 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 outline-none transition-all text-base sm:text-sm text-foreground";

interface Props {
  initial: { name: string; email: string; image: string; bio: string; role: string };
}

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [avatarUrl, setAvatarUrl] = useState(initial.image);
  const [bio, setBio] = useState(initial.bio);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const role = ROLE_BADGE[initial.role] ?? ROLE_BADGE.USER;
  const isPrivileged = initial.role === "ADMIN" || initial.role === "AUTHOR";
  const dirty = name !== initial.name || avatarUrl !== initial.image || bio !== initial.bio;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2 || cleanName.length > 80) return setResult({ ok: false, text: "Ad 2-80 karakter olmalı." });
    setSaving(true);
    setResult(null);
    try {
      if (cleanName !== initial.name || avatarUrl !== initial.image) {
        // Fotoğraf kaldırıldıysa null gönderilir (undefined "değişiklik yok" demektir)
        const { error } = await authClient.updateUser({ name: cleanName, image: avatarUrl || null });
        if (error) {
          setResult({ ok: false, text: error.status === 429 ? "Çok sık güncelleme yapıldı, biraz sonra deneyin." : error.message || "Profil güncellenemedi." });
          return;
        }
      }
      if (bio !== initial.bio) {
        const res = await updateUserBio(bio);
        if (!res.success) {
          setResult({ ok: false, text: res.error });
          return;
        }
      }
      setResult({ ok: true, text: "Profiliniz güncellendi." });
      router.refresh();
    } catch {
      setResult({ ok: false, text: "Bağlantı kurulamadı. Tekrar deneyin." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Profil bilgileri</h1>
        <p className="text-muted-foreground text-sm">Adınız ve fotoğrafınız yorumlarınızda görünür.</p>
      </div>

      {isPrivileged && (
        <Link
          href={initial.role === "ADMIN" ? "/admin" : "/author"}
          className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 transition-all group focus-ring"
        >
          <span className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              {initial.role === "ADMIN" ? <ShieldCheck className="h-5 w-5 text-primary-500" aria-hidden="true" /> : <PenTool className="h-5 w-5 text-primary-500" aria-hidden="true" />}
            </span>
            <span>
              <span className="block font-semibold text-sm text-foreground">{initial.role === "ADMIN" ? "Yönetim paneli" : "Yazar masası"}</span>
              <span className="block text-xs text-muted-foreground">
                {initial.role === "ADMIN" ? "İçerik, kullanıcı ve site yönetimi" : "Haber yazın ve haberlerinizi yönetin"}
              </span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-primary-500 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Link>
      )}

      <Card variant="glass" className="p-6 md:p-8">
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-border/40">
            <div className="space-y-3 flex flex-col items-center sm:items-start shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profil fotoğrafı</span>
              <ImageUploader value={avatarUrl} onChange={setAvatarUrl} type="profile" aspectRatio="square" autoOptimize className="w-32 h-32" />
            </div>
            <div className="flex-1 w-full pt-2 sm:pt-6">
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-primary-500" aria-hidden="true" /> Fotoğraf
                </p>
                <p>Kare (ör. 400×400) bir JPG, PNG ya da WebP görsel seçin; en fazla 5 MB. Görsel otomatik olarak küçültülür.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/40">
            <div className="space-y-2">
              <label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Görünen ad</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary-500" aria-hidden="true" />
                <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={cn(fieldClass, "pl-11")} minLength={2} maxLength={80} autoComplete="name" required />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hesap</span>
              <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-muted/40 border border-border/40">
                <span className="text-sm text-muted-foreground truncate" title={initial.email}>{initial.email}</span>
                <Badge className={cn("flex items-center gap-1.5 px-2.5 py-1 font-bold text-[11px] shrink-0", role.className)}>
                  {role.icon && <role.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {role.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="profile-bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hakkımda</label>
              <span className={cn("text-[11px] tabular-nums", bio.length > MAX_BIO ? "text-error" : "text-muted-foreground")}>{bio.length}/{MAX_BIO}</span>
            </div>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO}
              placeholder="Kendinizden kısaca bahsedin…"
              className={cn(fieldClass, "resize-y min-h-[140px]")}
            />
            {isPrivileged && <p className="text-xs text-muted-foreground">Yazdığınız haberlerin altındaki yazar kartında gösterilir.</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <div aria-live="polite" className="sm:mr-auto">
              {result && (
                <span className={cn("text-sm font-medium flex items-center gap-1.5", result.ok ? "text-success" : "text-error")}>
                  {result.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />} {result.text}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving || !dirty}
              className="px-6 py-3 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px] cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {saving ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
