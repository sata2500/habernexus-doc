import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "../lib/server/sanitize-html";
import { checkRateLimit } from "../lib/server/rate-limit";

test("sanitizeHtml removes executable elements, handlers and unsafe URLs", () => {
  const output = sanitizeHtml(
    '<p>Güvenli</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)"><a href="javascript:alert(3)">Kötü bağlantı</a><a href="https://example.com" target="_blank">Güvenli bağlantı</a>',
  );

  assert.match(output, /G(&#xfc;|ü)venli/);
  assert.doesNotMatch(output, /<script|javascript:|onerror=/i);
  assert.match(output, /rel="noopener noreferrer"/);
});

test("sanitizeHtml keeps plain text when an unsupported wrapper is used", () => {
  const output = sanitizeHtml("<div><span>Metin</span></div>");
  assert.equal(output, "Metin");
});

test("checkRateLimit blocks requests after the configured limit", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
  const blocked = checkRateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("TTS text prep strips markup and splits into bounded chunks", async () => {
  const { htmlToSpeechText, splitForTts } = await import("../lib/tts-audio");
  const text = htmlToSpeechText("Başlık", "<p>Birinci cümle. **İkinci** cümle!</p><p>Üçüncü &amp; son</p>");
  assert.doesNotMatch(text, /<|\*\*|&amp;/);
  assert.match(text, /^Başlık\./);
  const long = Array.from({ length: 200 }, (_, i) => `Cümle numarası ${i} burada bitiyor.`).join(" ");
  const chunks = splitForTts(long, 500);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 500));
  assert.equal(chunks.join(" "), long);
});

test("WAV helpers round-trip PCM data", async () => {
  const { extractPcm, pcmToWav } = await import("../lib/tts-audio");
  const pcm = Buffer.from([1, 2, 3, 4, 5, 6]);
  const wav = pcmToWav(pcm);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.deepEqual(extractPcm(wav), pcm);
  assert.deepEqual(extractPcm(pcm), pcm);
});
