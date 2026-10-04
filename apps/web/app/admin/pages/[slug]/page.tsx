import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { getStaticPageBySlug } from "@/app/actions/static-pages";
import { PageEditor } from "./PageEditor";

export const dynamic = "force-dynamic";

export default async function EditStaticPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole("ADMIN");
  const { slug } = await params;
  const page = await getStaticPageBySlug(slug);
  if (!page) notFound();

  const extra = (page.extraData && typeof page.extraData === "object" && !Array.isArray(page.extraData) ? page.extraData : {}) as Record<string, string>;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Sabit sayfalar
      </Link>
      <PageEditor
        page={{ id: page.id, slug: page.slug, title: page.title, description: page.description ?? "", content: page.content }}
        extra={{ email: extra.email ?? "", phone: extra.phone ?? "", address: extra.address ?? "" }}
      />
    </div>
  );
}
