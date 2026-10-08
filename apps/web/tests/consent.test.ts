import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConsent, serializeConsent, CONSENT_VERSION } from "../lib/consent";
import { RETENTION, retentionCutoffs } from "../lib/server/retention";

test("çerez onayı: kayıt ve çözümleme birbirini tutar", () => {
  assert.deepEqual(parseConsent(serializeConsent(true)), { personalization: true });
  assert.deepEqual(parseConsent(serializeConsent(false)), { personalization: false });
});

test("çerez onayı: boş, bozuk ya da eski sürüm seçim yapılmamış sayılır", () => {
  assert.equal(parseConsent(undefined), null);
  assert.equal(parseConsent(""), null);
  assert.equal(parseConsent("evet"), null);
  assert.equal(parseConsent(`${Number(CONSENT_VERSION) + 1}.p1`), null);
  assert.equal(parseConsent(`${CONSENT_VERSION}.p2`), null);
});

test("saklama süreleri: kesim tarihleri doğru gün sayısıyla geriye gider", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const c = retentionCutoffs(now);
  const days = (d: Date) => Math.round((now.getTime() - d.getTime()) / 86_400_000);
  assert.equal(days(c.closedTicketsBefore), RETENTION.closedTicketDays);
  assert.equal(days(c.inactiveSubscribersBefore), RETENTION.inactiveSubscriberDays);
  assert.equal(days(c.unverifiedUsersBefore), RETENTION.unverifiedUserDays);
});
