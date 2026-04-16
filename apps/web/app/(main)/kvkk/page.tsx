import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("kvkk");
  return {
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
