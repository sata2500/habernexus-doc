import { Resend } from "resend";
import * as React from "react";

/**
 * Gönderici Bilgileri
 */
const FROM_EMAIL = process.env.NEXT_PUBLIC_APP_NAME
  ? `${process.env.NEXT_PUBLIC_APP_NAME} <onboarding@resend.dev>`
  : "Haber Nexus <onboarding@resend.dev>";

interface SendMailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}

/**
 * Merkezi Mail Gönderim Fonksiyonu.
 * Resend istemcisi tek seferinde oluşturulur (module-level singleton).
 */
export async function sendEmail({ to, subject, react, from, replyTo }: SendMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY bulunamadı. Mail gönderimi atlanıyor.");
    return { success: false, error: "API Key missing" };
  }

  // Singleton pattern — her çağrıda yeni istemci oluşturulmuyor.
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
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Mail send exception:", err);
    return { success: false, error: "Unexpected error" };
  }
}
