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

  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>{previewText}</Preview>
        <Body className="bg-white font-sans py-10">
          <Container className="mx-auto p-5 w-[600px] border border-solid border-[#eaeaea] rounded-3xl overflow-hidden shadow-sm">
            {/* Header */}
            <Section className="mt-8 text-center">
              <Link href={BASE_URL}>
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#2563eb] flex items-center justify-center p-2">
                    <Text className="text-white font-bold text-xl m-0 leading-none">N</Text>
                  </div>
                  <Text className="text-2xl font-extrabold text-[#0f172a] m-0 tracking-tight">
                    Haber Nexus
                  </Text>
                </div>
              </Link>
              <Text className="text-[#64748b] text-sm font-medium mt-2">
                Yeni Nesil Haber Platformu — Günlük Özet
              </Text>
              <Text className="text-[#94a3b8] text-xs">
                {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </Text>
            </Section>

            <Hr className="border-[#eaeaea] my-8" />

            {/* Articles List */}
            <Section>
              <Heading className="text-[#0f172a] text-xl font-bold mb-4 px-2">
                📰 Bugün Bilmeniz Gerekenler
              </Heading>
              
              {articles.map((article) => (
                <Section key={article.slug} className="mb-8 p-4 rounded-2xl border border-transparent">
                  {article.coverImage && (
                    <Link href={`${BASE_URL}/article/${article.slug}`}>
                      <Img
                        src={article.coverImage}
                        alt={article.title}
                        width="520"
                        className="rounded-2xl object-cover mb-4 w-full h-[240px]"
                      />
                    </Link>
                  )}
                  <div className="space-y-2">
                    {article.category && (
                      <Text className="text-[#2563eb] text-[10px] font-bold uppercase tracking-wider mb-1">
                        {article.category.name}
                      </Text>
                    )}
                    <Link href={`${BASE_URL}/article/${article.slug}`}>
                      <Heading className="text-[#0f172a] text-lg font-bold m-0 leading-tight">
                        {article.title}
                      </Heading>
                    </Link>
                    <Text className="text-[#475569] text-sm leading-relaxed mt-2">
                      {article.excerpt || article.title}
                    </Text>
                    <Link
                      href={`${BASE_URL}/article/${article.slug}`}
                      className="text-[#2563eb] text-sm font-bold inline-flex items-center gap-1 mt-2"
                    >
                      Devamını Oku →
                    </Link>
                  </div>
                </Section>
              ))}
            </Section>

            <Hr className="border-[#eaeaea] my-8" />

            {/* Footer */}
            <Section className="text-center pb-10">
              <Text className="text-[#94a3b8] text-[11px] leading-relaxed">
                Bu bülten, Haber Nexus aboneliğiniz kapsamında gönderilmiştir.<br />
                Her sabah en önemli gelişmeleri sizinle paylaşıyoruz.
              </Text>
              <div className="mt-4 flex justify-center gap-4">
                <Link href={`${BASE_URL}/about`} className="text-[#64748b] text-[11px] font-medium border-r border-[#eaeaea] pr-4">Hakkımızda</Link>
                <Link href={`${BASE_URL}/advertise`} className="text-[#64748b] text-[11px] font-medium border-r border-[#eaeaea] pr-4">Reklam</Link>
                <Link href={unsubscribeUrl} className="text-[#ef4444] text-[11px] font-bold">Abonelikten Ayrıl</Link>
              </div>
              <Text className="text-[#cbd5e1] text-[10px] mt-6">
                © {new Date().getFullYear()} Haber Nexus. Tüm hakları saklıdır.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
