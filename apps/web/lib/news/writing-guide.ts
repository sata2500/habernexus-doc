/**
 * Yapay zekâ haber yazımında modele giden talimatların tek kaynağı.
 *
 * Öncelik sırası (modele de açıkça söylenir):
 *   1. Yayın talimatları — admin panelinde (Ayarlar → Yapay Zekâ) yazılan talimat
 *   2. Yazar profili talimatları — haberi yazan yapay zekâ yazar profilinin talimatı
 *   3. Varsayılan yazım kuralları — yalnızca yukarıdakiler aksini söylemiyorsa
 * Çıktı biçimi (HTML/JSON) teknik zorunluluktur: site haberi bu biçimde gösterebilir; her zaman geçerlidir.
 */

/** Varsayılan yazım kuralları (gazetecilik + arama motoru uyumu). Yayın talimatları bunları geçersiz kılabilir. */
export const DEFAULT_WRITING_RULES = `- Ters piramit: En önemli bilgi en başta. İlk paragraf 40-60 kelimeyle kim, ne, nerede, ne zaman, neden ve nasıl sorularını yanıtlasın; haberin ana konusunu (insanların arayacağı ifadeyi) doğal biçimde içersin.
- Gövdeyi 3-5 açıklayıcı ara başlıkla (h2) bölümlere ayır; gerekiyorsa h3 kullan. Ara başlıklar içeriği özetlesin ve konuyla ilgili arama ifadelerini doğal biçimde içersin ("Detaylar", "Gelişmeler" gibi boş başlıklar kullanma).
- Paragraflar kısa olsun (2-4 cümle). Sayılar, tarihler, yerler ve kurum adları gibi somut bilgileri koru; liste halinde verilebilecek bilgileri ul/li ile ver.
- Bilgiyi kaynağına atfet ("... açıkladı", "... bildirdi"). Kaynaklarda olmayan alıntı, rakam veya iddia uydurma; doğrulanamayan bilgiyi kesinmiş gibi yazma.
- Bağlam ekle: Okur için gerekli arka plan bilgisini ve gelişmenin olası etkisini/sonraki adımı son bölümde kısaca ver. Yorum katma, tarafsız kal.
- Doldurma cümle, tekrar, klişe ("Sonuç olarak", "Unutulmamalıdır ki", "Bu gelişme dikkat çekti") ve tık tuzağı kullanma. Doğru Türkçe yazım ve noktalama kullan.
- 500-900 kelime. Kaynak metni kopyalama; bilgiyi kendi cümlelerinle yaz.`;

/** Site ayarı boşsa kullanılan yayın talimatı */
export const DEFAULT_PUBLICATION_PROMPT = "Sen profesyonel bir haber editörüsün. Doğru, tarafsız ve özgün haberler yazarsın.";

const HTML_OUTPUT = `ÇIKTI BİÇİMİ (teknik zorunluluk, her zaman geçerli):
- Yalnızca makale gövdesini HTML olarak döndür (h2, h3, p, strong, ul, ol, li, blockquote). h1, markdown, kod bloğu, satır içi stil veya görsel kullanma.
- Haber başlığını gövdede tekrar etme; metin doğrudan giriş paragrafıyla başlasın.`;

export interface WriterInstructions {
  /** Admin panelindeki yayın talimatı (SystemSettings.aiWriterPrompt) */
  publication: string | null | undefined;
  /** Yazar profili talimatı (AiPersona.prompt) */
  persona?: string | null;
  /**
   * html: makale gövdesi HTML olarak istenir (biçim kuralları eklenir)
   * none: çıktı biçimini istemin kendisi tanımlar (ör. JSON)
   */
  output?: "html" | "none";
  /** Varsayılan yazım kuralları eklensin mi (paragraf düzeltme gibi dar işlerde gereksiz) */
  withDefaultRules?: boolean;
}

/** Yazım isteklerinin sistem talimatı: yayın talimatı > yazar profili > varsayılan kurallar */
export function buildWriterSystemPrompt({ publication, persona, output = "html", withDefaultRules = true }: WriterInstructions) {
  const parts = [`YAYIN TALİMATLARI (en yüksek öncelik; her zaman uygula):\n${publication?.trim() || DEFAULT_PUBLICATION_PROMPT}`];
  if (persona?.trim()) {
    parts.push(`YAZAR PROFİLİ TALİMATLARI (yayın talimatlarıyla çelişmedikçe uygula):\n${persona.trim()}`);
  }
  if (withDefaultRules) {
    parts.push(`VARSAYILAN YAZIM KURALLARI (yalnızca yukarıdaki talimatlar aksini söylemiyorsa uygula; uzunluk, yapı, üslup veya biçim konusunda yukarıda farklı bir şey istenmişse onu uygula):\n${DEFAULT_WRITING_RULES}`);
  }
  if (output === "html") parts.push(HTML_OUTPUT);
  parts.push("ÖNCELİK SIRASI: 1) Yayın talimatları 2) Yazar profili talimatları 3) Varsayılan yazım kuralları. Çıktı biçimi kuralları her zaman geçerlidir.");
  return parts.join("\n\n");
}

/** Kapak görseli istemi: admin panelindeki görsel talimatı + yazar profilinin görsel talimatı + haber */
export function buildImagePrompt({ publication, persona, title }: { publication: string | null | undefined; persona?: string | null; title: string }) {
  return [
    publication?.trim() || "Habere uygun, profesyonel bir kapak görseli.",
    persona?.trim() ? `Yazar profili görsel talimatı (yukarıdakiyle birlikte uygula):\n${persona.trim()}` : null,
    `Haber başlığı: "${title}"`,
    "Teknik: 16:9 yatay görsel. Talimatlarda aksi istenmedikçe görselde yazı, logo veya filigran olmasın.",
  ].filter(Boolean).join("\n\n");
}
