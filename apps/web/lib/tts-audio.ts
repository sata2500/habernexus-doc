/** Seslendirme için saf yardımcılar (metin hazırlama, parçalama, WAV birleştirme). */

import { stripLeadingTitleHeading } from "./article-content";
import { decodeEntities } from "./news/text";

export const SAMPLE_RATE = 24_000;
const CHUNK_CHARS = 3_500; // ~8K token giriş sınırının güvenle altında

/** Karşılaştırma için sadeleştirir: küçük harf, yalnızca harf ve rakamlar */
function normalizeForCompare(value: string) {
  return value.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Başlık + gövdeyi seslendirilecek düz metne çevirir. Gövde zaten başlıkla
 * başlıyorsa (ör. içerikte H1 olarak tekrar edilmişse) başlık ikinci kez okunmaz.
 */
export function htmlToSpeechText(title: string, html: string) {
  const markup = stripLeadingTitleHeading(title, html)
    .replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm, "$1.") // Markdown başlıkları ayrı cümle olsun
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, ".\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*#_`>]+(?![\da-fx]+;)/gi, " "); // Markdown kalıntıları seslendirilmesin (&#351; gibi kodlar hariç)
  let body = decodeEntities(markup)
    .replace(/\.\s*\./g, ".")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
  const cleanTitle = title.trim();
  const normTitle = normalizeForCompare(cleanTitle);
  if (!normTitle) return body;
  // Gövdenin ilk satırı başlığın kendisiyse at; başlığı içeren uzun bir paragrafla başlıyorsa başlığı ekleme
  const [firstLine = "", ...rest] = body.split("\n");
  const normFirst = normalizeForCompare(firstLine);
  if (normFirst === normTitle) body = rest.join("\n").trim();
  else if (normTitle.split(" ").length >= 4 && normFirst.startsWith(`${normTitle} `)) return body;
  return `${cleanTitle.replace(/[.!?…:]*$/, "")}.\n${body}`;
}

/** Metni paragraf/cümle sınırlarından, sınırı aşmayan parçalara böler. */
export function splitForTts(text: string, maxChars = CHUNK_CHARS): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  // Sınırdan uzun tek cümle kelime sınırlarından bölünür (kesilip kaybolmaz)
  const pieces = sentences.flatMap((s) => {
    if (s.length <= maxChars) return [s];
    const out: string[] = [];
    let part = "";
    for (const word of s.split(" ")) {
      if (part && part.length + word.length + 1 > maxChars) { out.push(part); part = ""; }
      part = part ? `${part} ${word}` : word.slice(0, maxChars);
    }
    if (part) out.push(part);
    return out;
  });
  for (const piece of pieces) {
    if (current && current.length + piece.length + 1 > maxChars) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** WAV (RIFF) içinden ham PCM verisini çıkarır; ham L16 gelirse olduğu gibi döner. */
export function extractPcm(buf: Buffer): Buffer {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return buf;
  }
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return buf.subarray(offset + 8, Math.min(buf.length, offset + 8 + size));
    offset += 8 + size + (size % 2);
  }
  return Buffer.alloc(0);
}

export function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM fmt chunk boyutu
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate (16-bit mono)
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
