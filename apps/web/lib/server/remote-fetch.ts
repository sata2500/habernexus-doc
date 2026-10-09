import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isBlockedIpv4(value: string) {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;

  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

export function isBlockedIp(value: string) {
  if (isIP(value) === 4) return isBlockedIpv4(value);
  if (isIP(value) !== 6) return true;

  const normalized = value.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isBlockedIpv4(mappedIpv4) : false;
}

export async function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Yalnızca http ve https adresleri kullanılabilir.");
  }

  // IPv6 adresleri URL'de köşeli parantezle yazılır ([::1])
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Yerel ağ adreslerine erişilemez.");
  }

  // Doğrudan IP adresi yazılmışsa kontrol edilir; alan adları aşağıda DNS çözümlemesiyle denetlenir.
  // (Önceden alan adları da "IP değil" diye engelleniyordu: tüm RSS kaynakları bu yüzden çalışmıyordu.)
  if (isIP(hostname) !== 0 && isBlockedIp(hostname)) {
    throw new Error("Özel ağ adresine erişilemez.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => {
    throw new Error("Alan adı bulunamadı.");
  });
  if (addresses.length === 0 || addresses.some((address) => isBlockedIp(address.address))) {
    throw new Error("Adres özel ya da herkese açık olmayan bir ağa çıkıyor.");
  }

  return url;
}

export async function fetchPublicResource(rawUrl: string, options: { maxBytes: number; timeoutMs?: number } ) {
  const url = await assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "image/*,application/octet-stream;q=0.8,*/*;q=0.1" },
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error("Adres başka bir yere yönlendiriyor.");
    }
    if (!response.ok || !response.body) {
      throw new Error(`Sunucu yanıt vermedi (HTTP ${response.status}).`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > options.maxBytes) {
      throw new Error("Dosya izin verilen boyuttan büyük.");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel();
        throw new Error("Dosya izin verilen boyuttan büyük.");
      }
      chunks.push(value);
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gövdeyi doğru karakter kümesiyle çözer: önce Content-Type, sonra XML/HTML başlığındaki bildirim.
 * (Bazı Türkçe siteler hâlâ windows-1254 / iso-8859-9 kullanıyor.)
 */
function decodeBody(bytes: Buffer, contentType: string) {
  const head = bytes.subarray(0, 2048).toString("latin1");
  const charset = (
    contentType.match(/charset=["']?([\w-]+)/i)?.[1]
    ?? head.match(/<\?xml[^>]*encoding=["']([\w-]+)["']/i)?.[1]
    ?? head.match(/<meta[^>]*charset=["']?([\w-]+)/i)?.[1]
    ?? "utf-8"
  ).toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return bytes.toString("utf8");
  }
}

/**
 * Herkese açık bir web sayfasını (HTML) indirir. Yönlendirmeleri en fazla 4 adım izler ve
 * her adımda hedefin özel ağ adresi olmadığını yeniden doğrular (SSRF koruması).
 * Dönen `url`, yönlendirmeler sonrası gerçek sayfa adresidir.
 */
export async function fetchPublicPage(rawUrl: string, options: { maxBytes?: number; timeoutMs?: number; accept?: string } = {}) {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  let current = rawUrl;
  for (let hop = 0; hop < 5; hop++) {
    const url = await assertPublicHttpUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: options.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "User-Agent": "Mozilla/5.0 (compatible; HaberNexusBot/1.0; +https://habernexus.com)",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Yönlendirme adresi eksik.");
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok || !response.body) throw new Error(`Sunucu yanıt vermedi (HTTP ${response.status}).`);
      const type = response.headers.get("content-type") ?? "";
      if (type && !/html|xml|text\/plain/i.test(type)) throw new Error("Adres bir web sayfası ya da akış değil.");

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) { await reader.cancel(); break; } // büyük sayfanın başı yeterli
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return { url: url.toString(), html: decodeBody(bytes, type) };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Çok fazla yönlendirme.");
}
