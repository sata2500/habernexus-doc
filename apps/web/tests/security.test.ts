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

// ── Yetki ayrımı: admin/yazar sunucu işlemleri rol kontrolü olmadan dışa açılamaz ──
import { readdirSync as _readdir, readFileSync as _read, statSync as _stat } from "node:fs";
import { join as _join } from "node:path";

const PUBLIC_ACTIONS = new Set([
  "app/actions/newsletter.ts:unsubscribeByToken",
  // Oturum yerine HMAC imzalı bağlantıyla korunur (verifyUserSignature)
  "app/actions/newsletter.ts:unsubscribeSignedUser",
  "app/actions/slider.ts:getSlider",
  "app/actions/static-pages.ts:getStaticPageBySlug",
  "app/author/actions.ts:incrementViewCount",
]);

function walk(dir: string): string[] {
  return _readdir(dir).flatMap((name) => {
    const p = _join(dir, name);
    return _stat(p).isDirectory() ? walk(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

test("privileged server actions always check the caller's role", () => {
  const root = _join(__dirname, "..");
  const roleCheck = /requireRole\(|assertAdmin\(|checkAdmin\(|requireAuthor\(|assertAuthorOrAdmin\(/;
  const missing: string[] = [];
  for (const dir of ["app/admin", "app/author", "app/actions"]) {
    for (const file of walk(_join(root, dir))) {
      const src = _read(file, "utf8");
      if (!/^"use server";/m.test(src)) continue;
      const rel = file.slice(root.length + 1);
      const fns = [...src.matchAll(/export async function (\w+)\s*\(/g)];
      fns.forEach((m, i) => {
        const body = src.slice(m.index! + m[0].length, fns[i + 1]?.index ?? src.length).slice(0, 2500);
        if (!roleCheck.test(body) && !PUBLIC_ACTIONS.has(`${rel}:${m[1]}`)) missing.push(`${rel}:${m[1]}`);
      });
    }
  }
  assert.deepEqual(missing, [], `Rol kontrolü olmayan işlemler: ${missing.join(", ")}`);
});
