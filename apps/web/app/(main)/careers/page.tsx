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
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page?.title || "Kariyer"}
        </h1>
        
          </div>
          <a href="mailto:ik@habernexus.com" className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium">
            CV Gönder <ArrowRight className="h-4 w-4" />
          </a>
        </Card>
      </div>
    </div>
  );
}
