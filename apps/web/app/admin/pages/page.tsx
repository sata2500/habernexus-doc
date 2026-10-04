import Link from "next/link";
import { AlertTriangle, Briefcase, CheckCircle2, ChevronRight, FileText, Info, Mail, Megaphone, Scale, Shield, Cookie, type LucideIcon } from "lucide-react";
import { getStaticPages } from "@/app/actions/static-pages";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ICONS: Record<string, LucideIcon> = {
  about: Info, contact: Mail, careers: Briefcase, advertise: Megaphone,
  privacy: Shield, terms: Scale, cookies: Cookie, kvkk: Shield,
};

export default async function AdminPagesPage() {
  const pages = await getStaticPages();
  const empty = pages.filter((p) => p.isPlaceholder).length;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-primary-500" /> Sabit sayfalar
        </h1>
        <p className="text-sm text-muted-foreground">Sitenin alt kısmında bağlantısı bulunan Hakkımızda, İletişim, gizlilik ve yasal metin sayfaları.</p>
      </div>

      {empty > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          {empty} sayfa henüz yazılmamış; ziyaretçiler bu sayfalarda yer tutucu metin görüyor.
        </p>
      )}

      <ul className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
        {pages.map((p) => {
          const Icon = ICONS[p.slug] ?? FileText;
          return (
            <li key={p.id}>
              <Link href={`/admin/pages/${p.slug}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/50">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{p.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">/{p.slug} · {formatRelativeTime(p.updatedAt, { compact: true })} güncellendi</span>
                </span>
                {p.isPlaceholder
                  ? <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">Yazılmadı</span>
                  : <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Hazır" />}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
