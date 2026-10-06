import * as React from "react";

/** Hesap e-postaları (adres doğrulama, şifre sıfırlama) için sade şablon */
export const AuthEmailTemplate = ({ title, intro, buttonLabel, url, note }: { title: string; intro: string; buttonLabel: string; url: string; note: string }): React.ReactElement => (
  <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', backgroundColor: "#f9fafb", padding: "40px 20px", color: "#1f2937" }}>
    <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "20px", padding: "36px" }}>
      <p style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: 800 }}>
        <span style={{ color: "#dc2626" }}>Haber</span> Nexus
      </p>
      <h1 style={{ fontSize: "22px", margin: "0 0 16px" }}>{title}</h1>
      <p style={{ fontSize: "16px", lineHeight: 1.6 }}>{intro}</p>
      <p style={{ textAlign: "center", margin: "28px 0" }}>
        <a href={url} style={{ backgroundColor: "#dc2626", color: "#ffffff", padding: "14px 28px", borderRadius: "12px", textDecoration: "none", fontWeight: 700, display: "inline-block" }}>
          {buttonLabel}
        </a>
      </p>
      <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>{note}</p>
      <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, wordBreak: "break-all" }}>Düğme çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın: {url}</p>
    </div>
  </div>
);
