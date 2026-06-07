"use client";

import { useState, useEffect } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { updateUserBio, getUserBio } from "../actions";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, User as UserIcon, PenTool, ShieldCheck, ArrowRight, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ImageUploader } from "@/components/ui/ImageUploader";
import Link from "next/link";
import { cn } from "@/lib/utils";

function getRoleBadge(role: string | null | undefined) {
  if (role === "ADMIN") {
    return { 
      label: "Admin", 
      variant: "error" as const, 
      icon: ShieldCheck,
      badgeClass: "bg-red-500 text-white dark:bg-red-500/15 dark:text-red-400 border border-red-500/20"
    };
  }
  if (role === "AUTHOR") {
    return { 
      label: "Yazar", 
      variant: "primary" as const, 
      icon: PenTool,
      badgeClass: "bg-primary-500 text-white dark:bg-primary-500/15 dark:text-primary-400 border border-primary-500/20"
    };
  }
  return { 
    label: "Standart Kullanıcı", 
    variant: "default" as const, 
    icon: null,
    badgeClass: "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground border border-border/40"
  };
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name);
      setAvatarUrl(session.user.image || "");
      // Veritabanındaki güncel biyografiyi çek
      getUserBio().then((dbBio) => {
        setBio(dbBio);
      });
    }
  }, [session]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);
    setSuccessMsg("");

    try {
      await authClient.updateUser({
        name,
        image: avatarUrl || undefined,
      });
      await updateUserBio(bio);
      setSuccessMsg("Profiliniz başarıyla güncellendi.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const role = session.user.role;
  const roleBadge = getRoleBadge(role);
  const isPrivileged = role === "ADMIN" || role === "AUTHOR";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Profil Bilgileri</h1>
        <p className="text-muted-foreground text-sm">Halka açık profil detaylarınızı ve bilgilerinizi özelleştirin.</p>
      </div>

      {/* ── Yazar / Admin Panel Erişim Butonu ─────────────────────── */}
      {isPrivileged && (
        <Link href={role === "ADMIN" ? "/admin" : "/author"}>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 hover:shadow-glow transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                {role === "ADMIN" ? <ShieldCheck className="h-5 w-5 text-primary-500" /> : <PenTool className="h-5 w-5 text-primary-500" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {role === "ADMIN" ? "Admin & Yazar Paneli" : "Yazar Paneli"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role === "ADMIN" ? "İçerik yönetimi, haber ekleme ve düzenleme araçları" : "Haber ekleme ve makalelerinizi yönetin"}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      <Card variant="glass" className="p-6 md:p-8">
        <form onSubmit={handleUpdate} className="space-y-8">
          
          {/* Avatar Alanı */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-border/40">
            <div className="space-y-3 flex flex-col items-center sm:items-start shrink-0">
               <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profil Fotoğrafı</label>
               <ImageUploader 
                 value={avatarUrl}
                 onChange={setAvatarUrl}
                 type="profile"
                 aspectRatio="square"
                 autoOptimize={true}
                 className="w-32 h-32"
               />
            </div>
            <div className="flex-1 w-full space-y-3 pt-2 sm:pt-6">
               <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-xs text-muted-foreground space-y-2.5">
                 <p className="font-semibold text-foreground flex items-center gap-1.5">
                   <Info className="h-4 w-4 text-primary-500" />
                   Görsel Gereksinimleri:
                 </p>
                 <ul className="space-y-1.5 pl-1.5 list-none text-muted-foreground/90">
                   <li className="flex items-center gap-1.5">
                     <span className="h-1.5 w-1.5 rounded-full bg-primary-500/60" />
                     Önerilen: <strong className="text-foreground font-semibold">400x400px (Kare)</strong>
                   </li>
                   <li className="flex items-center gap-1.5">
                     <span className="h-1.5 w-1.5 rounded-full bg-primary-500/60" />
                     Maksimum dosya boyutu: <strong className="text-foreground font-semibold">5MB</strong>
                   </li>
                   <li className="flex items-center gap-1.5">
                     <span className="h-1.5 w-1.5 rounded-full bg-primary-500/60" />
                     Formatlar: <strong className="text-foreground font-semibold">JPG, PNG, WebP</strong>
                   </li>
                 </ul>
                 <p className="pt-1.5 text-[10px] text-muted-foreground/75 border-t border-border/20 italic">
                   * Yüklenen görseller performans için otomatik olarak WebP formatına çevrilir.
                 </p>
               </div>
            </div>
          </div>

          {/* Temel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/40">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grup / Rol</label>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40 border border-border/40 select-none">
                <span className="text-sm text-muted-foreground font-medium">Mevcut Rolünüz</span>
                <Badge className={cn("flex items-center gap-1.5 px-3 py-1 font-bold text-xs uppercase tracking-wider", roleBadge.badgeClass)}>
                  {roleBadge.icon && <roleBadge.icon className="h-3.5 w-3.5" />}
                  {roleBadge.label}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Görüntülenen İsim</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary-500 transition-colors duration-200" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/60 hover:border-border/80 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 outline-none transition-all text-sm text-foreground"
                  required
                />
              </div>
            </div>
          </div>

          {/* Biyografi */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Biyografi (Hakkımda)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendinizden kısa bir şekilde bahsedin..."
              className="w-full px-4 py-3 rounded-xl bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/60 hover:border-border/80 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 outline-none transition-all text-sm text-foreground resize-y min-h-[140px]"
            />
          </div>

          {/* Aksiyon Butonu */}
          <div className="flex items-center justify-end gap-4 pt-4">
            {successMsg && (
              <span className="text-sm text-green-500 font-medium flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                <CheckCircle2 className="h-4 w-4" /> {successMsg}
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-primary hover:opacity-95 text-white font-semibold shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-[0.98] transition-all disabled:opacity-75 flex items-center justify-center min-w-[180px] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                "Değişiklikleri Kaydet"
              )}
            </button>
          </div>
          
        </form>
      </Card>
    </div>
  );
}
