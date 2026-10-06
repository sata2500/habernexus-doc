import * as React from "react";

/** Bülten çift onay e-postası */
export const NewsletterConfirmTemplate = ({ confirmUrl }: { confirmUrl: string }): React.ReactElement => (
  <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', backgroundColor: "#f9fafb", padding: "40px 20px", color: "#1f2937" }}>
    <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "20px", padding: "36px" }}>
      <h1 style={{ color: "#dc2626", fontSize: "22px", margin: "0 0 20px" }}>Bülten aboneliğinizi onaylayın</h1>
      <p style={{ fontSize: "16px", lineHeight: 1.6 }}>
        Haber Nexus günlük bültenine abone olmak için bu adres kullanıldı. Aboneliği başlatmak için aşağıdaki düğmeye tıklayın.
      </p>
      <p style={{ textAlign: "center", margin: "28px 0" }}>
        <a href={confirmUrl} style={{ backgroundColor: "#dc2626", color: "#ffffff", padding: "14px 28px", borderRadius: "12px", textDecoration: "none", fontWeight: 700, display: "inline-block" }}>
          Aboneliği onayla
        </a>
      </p>
      <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>
        Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; onaylamadığınız sürece size bülten gönderilmez.
      </p>
    </div>
  </div>
);
