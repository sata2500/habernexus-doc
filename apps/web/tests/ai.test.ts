import assert from "node:assert/strict";
import test from "node:test";
import { isRetiredModel, parseModelRef } from "../lib/ai/models";
import { resolveModelChain } from "../lib/ai/resolve";

function withKeys(keys: { google?: boolean; openrouter?: boolean }, fn: () => void) {
  const prev = { g: process.env.GEMINI_API_KEY, o: process.env.OPENROUTER_API_KEY };
  if (keys.google) process.env.GEMINI_API_KEY = "test"; else delete process.env.GEMINI_API_KEY;
  if (keys.openrouter) process.env.OPENROUTER_API_KEY = "test"; else delete process.env.OPENROUTER_API_KEY;
  try { fn(); } finally {
    if (prev.g === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prev.g;
    if (prev.o === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = prev.o;
  }
}

const fmt = (chain: { provider: string; model: string }[]) => chain.map((r) => `${r.provider}:${r.model}`);

test("parseModelRef understands prefixed and legacy values", () => {
  assert.deepEqual(parseModelRef("google:gemini-3.8-flash"), { provider: "google", model: "gemini-3.8-flash" });
  assert.deepEqual(parseModelRef("openrouter:anthropic/claude-sonnet-5.5"), { provider: "openrouter", model: "anthropic/claude-sonnet-5.5" });
  assert.deepEqual(parseModelRef("google/gemini-2.0-flash-001"), { provider: "openrouter", model: "google/gemini-2.0-flash-001" });
  assert.deepEqual(parseModelRef("gemini-2.5-flash"), { provider: "google", model: "gemini-2.5-flash" });
  assert.equal(parseModelRef(""), null);
});

test("retired model families are detected", () => {
  for (const m of ["google/gemini-2.0-flash-001", "gemini-2.5-flash", "gemini-2.5-flash-image", "imagen-3.0-generate-002", "gemini-1.5-pro"]) {
    assert.ok(isRetiredModel(m), m);
  }
  for (const m of ["gemini-3.8-flash", "google/gemini-3.5-flash-lite", "anthropic/claude-sonnet-5.5"]) {
    assert.ok(!isRetiredModel(m), m);
  }
});

test("yalnızca panelde seçilen model kullanılır: yedek model ya da sağlayıcı yok", () => {
  withKeys({ google: true, openrouter: true }, () => {
    assert.deepEqual(fmt(resolveModelChain("writer", { aiWriterModel: "google:gemini-3.8-flash" })), ["google:gemini-3.8-flash"]);
    assert.deepEqual(fmt(resolveModelChain("analyzer", { aiAnalyzerModel: "openrouter:anthropic/claude-sonnet-5.5" })), ["openrouter:anthropic/claude-sonnet-5.5"]);
    assert.deepEqual(fmt(resolveModelChain("image", { aiWriterImageModel: "openrouter:google/gemini-3.1-flash-image" })), ["openrouter:google/gemini-3.1-flash-image"]);
  });
});

test("eski sürüm model kendiliğinden değiştirilmez", () => {
  withKeys({ google: true, openrouter: true }, () => {
    assert.deepEqual(fmt(resolveModelChain("analyzer", { aiAnalyzerModel: "google/gemini-2.0-flash-001" })), ["openrouter:google/gemini-2.0-flash-001"]);
  });
});

test("seçilen sağlayıcının anahtarı yoksa diğerine geçilmez", () => {
  withKeys({ openrouter: true }, () => {
    assert.deepEqual(fmt(resolveModelChain("writer", { aiWriterModel: "google:gemini-3.8-flash" })), ["google:gemini-3.8-flash"]);
  });
});

test("missing settings pick defaults for the provider that has a key", () => {
  withKeys({ openrouter: true }, () => {
    assert.equal(fmt(resolveModelChain("writer", null))[0], "openrouter:google/gemini-3.8-flash");
  });
  withKeys({ google: true }, () => {
    assert.equal(fmt(resolveModelChain("image", {}))[0], "google:gemini-3.1-flash-image");
  });
});

test("TTS always resolves to Google models", () => {
  withKeys({ google: true, openrouter: true }, () => {
    const chain = resolveModelChain("tts", { aiTtsModel: "openrouter:some/tts" });
    assert.ok(chain.length === 1 && chain[0].provider === "google");
    assert.deepEqual(fmt(resolveModelChain("tts", { aiTtsModel: "google:gemini-3.8-flash-tts" })), ["google:gemini-3.8-flash-tts"]);
  });
});

test("yazım talimatı: panel talimatı en başta ve en yüksek öncelikte; yazar profili ve varsayılanlar sonra", async () => {
  const { buildWriterSystemPrompt, DEFAULT_PUBLICATION_PROMPT } = await import("../lib/news/writing-guide");
  const s = buildWriterSystemPrompt({ publication: "Haberleri 300 kelimeyle yaz.", persona: "Samimi bir dil kullan." });
  const iPub = s.indexOf("Haberleri 300 kelimeyle yaz.");
  const iPersona = s.indexOf("Samimi bir dil kullan.");
  const iDefaults = s.indexOf("VARSAYILAN YAZIM KURALLARI");
  assert.ok(iPub >= 0 && iPersona > iPub && iDefaults > iPersona);
  assert.match(s, /aksini söylemiyorsa uygula/);
  assert.match(s, /ÇIKTI BİÇİMİ/);
  // Panel boşsa varsayılan yayın talimatı; JSON çıktılı işlerde HTML biçim kuralı eklenmez
  const empty = buildWriterSystemPrompt({ publication: "  ", output: "none", withDefaultRules: false });
  assert.ok(empty.includes(DEFAULT_PUBLICATION_PROMPT));
  assert.ok(!empty.includes("ÇIKTI BİÇİMİ") && !empty.includes("VARSAYILAN YAZIM"));
});

test("görsel istemi: panel ve yazar profili talimatları birlikte, sabit stil dayatılmaz", async () => {
  const { buildImagePrompt } = await import("../lib/news/writing-guide");
  const p = buildImagePrompt({ publication: "Sade çizim (illüstrasyon) tarzı.", persona: "Soğuk tonlar.", title: "Deneme" });
  assert.ok(p.includes("Sade çizim (illüstrasyon) tarzı.") && p.includes("Soğuk tonlar.") && p.includes('"Deneme"'));
  assert.ok(!/fotogerçekçi/i.test(p));
});
