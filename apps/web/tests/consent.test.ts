import { test } from "node:test";
import assert from "node:assert/strict";
import { needsConsent, parseConsent, serializeConsent } from "../lib/consent";
import { normalizePlacements, pickWeighted } from "../lib/monetization";
import { RETENTION, retentionCutoffs } from "../lib/server/retention";

test("çerez onayı: kayıt ve çözümleme birbirini tutar", () => {
  const all = { personalization: true, analytics: false, ads: null };
  assert.deepEqual(parseConsent(serializeConsent(all)), all);
  assert.equal(serializeConsent({ personalization: true }), "2.p1a-d-");
});

test("çerez onayı: 1. sürümdeki kişiselleştirme tercihi korunur, yeni gruplar sorulmamış sayılır", () => {
  assert.deepEqual(parseConsent("1.p1"), { personalization: true, analytics: null, ads: null });
  assert.deepEqual(parseConsent("1.p0"), { personalization: false, analytics: null, ads: null });
});

test("çerez onayı: boş ya da bozuk değer seçim yapılmamış sayılır", () => {
  for (const v of [undefined, "", "evet", "3.p1a1d1", "2.p2a1d1", "2.p1a1"]) assert.equal(parseConsent(v), null);
});

test("çerez onayı: yalnızca sitede açık olan ve karar verilmemiş grup için yeniden sorulur", () => {
  const onlyP = { personalization: true, analytics: false, ads: false };
  const v1 = parseConsent("1.p1");
  assert.equal(needsConsent(v1, onlyP), false);
  assert.equal(needsConsent(v1, { ...onlyP, analytics: true }), true);
  assert.equal(needsConsent(null, onlyP), true);
  assert.equal(needsConsent(parseConsent("2.p0a1d-"), { ...onlyP, analytics: true }), false);
});

test("reklam alanları: bozuk ayar güvenli varsayılana döner", () => {
  const p = normalizePlacements({ home_top: { mode: "auto", adsenseSlot: "1234567890" }, article_content: { mode: "x" }, bilinmeyen: { mode: "auto" } });
  assert.deepEqual(p.home_top, { mode: "auto", adsenseSlot: "1234567890" });
  assert.deepEqual(p.article_content, { mode: "off" });
  assert.equal("bilinmeyen" in p, false);
  assert.deepEqual(normalizePlacements(null).home_sidebar, { mode: "off" });
  assert.deepEqual(normalizePlacements({ home_top: { mode: "adsense", adsenseSlot: "<script>" } }).home_top, { mode: "adsense" });
});

test("sponsor seçimi ağırlığa uyar", () => {
  const items = [{ id: "a", weight: 1 }, { id: "b", weight: 3 }];
  assert.equal(pickWeighted(items, 0)?.id, "a");
  assert.equal(pickWeighted(items, 0.24)?.id, "a");
  assert.equal(pickWeighted(items, 0.26)?.id, "b");
  assert.equal(pickWeighted(items, 0.999)?.id, "b");
  assert.equal(pickWeighted([], 0.5), null);
});

test("saklama süreleri: kesim tarihleri doğru gün sayısıyla geriye gider", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const c = retentionCutoffs(now);
  const days = (d: Date) => Math.round((now.getTime() - d.getTime()) / 86_400_000);
  assert.equal(days(c.closedTicketsBefore), RETENTION.closedTicketDays);
  assert.equal(days(c.inactiveSubscribersBefore), RETENTION.inactiveSubscriberDays);
  assert.equal(days(c.unverifiedUsersBefore), RETENTION.unverifiedUserDays);
});

test("görüntülenme: aynı kişi aynı gün aynı özeti üretir, gün ya da kişi değişince özet değişir", async () => {
  const { viewMarkId, isBotUserAgent } = await import("../lib/server/views");
  const day1 = new Date("2026-10-08T09:00:00Z");
  const sameDay = new Date("2026-10-08T20:59:00Z"); // İstanbul'da hâlâ 8 Ekim
  const nextDay = new Date("2026-10-08T21:01:00Z"); // İstanbul'da 9 Ekim
  const a = viewMarkId("art1", "g:1.2.3.4|Mozilla", day1);
  assert.equal(a, viewMarkId("art1", "g:1.2.3.4|Mozilla", sameDay));
  assert.notEqual(a, viewMarkId("art1", "g:1.2.3.4|Mozilla", nextDay));
  assert.notEqual(a, viewMarkId("art1", "g:5.6.7.8|Mozilla", day1));
  assert.notEqual(a, viewMarkId("art2", "g:1.2.3.4|Mozilla", day1));
  assert.ok(!a.includes("1.2.3.4"));
  assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assert.equal(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"), false);
  assert.equal(isBotUserAgent(null), true);
});
