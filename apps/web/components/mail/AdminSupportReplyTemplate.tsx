import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Section,
} from "@react-email/components";
import * as React from "react";

interface AdminSupportReplyTemplateProps {
  content: string;
}

/**
 * Admin'in destek talebine verdiği yanıtı kullanıcıya ileten e-posta şablonu.
 */
export function AdminSupportReplyTemplate({ content }: AdminSupportReplyTemplateProps) {
  return (
    <Html lang="tr" dir="ltr">
      <Head />
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily: "sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
          }}
        >
          {/* Header */}
          <Section style={{ backgroundColor: "#3b82f6", padding: "24px 32px" }}>
            <Heading
              style={{ color: "#ffffff", fontSize: "18px", margin: 0, fontWeight: 700 }}
            >
              Haber Nexus Destek
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Heading
              style={{ color: "#111827", fontSize: "20px", marginTop: 0, marginBottom: "12px" }}
            >
              Merhaba,
            </Heading>

            <Text
              style={{
                fontSize: "15px",
                color: "#374151",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                margin: "0 0 24px",
              }}
            >
              {content}
            </Text>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 20px" }} />

            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Bu mail <strong>Haber Nexus Destek Merkezi</strong> üzerinden gönderilmiştir.
              Lütfen bu maili yanıtlayarak iletişime devam edin.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
