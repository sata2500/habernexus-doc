import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Link,
  Hr,
  Section,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface AdminNotificationTemplateProps {
  ticketId: string;
  subject: string;
  userEmail: string;
  messageText: string;
  appUrl: string;
}

/**
 * Admin'e gönderilen "Yeni Destek Mesajı" e-posta şablonu.
 * Bu bileşen try-catch dışında tanımlandığından lint hatası oluşmaz.
 */
export function AdminNotificationTemplate({
  ticketId,
  subject,
  userEmail,
  messageText,
  appUrl,
}: AdminNotificationTemplateProps) {
  return (
    <Html lang="tr" dir="ltr">
      <Head />
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }}>
          {/* Header */}
          <Section style={{ backgroundColor: "#3b82f6", padding: "24px 32px" }}>
            <Heading style={{ color: "#ffffff", fontSize: "20px", margin: 0, fontWeight: 700 }}>
              📬 Yeni Destek Mesajı
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Row>
              <Column>
                <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px" }}>Gönderen</Text>
                <Text style={{ fontSize: "16px", color: "#111827", margin: "0 0 20px", fontWeight: 600 }}>
                  {userEmail}
                </Text>

                <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px" }}>Konu</Text>
                <Text style={{ fontSize: "16px", color: "#111827", margin: "0 0 24px", fontWeight: 600 }}>
                  {subject || "(Konusuz)"}
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 24px" }} />

            <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>Mesaj İçeriği</Text>
            <Text
              style={{
                fontSize: "15px",
                color: "#374151",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                backgroundColor: "#f9fafb",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                margin: "0 0 32px",
              }}
            >
              {messageText || "(İçerik yok)"}
            </Text>

            <Link
              href={`${appUrl}/admin/support/${ticketId}`}
              style={{
                display: "inline-block",
                padding: "14px 28px",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "15px",
              }}
            >
              Panelden Yanıtla →
            </Link>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: "#f9fafb", padding: "16px 32px", borderTop: "1px solid #e5e7eb" }}>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Bu mail Haber Nexus Destek Sistemi tarafından otomatik olarak gönderilmiştir.
              Bilet ID: #{ticketId}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
