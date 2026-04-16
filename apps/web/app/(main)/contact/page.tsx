import { getStaticPageBySlug } from "@/app/actions/static-pages";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";

export async function generateMetadata() {
  const page = await getStaticPageBySlug("contact");
  return {
    title: page?.title || "İletişim",
    description: page?.description || "Haber Nexus iletişim bilgileri ve bize ulaşma yöntemleri.",
  };
}

export default async function ContactPage() {
  const page = await getStaticPageBySlug("contact");
  
  // Tip güvenliği için extraData dökümü
  const contactData = (page?.extraData as Record<string, any>) || {};
  const email = contactData.email || "info@habernexus.com";
  const phone = contactData.phone || "+90 (212) 000 00 00";
  const address = contactData.address || "Levent Mah. Medya Sk. No: 1, Beşiktaş / İstanbul";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          {page?.title || "Bize Ulaşın"}
        </h1>
        {page?.content ? (
          <div 
            className="prose dark:prose-invert mx-auto text-lg text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        ) : (
          <p className="text-lg text-muted-foreground">
            Soru, görüş ve haber ihbarlarınız için iletişim kanallarımız üzerinden bizimle kolayca irtibata geçebilirsiniz.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="flex flex-col items-center text-center p-8 hover:border-primary-500/50 transition-colors bg-muted/20">
          <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">E-Posta</h3>
          <p className="text-muted-foreground text-sm mb-6 flex-1">
            Genel sorularınız, haber bülteni üyelikleri ve dijital destek için 7/24 e-posta gönderin.
          </p>
          <a href={`mailto:${email}`} className="text-primary-600 font-medium hover:underline flex items-center gap-1.5">
            {email} <ExternalLink className="h-4 w-4" />
          </a>
        </Card>

        <Card className="flex flex-col items-center text-center p-8 hover:border-primary-500/50 transition-colors bg-muted/20">
          <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
            <Phone className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Telefon (Haber İhbar)</h3>
          <p className="text-muted-foreground text-sm mb-6 flex-1">
            Önemli haber ihbarları, basın bülteni gönderimleri veya kurumsal iletişim için ofisimizi arayabilirsiniz.
          </p>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-primary-600 font-medium hover:underline">
            {phone}
          </a>
        </Card>

        <Card className="flex flex-col items-center text-center p-8 hover:border-primary-500/50 transition-colors bg-muted/20">
          <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
            <MapPin className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Ofis</h3>
          <p className="text-muted-foreground text-sm mb-6 flex-1">
            {address.split(",").map((line: string, i: number) => (
              <span key={i}>
                {line}
                {i < address.split(",").length - 1 && <br />}
              </span>
            ))}
          </p>
          <button className="text-primary-600 font-medium hover:underline flex items-center gap-1.5 cursor-pointer">
            Haritada Gör <ExternalLink className="h-4 w-4" />
          </button>
        </Card>
      </div>

      <div className="pt-12 text-center border-t border-border/40">
        <p className="text-sm text-muted-foreground">
          Online bir iletişim formu kullanmak yerine, hızlı çözüm için doğrudan e-posta veya telefon ile bize ulaşmayı tercih edebilirsiniz.
        </p>
      </div>
    </div>
  );
}
