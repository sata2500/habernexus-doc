import assert from "node:assert/strict";
import test from "node:test";
import {
  containsKeyword, contentBlocks, originalityScore, overallScore, readabilityScore, seoChecks, seoScore, textOverlap, textStats,
} from "../lib/analysis/metrics";

const para = (n: number, s = "Merkez Bankası politika faizini yüzde 45 seviyesinde sabit bıraktı.") => Array.from({ length: n }, () => s).join(" ");
const good = `<p>Merkez Bankası faiz kararını açıkladı. ${para(3)}</p><h2>Merkez Bankası faiz kararının ayrıntıları</h2><p>${para(4)}</p><h2>Piyasalar karara nasıl tepki verdi</h2><p>${para(4)} <a href="/article/onceki">Önceki haber</a></p>`;

test("HTML ve Markdown gövdeden bloklar çıkarılır", () => {
  assert.deepEqual(contentBlocks("<h2>Başlık</h2><p>Bir <b>iki</b></p>").map((b) => b.tag), ["h2", "p"]);
  assert.deepEqual(contentBlocks("Giriş.\n\n## Ara\n\n- madde").map((b) => b.tag), ["p", "h2", "li"]);
});

test("istatistikler: kelime, başlık, bağlantı ve Ateşman indeksi", () => {
  const s = textStats(good);
  assert.equal(s.h2, 2);
  assert.equal(s.internalLinks, 1);
  assert.ok(s.words > 80 && s.sentences > 10);
  assert.ok(s.atesman > 0 && s.atesman <= 100);
  assert.ok(readabilityScore(s) > 0);
});

test("odak ifade ek farklarına rağmen bulunur", () => {
  assert.ok(containsKeyword("Merkez Bankası'nın faiz kararı açıklandı", "merkez bankası faiz"));
  assert.ok(!containsKeyword("Borsa güne yükselişle başladı", "merkez bankası faiz"));
});

test("SEO kontrolleri eksikleri yakalar ve puan tutarlıdır", () => {
  const base = { title: "Merkez Bankası faiz kararını açıkladı: politika faizi yüzde 45", content: good, excerpt: "x".repeat(130), coverImage: "/a.jpg", tags: ["Merkez Bankası", "Faiz", "Enflasyon"], focusKeyword: "merkez bankası faiz", slug: "merkez-bankasi-faiz" };
  const full = seoChecks(base);
  const weak = seoChecks({ ...base, excerpt: "", coverImage: null, tags: [], content: "<p>Kısa.</p>" });
  assert.equal(full.find((c) => c.id === "keyword-title")?.status, "pass");
  assert.equal(weak.find((c) => c.id === "cover-image")?.status, "fail");
  assert.ok(seoScore(full) > seoScore(weak));
  assert.equal(seoScore(full), seoScore(seoChecks(base))); // aynı girdi → aynı puan
});

test("özgünlük: aynen alınan metin oranı ölçülür", () => {
  const source = "Merkez Bankası politika faizini yüzde 45 seviyesinde sabit bıraktı ve piyasalar karara olumlu tepki verdi";
  const copy = textOverlap(source + " ek cümle burada yer alıyor", [{ title: "Kaynak", url: "https://ornek.com", text: source, kind: "source" }]);
  const own = textOverlap("Para Politikası Kurulu bugünkü toplantısında oranlarda değişikliğe gitmedi, analistler kararı bekliyordu", [{ title: "Kaynak", url: null, text: source, kind: "source" }]);
  assert.ok(copy.rate > 60 && copy.matches.length === 1);
  assert.equal(own.rate, 0);
  assert.ok(originalityScore(copy.rate, 0) < originalityScore(own.rate, 0));
  assert.equal(overallScore({ quality: null, seo: 90, readability: 90, originality: 90 }), 90);
});

test("kopya cümleler kaynağıyla birlikte bulunur; özgün cümleler işaretlenmez", async () => {
  const { copiedPassages, distinctiveSentences } = await import("../lib/analysis/metrics");
  const src = "Merkez Bankası politika faizini yüzde 45 seviyesinde sabit bıraktı ve piyasalar karara olumlu tepki verdi.";
  const html = `<p>${src} Kurul toplantısından sonra yapılan açıklamada enflasyon görünümüne vurgu yapıldı ve yeni adımlar ele alındı.</p>`;
  const found = copiedPassages(html, [{ title: "Kaynak A", url: "https://a.com/x", text: src, kind: "source" }]);
  assert.equal(found.length, 1);
  assert.equal(found[0].source, "Kaynak A");
  assert.ok(found[0].text.startsWith("Merkez Bankası"));
  assert.equal(copiedPassages(html, [{ title: "Site", url: "/article/x", text: src, kind: "site" }]).length, 0);
  assert.ok(distinctiveSentences(html, 2).length >= 1);
});
