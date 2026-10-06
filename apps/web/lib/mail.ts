import { Resend } from "resend";
import * as React from "react";

/**
 * Gönderici Bilgileri
 * Not: Bu adresten gönderim yapabilmek için Resend üzerinden domain doğrulaması gereklidir.
 */
const FROM_EMAIL = "Haber Nexus <brief@habernexus.com>";

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
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    // Beklenmedik hataları (ağ hatası, geçersiz parametre vb.) detaylıca logla
    console.error("[Mail] Kritik mail gönderim hatası:", {
      message: errorObj.message,
      stack: errorObj.stack,
      error: err
    });
    return { 
      success: false, 
      error: errorObj.message || "E-posta gönderilirken beklenmedik bir sistem hatası oluştu." 
    };
  }
}

export interface BatchMail {
  to: string;
  subject: string;
  react: React.ReactElement;
  headers?: Record<string, string>;
}

const BATCH_SIZE = 100; // Resend toplu gönderim sınırı
const BATCH_DELAY_MS = 600; // Resend hız sınırı (saniyede ~2 istek) aşılmasın

/**
 * Çok sayıda e-postayı Resend toplu gönderimiyle (100'erli) ve hız sınırına uyarak gönderir.
 * Önceden tüm e-postalar aynı anda gönderiliyordu; abone sayısı arttıkça çoğu 429 hatasıyla düşüyordu.
 */
export async function sendEmailBatch(mails: BatchMail[]) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Mail] RESEND_API_KEY bulunamadı. Toplu gönderim atlanıyor.");
    return { sent: 0, failed: mails.length };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < mails.length; i += BATCH_SIZE) {
    const chunk = mails.slice(i, i + BATCH_SIZE);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await resend.batch.send(chunk.map((m) => ({ from: FROM_EMAIL, to: m.to, subject: m.subject, react: m.react, headers: m.headers })));
        if (!error) { sent += chunk.length; break; }
        // Hız sınırında bekleyip aynı partiyi tekrar dene
        if (/rate|429|too many/i.test(error.message) && attempt < 2) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
        console.error("[Mail] Toplu gönderim hatası:", error.message);
        failed += chunk.length;
        break;
      } catch (err) {
        console.error("[Mail] Toplu gönderim kritik hata:", err instanceof Error ? err.message : err);
        if (attempt === 2) failed += chunk.length;
      }
    }
    if (i + BATCH_SIZE < mails.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
  return { sent, failed };
}
