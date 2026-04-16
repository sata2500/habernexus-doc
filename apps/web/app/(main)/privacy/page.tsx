import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("privacy");
  return {
    title: page?.title || "Gizlilik Politikası",
    description: page?.description || "Haber Nexus gizlilik politikası ve verilerinizin korunması hakkında bilgiler.",
  };
}

export default async function PrivacyPage() {
  const page = await getStaticPageBySlug("privacy");

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Gizlilik Politikası</h1>
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
          className="text-foreground"
          dangerouslySetInnerHTML={{ __html: page.content }} 
        />
      </div>
    </div>
  );
}
