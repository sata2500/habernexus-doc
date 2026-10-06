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

function isBlockedIp(value: string) {
  if (isIP(value) === 4) return isBlockedIpv4(value);
  if (isIP(value) !== 6) return true;

  const normalized = value.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isBlockedIpv4(mappedIpv4) : false;
}

async function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP(S) resources are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Private host is not allowed.");
  }

  if (isBlockedIp(hostname)) {
    throw new Error("Private IP address is not allowed.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((address) => isBlockedIp(address.address))) {
    throw new Error("URL resolves to a private or non-public address.");
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
      throw new Error("Redirected resources are not allowed.");
    }
    if (!response.ok || !response.body) {
      throw new Error(`Remote resource request failed with status ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > options.maxBytes) {
      throw new Error("Remote resource exceeds the maximum allowed size.");
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
        throw new Error("Remote resource exceeds the maximum allowed size.");
      }
      chunks.push(value);
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Herkese açık bir web sayfasını (HTML) indirir. Yönlendirmeleri en fazla 4 adım izler ve
 * her adımda hedefin özel ağ adresi olmadığını yeniden doğrular (SSRF koruması).
 * Dönen `url`, yönlendirmeler sonrası gerçek sayfa adresidir.
 */
export async function fetchPublicPage(rawUrl: string, options: { maxBytes?: number; timeoutMs?: number } = {}) {
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
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "User-Agent": "Mozilla/5.0 (compatible; HaberNexusBot/1.0; +https://habernexus.com)",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect without location.");
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok || !response.body) throw new Error(`Page request failed with status ${response.status}.`);
      const type = response.headers.get("content-type") ?? "";
      if (type && !/html|xml|text\/plain/i.test(type)) throw new Error("Not an HTML page.");

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
      return { url: url.toString(), html: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8") };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many redirects.");
}
