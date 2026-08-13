export interface SocialPostPayload {
  title: string;
  excerpt?: string | null;
  slug: string;
  coverImage?: string | null;
}

/**
 * Yeni yayınlanan bir makaleyi otomatik olarak Telegram kanalına gönderir.
 * Gerekli ENV: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (örn: @habernexus)
 */
export async function publishToTelegram(payload: SocialPostPayload): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      console.log("[Social Publisher] Telegram bot token veya kanal ID yapılandırılmamış, atlanıyor.");
      return false;
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";
    const articleUrl = `${siteUrl}/article/${payload.slug}`;
    const text = `🚨 *${escapeMarkdownV2(payload.title)}*\n\n${escapeMarkdownV2(payload.excerpt || "")}\n\n👉 [Haberi Oku](${articleUrl})`;

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      }),
    });

    if (res.ok) {
      console.log(`[Social Publisher] Telegram paylaşımı başarılı: ${payload.title}`);
      return true;
    } else {
      const errData = await res.json();
      console.error("[Social Publisher] Telegram API hatası:", errData);
      return false;
    }
  } catch (error) {
    console.error("[Social Publisher] Telegram paylaşım hatası:", error);
    return false;
  }
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
}
