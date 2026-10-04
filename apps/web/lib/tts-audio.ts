/** Seslendirme için saf yardımcılar (metin hazırlama, parçalama, WAV birleştirme). */

export const SAMPLE_RATE = 24_000;
const CHUNK_CHARS = 3_500; // ~8K token giriş sınırının güvenle altında

export function htmlToSpeechText(title: string, html: string) {
  const body = html
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, ".\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[*#_`>]+/g, " ") // Markdown kalıntıları seslendirilmesin
    .replace(/\.\s*\./g, ".")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
  return `${title.trim()}.\n${body}`;
}

/** Metni paragraf/cümle sınırlarından, sınırı aşmayan parçalara böler. */
export function splitForTts(text: string, maxChars = CHUNK_CHARS): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const piece = sentence.length > maxChars ? sentence.slice(0, maxChars) : sentence;
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
