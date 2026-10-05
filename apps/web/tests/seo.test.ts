import assert from "node:assert/strict";
import test from "node:test";
import { firstParagraphText, normalizeMetaDescription, normalizeSeoTitle, normalizeTags, seoSlug } from "../lib/news/seo-text";

test("SEO başlığı tırnak ve sondaki noktadan arınır, kelime ortasında kesilmez", () => {
  assert.equal(normalizeSeoTitle('"Merkez Bankası faizi sabit tuttu."'), "Merkez Bankası faizi sabit tuttu");
  const long = normalizeSeoTitle("Kelime ".repeat(20));
  assert.ok(long.length <= 75 && !long.endsWith(" "));
});

test("meta açıklama 160 karakteri aşmaz ve kısa kalırsa gövdeden tamamlanır", () => {
  const d = normalizeMetaDescription("Kısa spot.", "Merkez Bankası Para Politikası Kurulu bugün toplandı ve politika faizini yüzde 45 seviyesinde sabit bıraktı. Piyasalar karara olumlu tepki verdi. Uzmanlar yorumladı.");
  assert.ok(d.length >= 110 && d.length <= 160, String(d.length));
  assert.ok(normalizeMetaDescription("a ".repeat(200)).length <= 160);
});

test("etiketler tekrarsız ve sınırlı", () => {
  assert.deepEqual(normalizeTags(["#Merkez Bankası", "merkez bankası", "faiz", "x", 5, "Enflasyon."]), ["Merkez Bankası", "faiz", "Enflasyon"]);
});

test("adres Türkçe karakterleri dönüştürür ve 70 karakteri aşmaz", () => {
  assert.equal(seoSlug("Yargıda rüşvet soruşturması: 8 tutuklama"), "yargida-rusvet-sorusturmasi-8-tutuklama");
  const s = seoSlug("Çok uzun bir başlık ".repeat(8));
  assert.ok(s.length <= 70 && !s.endsWith("-"));
});

test("ilk paragraf düz metin olarak alınır", () => {
  assert.equal(firstParagraphText("<h2>X</h2><p>İlk <strong>paragraf</strong> &amp; devam.</p><p>İkinci</p>"), "İlk paragraf & devam.");
});
