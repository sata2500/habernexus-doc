import { Briefcase, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("careers");
  return {
    title: page?.title || "Kariyer",
    description: page?.description || "Haber Nexus kariyer fırsatları ve ekibimize katılın.",
  };
}

export default async function CareersPage() {
  const page = await getStaticPageBySlug("careers");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page?.title || "Kariyer"}
        </h1>
        
        {page?.content ? (
          <div 
            className="text-foreground"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        ) : (
          <p className="text-lg text-muted-foreground">
            Haber Nexus ekibine katılmak için fırsatları takip edin. Yakında pozisyonlarımız burada listelenecektir.
          </p>
        )}
      </div>

      <Card className="bg-muted text-left p-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-primary-500/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Genel Başvuru</h3>
            <p className="text-sm text-muted-foreground">Bizimle potansiyel olarak ilgileniyorsanız, CV&apos;nizi gönderebilirsiniz.</p>
          </div>
        </div>
        <a href="mailto:ik@habernexus.com" className="shrink-0 flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all font-medium group">
          CV Gönder <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </Card>
    </div>
  );
}
