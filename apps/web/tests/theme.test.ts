import assert from "node:assert/strict";
import test from "node:test";
import { buildThemeCss, ensureContrastOnWhite, generateSmartPalette, PRESETS, presetToColors, THEME_KEYS } from "../lib/theme";

test("tema CSS'i yalnızca güvenli renkleri kullanır", () => {
  const css = buildThemeCss({ primaryColorLight: "#ff0000", bgLight: "red; } body { display:none", primaryColorDark: "#00ff00" });
  // Saf kırmızı beyazda 4,5:1'e ulaşmaz: açık temada biraz koyulaştırılır, süslemelerde özgün renk kalır
  assert.match(css, new RegExp(`--color-primary-500: ${ensureContrastOnWhite("#ff0000")} !important;`));
  assert.match(css, /--ring: #ff0000 !important;/);
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

test("açık temada ana renk beyaza karşı en az 4,5:1 kontrasta getirilir", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (hex: string) => 1.05 / (lum(hex) + 0.05);
  const fixed = ensureContrastOnWhite("#6366f1");
  assert.ok(ratio(fixed) >= 4.5, `${fixed} ${ratio(fixed)}`);
  assert.ok(ratio("#6366f1") < 4.5);
  // Zaten yeterli renk değişmez; hex olmayan değere dokunulmaz
  assert.equal(ensureContrastOnWhite("#1d4ed8"), "#1d4ed8");
  assert.equal(ensureContrastOnWhite("rgb(1 2 3)"), "rgb(1 2 3)");
  const css = buildThemeCss({ ...presetToColors(PRESETS[0]), primaryColorLight: "#6366f1" } as never);
  assert.match(css, new RegExp(`--color-primary-500: ${fixed}`));
});
