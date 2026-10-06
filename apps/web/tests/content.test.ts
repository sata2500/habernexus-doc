import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "../lib/server/sanitize-html";
import { readingMinutes } from "../lib/utils";

test("içerik süzgeci editör biçimlerini korur", () => {
  const out = sanitizeHtml("<p>Önce</p><hr><p><s>eski</s> <del>silinen</del> x<sup>2</sup></p>");
  assert.match(out, /<hr>/);
  assert.match(out, /<s>eski<\/s>/);
  assert.match(out, /<del>silinen<\/del>/);
  assert.match(out, /<sup>2<\/sup>/);
});

test("içerik süzgeci tehlikeli içeriği ve kimlik niteliğini temizler", () => {
  const out = sanitizeHtml('<p id="article-body" onclick="x()">a</p><script>alert(1)</script><img src="javascript:alert(1)"><a href="javascript:x">b</a>');
  assert.doesNotMatch(out, /id=|onclick|script|javascript/);
  assert.match(out, /<p>a<\/p>/);
});

test("dış bağlantı yeni sekmede açılıyorsa rel eklenir", () => {
  assert.match(sanitizeHtml('<a href="https://ornek.com" target="_blank">x</a>'), /rel="noopener noreferrer"/);
});

test("okuma süresi HTML ve Markdown işaretlerini kelime saymaz", () => {
  const words = Array.from({ length: 400 }, () => "kelime").join(" ");
  assert.equal(readingMinutes(`<p class="uzun bir sinif listesi">${words}</p>`), 2);
  assert.equal(readingMinutes(`## Başlık\n\n${words}`), 2);
  assert.equal(readingMinutes(""), 1);
  assert.equal(readingMinutes(null), 1);
});
