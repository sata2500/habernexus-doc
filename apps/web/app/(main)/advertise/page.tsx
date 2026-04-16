import { getStaticPageBySlug } from "@/app/actions/static-pages";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("advertise");
  return {
    title: page?.title || "Reklam Verin",
    description: page?.description || "Haber Nexus reklam ve sponsorluk fırsatları.",
  };
}

export default async function AdvertisePage() {
  const page = await getStaticPageBySlug("advertise");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          {page?.title || "Reklam Verin"}
        </h1>
             </li>
           </ul>
        </Card>

        <Card className="p-8 bg-primary-50/50 dark:bg-primary-900/10 border-primary-500/20">
           <Mail className="h-10 w-10 text-primary-500 mb-6" />
           <h3 className="text-2xl font-bold mb-4 font-(family-name:--font-outfit)">Bize Ulaşın</h3>
           <p className="text-muted-foreground mb-6">
             Banner reklam alanları, sponsorlu köşe yazıları, sosyal medya kampanyaları ve daha birçok dijital partnerlik seçeneği için reklam satış departmanımıza doğrudan ulaşabilirsiniz.
           </p>
           
           <div className="space-y-4">
             <div className="p-4 bg-background rounded-xl border border-border">
               <p className="text-sm text-muted-foreground mb-1">Kurumsal Reklam İletişimi</p>
               <a href="mailto:reklam@habernexus.com" className="text-lg font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                 reklam@habernexus.com
               </a>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
}
