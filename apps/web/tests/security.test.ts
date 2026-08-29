import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "../lib/server/sanitize-html";
import { checkRateLimit } from "../lib/server/rate-limit";

test("sanitizeHtml removes executable elements, handlers and unsafe URLs", () => {
  const output = sanitizeHtml(
    '<p>Güvenli</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)"><a href="javascript:alert(3)">Kötü bağlantı</a><a href="https://example.com" target="_blank">Güvenli bağlantı</a>',
  );

  assert.match(output, /G(&#xfc;|ü)venli/);
  assert.doesNotMatch(output, /<script|javascript:|onerror=/i);
  assert.match(output, /rel="noopener noreferrer"/);
});

test("sanitizeHtml keeps plain text when an unsupported wrapper is used", () => {
  const output = sanitizeHtml("<div><span>Metin</span></div>");
  assert.equal(output, "Metin");
});

test("checkRateLimit blocks requests after the configured limit", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
  const blocked = checkRateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});
