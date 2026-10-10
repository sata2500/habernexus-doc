import { stripLeadingTitleHeading } from "@/lib/article-content";
import { getStaticPageBySlug } from "@/app/actions/static-pages";
import { sanitizeHtml } from "@/lib/server/sanitize-html";

// Sayfa admin panelinden düzenlenince anında yenilenir; aksi halde günde bir
export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getStaticPageBySlug("terms");
  return {
    alternates: { canonical: "/terms" },
    title: page?.title || "Kullanım Şartları",
    description: page?.description || "Haber Nexus kullanım şartları ve yasal sorumluluklar.",
  };
}

export default async function TermsPage() {
  const page = await getStaticPageBySlug("terms");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page?.title || "Kullanım Şartları"}
        </h1>

        {page?.content && (
          <div
            className="text-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripLeadingTitleHeading(page.title, page.content)) }}
          />
        )}
      </div>
    </div>
  );
}
