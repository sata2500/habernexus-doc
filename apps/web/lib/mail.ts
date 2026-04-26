import { Resend } from "resend";
import * as React from "react";

/**
 * Gönderici Bilgileri
 * Not: Resend Free Tier'da sadece onboarding@resend.dev üzerinden gönderim yapılabilir.
 * Eğer domain doğrulanmamışsa, "Haber Nexus <...>" formatı bazen hata verebilir.
 */
const FROM_EMAIL = "onboarding@resend.dev";

interface SendMailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}

/**
 * Merkezi Mail Gönderim Fonksiyonu.
 */
export async function sendEmail({ to, subject, react, from, replyTo }: SendMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Mail] RESEND_API_KEY bulunamadı. Mail gönderimi atlanıyor.");
    return { success: false, error: "API Key missing" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: from || FROM_EMAIL,
      to,
      subject,
      replyTo,
      react,
    });

    if (error) {
      console.error("[Mail] Resend API hatası:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    // Beklenmedik hataları (ağ hatası, geçersiz parametre vb.) detaylıca logla
    console.error("[Mail] Kritik mail gönderim hatası:", {
      message: err?.message,
      stack: err?.stack,
      error: err
    });
    return { 
      success: false, 
      error: err?.message || "E-posta gönderilirken beklenmedik bir sistem hatası oluştu." 
    };
  }
}
