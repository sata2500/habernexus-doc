import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
}

/**
 * Merkezi Mail Gönderim Fonksiyonu
 */
export async function sendEmail({ to, subject, react }: SendMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY bulunamadı. Mail gönderimi atlanıyor.");
    return { success: false, error: "API Key missing" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Mail send exception:", error);
    return { success: false, error: "Unexpected error" };
  }
}
