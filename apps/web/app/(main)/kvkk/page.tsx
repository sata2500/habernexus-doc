import { stripLeadingTitleHeading } from "@/lib/article-content";
import { getStaticPageBySlug } from "@/app/actions/static-pages";
import { sanitizeHtml } from "@/lib/server/sanitize-html";

// Sayfa admin panelinden düzenlenince anında yenilenir; aksi halde günde bir
export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getStaticPageBySlug("kvkk");
  return {
    alternates: { canonical: "/kvkk" },
    title: page?.title || "KVKK Aydınlatma Metni",
    description: page?.description || "Haber Nexus KVKK aydınlatma metni ve kişisel verilerin korunması kanunu kapsamındaki haklarınız.",
  };
}

export default async function KVKKPage() {
  const page = await getStaticPageBySlug("kvkk");

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">KVKK Aydınlatma Metni</h1>
        <p className="mt-4 text-muted-foreground">İçerik hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page.title}
        </h1>

        <div
          className="text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripLeadingTitleHeading(page.title, page.content)) }}
        />
      </div>
    </div>
  );
}
