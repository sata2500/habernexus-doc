import assert from "node:assert/strict";
import test from "node:test";
import { htmlToSpeechText, splitForTts } from "../lib/tts-audio";
import { stripLeadingTitleHeading } from "../lib/article-content";

test("başlık gövdede tekrar ediyorsa bir kez okunur", () => {
  assert.equal(htmlToSpeechText("Merhaba Dünya!", "<h1>Merhaba dünya</h1><p>Gövde metni.</p>"), "Merhaba Dünya.\nGövde metni.");
  assert.equal(
    htmlToSpeechText("Dolar güne yükselişle başladı", "<p>Dolar güne yükselişle başladı ve 35 lirayı aştı.</p>"),
    "Dolar güne yükselişle başladı ve 35 lirayı aştı.",
  );
});

test("başlık gövdede yoksa başa eklenir; Markdown başlıkları ayrı cümle olur", () => {
  assert.equal(htmlToSpeechText("Lig", "Lig maçları başladı.\n\n## Puan Durumu\n\nLider 72 puan."), "Lig.\nLig maçları başladı.\nPuan Durumu.\nLider 72 puan.");
});

test("gövdenin başındaki başlık tekrarı (küçük farklarla) atlanır", () => {
  const title = "Yargıda rüşbet soruşturması: 8 tutuklama, hakim ve savcı görevden alındı";
  const html = "<h2>Yargıda Rüşvet Soruşturması: 8 Tutuklama, 5 Hakim ve Savcı Görevden Alındı</h2><p>İstanbul'da geniş çaplı soruşturma.</p><h2>8 Kişi Tutuklandı</h2><p>Detay.</p>";
  assert.equal(stripLeadingTitleHeading(title, html), "<p>İstanbul'da geniş çaplı soruşturma.</p><h2>8 Kişi Tutuklandı</h2><p>Detay.</p>");
  assert.equal(htmlToSpeechText(title, html), `${title}.\nİstanbul'da geniş çaplı soruşturma.\n8 Kişi Tutuklandı.\nDetay.`);
  // Başlıkla ilgisiz ilk ara başlık korunur
  const other = "<h2>Puan Durumu</h2><p>x</p>";
  assert.equal(stripLeadingTitleHeading("Süper Lig'de şampiyonluk yarışı kızışıyor", other), other);
  assert.equal(stripLeadingTitleHeading("Dolar rekor kırdı", "## Dolar Rekor Kırdı\n\nMetin."), "Metin.");
});

test("seslendirme metni karakter kodlarını çözer, uzun cümleyi kaybetmeden böler", () => {
  assert.equal(htmlToSpeechText("Başlık", "<p>Ba&#351;kan &amp; Bakan.</p>"), "Başlık.\nBaşkan & Bakan.");
  const long = Array.from({ length: 50 }, (_, i) => `kelime${i}`).join(" ");
  const chunks = splitForTts(long, 60);
  assert.ok(chunks.every((c) => c.length <= 60));
  assert.equal(chunks.join(" "), long);
});
