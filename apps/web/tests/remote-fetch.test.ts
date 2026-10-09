import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPublicHttpUrl, isBlockedIp } from "../lib/server/remote-fetch";

test("özel ve ayrılmış IP adresleri engellenir", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "185.12.13.14", "2a00:1450:4001:80b::200e"]) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test("yerel ve özel adresli bağlantılar reddedilir", async () => {
  for (const url of ["http://127.0.0.1/rss", "http://[::1]/", "http://localhost:3000/", "http://servis.internal/", "http://10.0.0.5/feed", "ftp://example.com/x"]) {
    await assert.rejects(assertPublicHttpUrl(url), undefined, url);
  }
});

test("alan adları IP adresi sanılıp engellenmez (DNS ile denetlenir)", async () => {
  // DNS'e erişilemeyen ortamda alan adı "bulunamadı" hatası verir; "özel ağ" hatası vermemeli
  try {
    const url = await assertPublicHttpUrl("https://www.hurriyet.com.tr/rss/anasayfa");
    assert.equal(url.hostname, "www.hurriyet.com.tr");
  } catch (e) {
    assert.match((e as Error).message, /Alan adı bulunamadı/);
  }
});
