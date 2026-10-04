import assert from "node:assert/strict";
import test from "node:test";
import { crossProviderRef, isRetiredModel, parseModelRef } from "../lib/ai/models";
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

test("cross-provider mapping for Gemini models", () => {
  assert.deepEqual(crossProviderRef({ provider: "google", model: "gemini-3.8-flash" }), { provider: "openrouter", model: "google/gemini-3.8-flash" });
  assert.deepEqual(crossProviderRef({ provider: "openrouter", model: "google/gemini-3.8-flash" }), { provider: "google", model: "gemini-3.8-flash" });
  assert.equal(crossProviderRef({ provider: "openrouter", model: "openai/gpt-5.6-sol" }), null);
});

test("legacy retired settings are upgraded and fall back to the other provider", () => {
  withKeys({ google: true, openrouter: true }, () => {
    const chain = fmt(resolveModelChain("analyzer", { aiAnalyzerModel: "google/gemini-2.0-flash-001" }));
    assert.equal(chain[0], "openrouter:google/gemini-3.5-flash-lite");
    assert.ok(chain.includes("google:gemini-3.5-flash-lite"));
  });
});

test("chosen model is primary; same Gemini model via the other provider is the first backup", () => {
  withKeys({ google: true, openrouter: true }, () => {
    const chain = fmt(resolveModelChain("writer", { aiWriterModel: "google:gemini-3.8-flash" }));
    assert.deepEqual(chain.slice(0, 2), ["google:gemini-3.8-flash", "openrouter:google/gemini-3.8-flash"]);
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
    assert.ok(chain.length > 0 && chain.every((r) => r.provider === "google"));
  });
});
