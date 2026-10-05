/**
 * Yapay zekâ haber yazımının ortak kalite ve SEO kuralları.
 * Hem Karar Merkezi yazarı hem trend yazarı bu çerçeveyi kullanır.
 */
export const WRITER_RULES = `Yazım kuralları (gazetecilik + arama motoru uyumu):
- Ters piramit: En önemli bilgi en başta. İlk paragraf 40-60 kelimeyle kim, ne, nerede, ne zaman, neden ve nasıl sorularını yanıtlasın; haberin ana konusunu (insanların arayacağı ifadeyi) doğal biçimde içersin.
- Gövdeyi 3-5 açıklayıcı ara başlıkla (h2) bölümlere ayır; gerekiyorsa h3 kullan. Ara başlıklar içeriği özetlesin ve konuyla ilgili arama ifadelerini doğal biçimde içersin ("Detaylar", "Gelişmeler" gibi boş başlıklar kullanma).
- Paragraflar kısa olsun (2-4 cümle). Sayılar, tarihler, yerler ve kurum adları gibi somut bilgileri koru; liste halinde verilebilecek bilgileri ul/li ile ver.
- Bilgiyi kaynağına atfet ("... açıkladı", "... bildirdi"). Kaynaklarda olmayan alıntı, rakam veya iddia uydurma; doğrulanamayan bilgiyi kesinmiş gibi yazma.
- Bağlam ekle: Okur için gerekli arka plan bilgisini ve gelişmenin olası etkisini/sonraki adımı son bölümde kısaca ver. Yorum katma, tarafsız kal.
- Doldurma cümle, tekrar, klişe ("Sonuç olarak", "Unutulmamalıdır ki", "Bu gelişme dikkat çekti") ve tık tuzağı kullanma. Doğru Türkçe yazım ve noktalama kullan.
- 500-900 kelime. Kaynak metni kopyalama; bilgiyi kendi cümlelerinle yaz.`;

export const WRITER_FORMAT = `${WRITER_RULES}
Çıktı biçimi:
- Yalnızca makale gövdesini HTML olarak döndür (h2, h3, p, strong, ul, ol, li, blockquote). h1, markdown, kod bloğu, satır içi stil veya görsel kullanma.
- Haber başlığını gövdede tekrar etme; metin doğrudan giriş paragrafıyla başlasın.`;
