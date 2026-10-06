import { getStaticPageBySlug } from "@/app/actions/static-pages";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { sanitizeHtml } from "@/lib/server/sanitize-html";

// Sayfa admin panelinden düzenlenince anında yenilenir; aksi halde günde bir
export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getStaticPageBySlug("contact");
  return {
    alternates: { canonical: "/contact" },
    title: page?.title || "İletişim",
    description: page?.description || "Haber Nexus iletişim bilgileri ve bize ulaşma yöntemleri.",
  };
}

/** Eski sürümün veritabanına yazdığı örnek (gerçek olmayan) iletişim bilgileri gösterilmez */
const PLACEHOLDERS = new Set(["+90 (212) 000 00 00", "Levent Mah. Medya Sk. No: 1, Beşiktaş / İstanbul"]);
const text = (v: unknown) => (typeof v === "string" && v.trim() && !PLACEHOLDERS.has(v.trim()) ? v.trim() : null);

export default async function ContactPage() {
  const page = await getStaticPageBySlug("contact");

  // Yalnızca yönetim panelinde girilen iletişim bilgileri gösterilir (varsayılan/uydurma bilgi yok)
  const contactData = (page?.extraData && typeof page.extraData === "object" ? page.extraData : {}) as Record<string, unknown>;
  const email = text(contactData.email);
  const phone = text(contactData.phone);
  const address = text(contactData.address);
  const cards = [email, phone, address].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          {page?.title || "Bize Ulaşın"}
        </h1>
        {page?.content ? (
          <div
            className="prose dark:prose-invert mx-auto text-lg text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
          />
        ) : (
          <p className="text-lg text-muted-foreground">
            Soru, görüş ve haber ihbarlarınız için aşağıdaki kanallardan bize ulaşabilirsiniz.
          </p>
        )}
      </div>

      {cards > 0 && (
        <div className={`grid grid-cols-1 gap-6 md:gap-8 ${cards === 3 ? "md:grid-cols-3" : cards === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "max-w-md mx-auto"}`}>
          {email && (
            <Card className="flex flex-col items-center text-center p-8 bg-muted/20">
              <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
                <Mail className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold mb-3">E-posta</h2>
              <p className="text-muted-foreground text-sm mb-6 flex-1">Genel sorularınız, bülten ve destek talepleriniz için.</p>
              <a href={`mailto:${email}`} className="text-primary-600 font-medium hover:underline break-all">{email}</a>
            </Card>
          )}
          {phone && (
            <Card className="flex flex-col items-center text-center p-8 bg-muted/20">
              <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
                <Phone className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold mb-3">Telefon</h2>
              <p className="text-muted-foreground text-sm mb-6 flex-1">Haber ihbarı ve kurumsal iletişim için.</p>
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="text-primary-600 font-medium hover:underline">{phone}</a>
            </Card>
          )}
          {address && (
            <Card className="flex flex-col items-center text-center p-8 bg-muted/20">
              <div className="h-14 w-14 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center mb-6">
                <MapPin className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold mb-3">Adres</h2>
              <address className="not-italic text-muted-foreground text-sm mb-6 flex-1 whitespace-pre-line">
                {address.split(",").map((line) => line.trim()).join("\n")}
              </address>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 font-medium hover:underline flex items-center gap-1.5"
              >
                Haritada gör <ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only"> (yeni sekmede açılır)</span>
              </a>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
