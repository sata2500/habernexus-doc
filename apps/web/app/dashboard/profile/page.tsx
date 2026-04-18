"use client";

import { useState, useEffect } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { updateUserBio } from "../actions";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, User as UserIcon, PenTool, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ImageUploader } from "@/components/ui/ImageUploader";
import Link from "next/link";

function getRoleBadge(role: string | null | undefined) {
  if (role === "ADMIN") return { label: "Admin", variant: "error" as const, icon: ShieldCheck };
  if (role === "AUTHOR") return { label: "Yazar", variant: "primary" as const, icon: PenTool };
  return { label: "Standart Kullanıcı", variant: "default" as const, icon: null };
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
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Profil Bilgileri</h1>
        <p className="text-muted-foreground text-sm">Halka açık profil detaylarınızı ve bilgilerinizi özelleştirin.</p>
      </div>

      {/* ── Yazar / Admin Panel Erişim Butonu ─────────────────────── */}
      {isPrivileged && (
        <Link href={role === "ADMIN" ? "/admin" : "/author"}>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/30 hover:border-primary-500/60 transition-all cursor-pointer group">
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

      <Card className="p-6 md:p-8">
        <form onSubmit={handleUpdate} className="space-y-8">
          
          {/* Avatar Alanı */}
          <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-border">
            <div className="space-y-4 text-center sm:text-left">
               <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profil Fotoğrafı</label>
               <ImageUploader 
                 value={avatarUrl}
                 onChange={setAvatarUrl}
                 type="profile"
                 aspectRatio="square"
                 autoOptimize={true}
                 className="w-32 h-32"
               />
            </div>
            <div className="flex-1 space-y-3 pt-6 sm:pt-0">
               <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground space-y-2">
                 <p className="font-semibold text-foreground">Görsel Gereksinimleri:</p>
                 <ul className="list-disc list-inside space-y-1">
                   <li>Önerilen: 400x400px (Kare)</li>
                   <li>Maksimum dosya boyutu: 5MB</li>
                   <li>Formatlar: JPG, PNG, WebP</li>
                 </ul>
                 <p className="pt-2 text-[10px] opacity-70">* Yüklenen görseller performans için otomatik olarak WebP formatına çevrilir.</p>
               </div>
            </div>
          </div>

          {/* Temel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grup/Rol</label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border">
                <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Görüntülenen İsim</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Biyografi */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Biyografi (Hakkımda)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendinizden kısa bir şekilde bahsedin..."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-y min-h-[120px]"
            />
          </div>

          {/* Aksiyon Butonu */}
          <div className="flex items-center justify-end gap-4 pt-4">
            {successMsg && (
              <span className="text-sm text-green-500 font-medium flex items-center gap-1 animate-in fade-in zoom-in">
                <CheckCircle2 className="h-4 w-4" /> {successMsg}
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all focus:ring-4 focus:ring-primary-500/30 disabled:opacity-70 flex items-center justify-center min-w-[140px] cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
