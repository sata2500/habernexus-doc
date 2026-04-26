import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface Article {
  title: string;
  excerpt: string | null;
  slug: string;
  coverImage: string | null;
  category: { name: string } | null;
}

interface NewsletterTemplateProps {
  articles: Article[];
  unsubscribeUrl: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";

export const NewsletterTemplate = ({
  articles = [],
  unsubscribeUrl,
}: NewsletterTemplateProps) => {
  const previewText = articles.length > 0 
    ? `Günün Özet Haberleri: ${articles[0].title}`
    : "Haber Nexus Günlük Bülten";

  const mainArticle = articles[0];
  const otherArticles = articles.slice(1);

  return (
    <Html>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: "#2563eb",
                slate: {
                  900: "#0f172a",
                  600: "#475569",
                  400: "#94a3b8",
                  50: "#f8fafc",
                },
              },
            },
          },
        }}
      >
        <Head />
        <Preview>{previewText}</Preview>
        <Body className="bg-[#f1f5f9] font-sans m-0 p-0">
          <Container className="mx-auto my-10 w-[600px] bg-white rounded-3xl overflow-hidden shadow-xl border border-solid border-slate-200">
            
            {/* Header / Logo Section */}
            <Section className="bg-brand py-8 text-center">
              <Link href={BASE_URL}>
                <Img
                  src={`${BASE_URL}/logo-light.png`} // Logo URL'nizin doğruluğundan emin olun
                  alt="Haber Nexus"
                  width="180"
                  className="mx-auto"
                />
              </Link>
              <Text className="text-blue-100 text-[12px] font-bold uppercase tracking-[2px] mt-2 m-0">
                GÜNLÜK HABER ÖZETİ
              </Text>
            </Section>

            {/* Main Featured Article */}
            {mainArticle && (
              <Section className="p-8 pb-4">
                <Text className="text-brand text-xs font-bold uppercase tracking-widest mb-2 m-0">
                  {mainArticle.category?.name || "GÜNDEM"}
                </Text>
                <Link href={`${BASE_URL}/article/${mainArticle.slug}`}>
                  <Heading className="text-slate-900 text-[28px] font-extrabold leading-[1.2] m-0 mb-4 tracking-tight">
                    {mainArticle.title}
                  </Heading>
                </Link>
                {mainArticle.coverImage && (
                  <Link href={`${BASE_URL}/article/${mainArticle.slug}`}>
                    <Img
                      src={mainArticle.coverImage}
                      alt={mainArticle.title}
                      width="536"
                      className="rounded-2xl object-cover w-full aspect-video shadow-lg mb-4"
                    />
                  </Link>
                )}
                <Text className="text-slate-600 text-[16px] leading-[1.6] m-0">
                  {mainArticle.excerpt || mainArticle.title}
                </Text>
                <Section className="mt-6">
                  <Link
                    href={`${BASE_URL}/article/${mainArticle.slug}`}
                    className="bg-brand text-white px-8 py-4 rounded-xl font-bold text-sm inline-block shadow-lg shadow-blue-500/20"
                  >
                    Haberi Oku →
                  </Link>
                </Section>
              </Section>
            )}

            <Hr className="border-slate-100 mx-8 my-6" />

            {/* Other Articles Grid Style */}
            <Section className="px-8 pb-8">
              <Heading className="text-slate-900 text-[18px] font-bold mb-6 m-0">
                Daha Fazla Gelişme
              </Heading>

              {otherArticles.map((article) => (
                <Section key={article.slug} className="mb-8 last:mb-0">
                  <Row>
                    <Column className="align-top pr-4">
                      <Text className="text-brand text-[10px] font-bold uppercase mb-1 m-0">
                        {article.category?.name || "HABER"}
                      </Text>
                      <Link href={`${BASE_URL}/article/${article.slug}`}>
                        <Text className="text-slate-900 text-[18px] font-bold leading-tight m-0 mb-2">
                          {article.title}
                        </Text>
                      </Link>
                      <Text className="text-slate-600 text-[14px] leading-snug m-0 line-clamp-2">
                        {article.excerpt || article.title}
                      </Text>
                    </Column>
                    {article.coverImage && (
                      <Column className="w-[120px] align-top">
                        <Link href={`${BASE_URL}/article/${article.slug}`}>
                          <Img
                            src={article.coverImage}
                            alt={article.title}
                            width="120"
                            height="80"
                            className="rounded-xl object-cover"
                          />
                        </Link>
                      </Column>
                    )}
                  </Row>
                </Section>
              ))}
            </Section>

            {/* Professional Footer */}
            <Section className="bg-slate-50 p-10 text-center border-t border-solid border-slate-200">
              <Text className="text-slate-900 font-bold text-[16px] m-0 mb-2">
                Haber Nexus
              </Text>
              <Text className="text-slate-400 text-[12px] leading-relaxed m-0 mb-6">
                Gerçek haber, yeni nesil deneyim.<br />
                Her sabah en önemli gelişmeleri sizin için özetliyoruz.
              </Text>
              
              <Row className="w-[200px] mx-auto mb-6">
                <Column>
                  <Link href={`${BASE_URL}/about`} className="text-slate-600 text-[12px] font-medium underline">Hakkımızda</Link>
                </Column>
                <Column>
                  <Link href={`${BASE_URL}/advertise`} className="text-slate-600 text-[12px] font-medium underline">Reklam</Link>
                </Column>
              </Row>

              <Hr className="border-slate-200 mb-6" />

              <Text className="text-slate-400 text-[11px] m-0 mb-4">
                Bu bülten Haber Nexus üyeliğiniz kapsamında gönderilmiştir.
              </Text>
              
              <Link
                href={unsubscribeUrl}
                className="text-red-500 text-[12px] font-bold underline"
              >
                Abonelikten Ayrıl
              </Link>

              <Text className="text-slate-400 text-[10px] mt-8 m-0">
                © {new Date().getFullYear()} Haber Nexus. Tüm hakları saklıdır.<br />
                İstanbul, Türkiye
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
  );
};
