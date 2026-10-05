import assert from "node:assert/strict";
import test from "node:test";
import { htmlToSpeechText } from "../lib/tts-audio";

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
