import * as React from "react";

interface SupportReceiptTemplateProps {
  ticketId: string;
  subject: string;
}

export const SupportReceiptTemplate: React.FC<SupportReceiptTemplateProps> = ({
  ticketId,
  subject,
}) => (
  <div style={{
    fontFamily: '"Outfit", "Roboto", "Helvetica Neue", sans-serif',
    backgroundColor: "#f9fafb",
    padding: "40px 20px",
    color: "#1f2937"
  }}>
    <div style={{
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: "#ffffff",
      borderRadius: "24px",
      padding: "40px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
    }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ color: "#3b82f6", fontSize: "24px", margin: "0" }}>Mesajınız Alındı!</h1>
      </div>
      
      <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "24px" }}>
        Merhaba,
      </p>
      
      <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "24px" }}>
        Haber Nexus Destek ekibine ulaştığınız için teşekkür ederiz. <b>&quot;{subject}&quot;</b> konulu talebiniz başarıyla kaydedildi.
      </p>

      <div style={{
        backgroundColor: "#eff6ff",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid #dbeafe"
      }}>
        <p style={{ margin: "0", fontSize: "14px", color: "#1e40af" }}>
          <b>Talep Numarası:</b> #{ticketId}<br />
          <b>Durum:</b> İnceleniyor
        </p>
      </div>

      <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "24px" }}>
        Ekibimiz talebinizi en kısa sürede (genellikle 24 saat içinde) inceleyip size bu e-posta adresi üzerinden yanıt verecektir.
      </p>

      <div style={{
        borderTop: "1px solid #f3f4f6",
        paddingTop: "24px",
        marginTop: "32px",
        textAlign: "center"
      }}>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0" }}>
          Haber Nexus · Profesyonel Haber Deneyimi
        </p>
      </div>
    </div>
  </div>
);
