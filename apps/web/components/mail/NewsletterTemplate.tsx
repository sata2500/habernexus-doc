import {
  Body, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text,
} from "@react-email/components";
import * as React from "react";
import type { NewsletterArticle } from "@/lib/newsletter-content";

/**
 * Günlük bülten e-postası. E-posta istemcileri modern CSS'i desteklemediği için satır içi stil
 * kullanılır; genişlik esnektir (telefonda tam genişlik, masaüstünde en fazla 600px).
 */

interface NewsletterTemplateProps {
  articles: NewsletterArticle[];
  unsubscribeUrl: string;
  /** Kayıtlı kullanıcılar için gönderim saatini değiştirme sayfası (misafirlerde yok) */
  settingsUrl?: string | null;
  dateLabel: string;
  link: (path: string) => string;
  /** Test gönderimi notu */
  isTest?: boolean;
}

const RED = "#dc2626";
const INK = "#111827";
const MUTED = "#4b5563";
const SOFT = "#9ca3af";
const LINE = "#e5e7eb";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const meta = (a: NewsletterArticle) => [a.category?.name, `${a.readingMinutes} dk okuma`].filter(Boolean).join(" · ");

export const NewsletterTemplate = ({ articles, unsubscribeUrl, settingsUrl, dateLabel, link, isTest }: NewsletterTemplateProps): React.ReactElement => {
  const [main, ...others] = articles;
  const preview = articles.slice(0, 3).map((a) => a.title).join(" · ");

  return (
    <Html lang="tr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", margin: 0, padding: "24px 0", fontFamily: FONT }}>
        <Container style={{ width: "100%", maxWidth: "600px", backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden", border: `1px solid ${LINE}` }}>
          {/* Başlık */}
          <Section style={{ padding: "24px 28px 16px", borderBottom: `3px solid ${RED}` }}>
            <Row>
              <Column>
                <Link href={link("/")} style={{ textDecoration: "none" }}>
                  <Text style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", color: INK }}>
                    <span style={{ color: RED }}>Haber</span> Nexus
                  </Text>
                </Link>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", color: RED, textTransform: "uppercase" }}>Günün özeti</Text>
                <Text style={{ margin: "2px 0 0", fontSize: "12px", color: MUTED }}>{dateLabel}</Text>
              </Column>
            </Row>
          </Section>

          {isTest && (
            <Section style={{ padding: "10px 28px", backgroundColor: "#fef3c7" }}>
              <Text style={{ margin: 0, fontSize: "12px", color: "#92400e" }}>Bu bir deneme gönderimidir; gerçek bültende son 24 saatin öne çıkan haberleri yer alır.</Text>
            </Section>
          )}

          {/* Manşet */}
          {main && (
            <Section style={{ padding: "24px 28px 8px" }}>
              {main.coverImage && (
                <Link href={link(`/article/${main.slug}`)}>
                  <Img src={main.coverImage} alt={main.title} width="544" style={{ width: "100%", maxWidth: "544px", height: "auto", borderRadius: "12px", display: "block" }} />
                </Link>
              )}
              <Text style={{ margin: "16px 0 6px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: RED, textTransform: "uppercase" }}>{meta(main)}</Text>
              <Link href={link(`/article/${main.slug}`)} style={{ textDecoration: "none" }}>
                <Heading as="h1" style={{ margin: "0 0 10px", fontSize: "24px", lineHeight: "1.25", fontWeight: 800, color: INK }}>{main.title}</Heading>
              </Link>
              {main.excerpt && <Text style={{ margin: "0 0 16px", fontSize: "16px", lineHeight: "1.6", color: MUTED }}>{main.excerpt}</Text>}
              <Link href={link(`/article/${main.slug}`)} style={{ display: "inline-block", backgroundColor: RED, color: "#ffffff", padding: "12px 22px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
                Haberi oku →
              </Link>
            </Section>
          )}

          {/* Diğer haberler */}
          {others.length > 0 && (
            <Section style={{ padding: "16px 28px 8px" }}>
              <Hr style={{ borderColor: LINE, margin: "8px 0 16px" }} />
              <Text style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 800, letterSpacing: "1px", color: INK, textTransform: "uppercase" }}>Gündemin diğer başlıkları</Text>
              {others.map((a) => (
                <Section key={a.slug} style={{ padding: "12px 0", borderBottom: `1px solid ${LINE}` }}>
                  <Row>
                    <Column style={{ verticalAlign: "top", paddingRight: a.coverImage ? "14px" : 0 }}>
                      <Text style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: "0.5px" }}>{meta(a)}</Text>
                      <Link href={link(`/article/${a.slug}`)} style={{ textDecoration: "none" }}>
                        <Text style={{ margin: 0, fontSize: "16px", lineHeight: "1.35", fontWeight: 700, color: INK }}>{a.title}</Text>
                      </Link>
                    </Column>
                    {a.coverImage && (
                      <Column style={{ width: "96px", verticalAlign: "top" }}>
                        <Link href={link(`/article/${a.slug}`)}>
                          <Img src={a.coverImage} alt="" width="96" height="64" style={{ width: "96px", height: "64px", objectFit: "cover", borderRadius: "8px", display: "block" }} />
                        </Link>
                      </Column>
                    )}
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Section style={{ padding: "20px 28px 28px", textAlign: "center" }}>
            <Link href={link("/latest")} style={{ display: "inline-block", border: `1px solid ${LINE}`, color: INK, padding: "11px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
              Tüm son dakika haberleri
            </Link>
          </Section>

          {/* Alt bilgi */}
          <Section style={{ backgroundColor: "#f9fafb", padding: "22px 28px", borderTop: `1px solid ${LINE}`, textAlign: "center" }}>
            <Text style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: "1.6", color: MUTED }}>
              Bu e-postayı Haber Nexus günlük bültenine abone olduğunuz için aldınız.
            </Text>
            <Text style={{ margin: "0 0 12px", fontSize: "12px", color: MUTED }}>
              {settingsUrl && (
                <>
                  <Link href={settingsUrl} style={{ color: MUTED, textDecoration: "underline" }}>Gönderim saatini değiştir</Link>
                  {"  ·  "}
                </>
              )}
              <Link href={unsubscribeUrl} style={{ color: MUTED, textDecoration: "underline" }}>Abonelikten çık</Link>
            </Text>
            <Text style={{ margin: 0, fontSize: "11px", color: SOFT }}>© {new Date().getFullYear()} Haber Nexus · İstanbul, Türkiye</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
