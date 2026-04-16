import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("terms");
  return {
    title: page?.title || "Kullanım Şartları",
    description: page?.description || "Haber Nexus kullanım şartları ve yasal sorumluluklar.",
  };
}

export default async function TermsPage() {
  const page = await getStaticPageBySlug("terms");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page?.title || "Kullanım Şartları"}
        </h1>
        
        {page?.content && (
          <div 
            className="text-foreground"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        )}
      </div>
    </div>
  );
}
