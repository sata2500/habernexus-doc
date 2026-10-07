import assert from "node:assert/strict";
import test from "node:test";
import { buildThemeCss, generateSmartPalette, PRESETS, presetToColors, THEME_KEYS } from "../lib/theme";

test("tema CSS'i yalnızca güvenli renkleri kullanır", () => {
  const css = buildThemeCss({ primaryColorLight: "#ff0000", bgLight: "red; } body { display:none", primaryColorDark: "#00ff00" });
  assert.match(css, /--color-primary-500: #ff0000 !important;/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /display:none/);
  assert.equal(buildThemeCss({}), "");
});

test("tek renkten üretilen palet 16 geçerli renk verir", () => {
  const p = generateSmartPalette("#6366f1");
  assert.deepEqual(Object.keys(p).sort(), [...THEME_KEYS].sort());
  for (const v of Object.values(p)) assert.match(v, /^#[0-9A-Fa-f]{6}$/);
  assert.equal(p.primaryColorLight, "#6366f1");
});

test("şablonlar tüm tema alanlarını doldurur", () => {
  for (const preset of PRESETS) assert.equal(Object.values(presetToColors(preset)).filter(Boolean).length, THEME_KEYS.length);
});
