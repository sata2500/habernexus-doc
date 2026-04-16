import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("about");
  return {
    title: page?.title || "Hakkımızda",
    description: page?.description || "Haber Nexus hakkında detaylı bilgi, vizyonumuz ve misyonumuz.",
  };
}

export default async function AboutPage() {
  const page = await getStaticPageBySlug("about");

  if (!page) {
    // Eğer veritabanında henüz yoksa (seed çalışmamışsa) basit bir fallback
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Hakkımızda</h1>
        <p className="mt-4 text-muted-foreground">İçerik hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page.title}
        </h1>
        
        <div 
          className="lead text-foreground"
          dangerouslySetInnerHTML={{ __html: page.content }} 
        />
      </div>
    </div>
  );
}
