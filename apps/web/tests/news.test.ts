import assert from "node:assert/strict";
import test from "node:test";
import { keyTokens, normalize, buildIdf, SAME_STORY, LIKELY_DUPLICATE, POSSIBLE_DUPLICATE, timeHints, signature, storySimilarity } from "../lib/news/text";
import { computeScore, deriveExpiry } from "../lib/news/score";

const sim = (a: string, b: string) => storySimilarity(signature(a), signature(b));

test("normalize strips Turkish characters and apostrophe suffixes", () => {
  assert.equal(normalize("Fenerbahçe'yi İSTANBUL’da yendi!"), "fenerbahce istanbul yendi");
  assert.deepEqual(keyTokens("Son dakika: Galatasaray derbisinde"), ["galat", "derb"]);
  assert.deepEqual(keyTokens("faiz faizi faizini"), ["faiz"]);
});

test("same event from different sources is grouped", () => {
  const pairs: [string, string][] = [
    ["Merkez Bankası faizi yüzde 45'te sabit tuttu", "Merkez Bankası politika faizini sabit bıraktı: yüzde 45"],
    ["İstanbul'da 4.2 büyüklüğünde deprem", "Son dakika: İstanbul'da 4.2 büyüklüğünde deprem meydana geldi"],
    ["Apple yeni iPhone 18 modelini tanıttı", "iPhone 18 tanıtıldı: Apple'ın yeni modeli"],
    ["Akaryakıta zam geldi: benzinin litresi 52 lira", "Benzine zam: litre fiyatı 52 liraya yükseldi"],
  ];
  for (const [a, b] of pairs) assert.ok(sim(a, b) >= SAME_STORY, `${a} ~ ${b}: ${sim(a, b).toFixed(2)}`);
});

test("different events are not grouped", () => {
  const pairs: [string, string][] = [
    ["Galatasaray, Fenerbahçe derbisinde 2-1 kazandı", "Beşiktaş Trabzonspor'u deplasmanda yendi"],
    ["Merkez Bankası faizi yüzde 45'te sabit tuttu", "Avrupa Merkez Bankası enflasyon tahminini yükseltti"],
    ["İstanbul'da 4.2 büyüklüğünde deprem", "İzmir'de trafik kazası: 3 yaralı"],
    ["Galatasaray yeni transferini açıkladı", "Fenerbahçe teknik direktörüyle yollarını ayırdı"],
    ["Galatasaray'da Icardi sakatlandı", "Galatasaray'da Osimhen sakatlandı"],
    ["Merkez Bankası faiz kararını açıkladı", "Merkez Bankası rezervleri geriledi"],
  ];
  for (const [a, b] of pairs) assert.ok(sim(a, b) < SAME_STORY, `${a} !~ ${b}: ${sim(a, b).toFixed(2)}`);
});

test("reworded headlines of the same event are at least sent to the AI as candidates", () => {
  const a = "Galatasaray, Fenerbahçe derbisinde 2-1 kazandı";
  const b = "Fenerbahçe'yi 2-1 yenen Galatasaray liderliğe yükseldi";
  assert.ok(sim(a, b) >= POSSIBLE_DUPLICATE);
});

test("TV-guide template headlines about different matches are not grouped", () => {
  const a = "HOLLANDA - SIRBİSTAN MAÇI NE ZAMAN? Hollanda Sırbistan Maçı Hangi Kanalda, Saat Kaçta, Nereden İzlenir?";
  const b = "GALLER DANİMARKA MAÇI HANGİ KANALDA? Galler Danimarka maçı saat kaçta, nereden izlenir?";
  const window = [a, b, "Fenerbahçe maçı hangi kanalda?", "Okulun çatısında çıkan yangın kontrol altına alındı", "Fon soruşturmasında tutuklu sayısı 85'e yükseldi"].map(keyTokens);
  const idf = buildIdf(window);
  assert.ok(storySimilarity(signature(a), signature(b), idf) < SAME_STORY);
  assert.ok(sim(a, b) < SAME_STORY);
});

test("reworded reports of the same event stay grouped with rarity weighting", () => {
  const a = "Fon soruşturmasında son durum! Tutuklanan şüpheli sayısı 85'e ulaştı";
  const b = "Fon soruşturmasında tutuklu sayısı 85'e yükseldi";
  const window = [a, b, "Bursa'da ormanlık alanda vahşet", "Okulun çatısında yangın", "Galler Danimarka maçı"].map(keyTokens);
  assert.ok(storySimilarity(signature(a), signature(b), buildIdf(window)) >= SAME_STORY);
});

test("rare words weigh more than words everyone uses", () => {
  const docs = [
    "Galatasaray derbi öncesi son çalışmasını yaptı",
    "Galatasaray'da sakatlık şoku",
    "Galatasaray transfer için görüşüyor",
    "Fenerbahçe derbi kadrosu belli oldu",
  ].map(keyTokens);
  const idf = buildIdf(docs);
  assert.ok(idf("galat") < idf("sakat"));
});

test("an existing article with the same headline is a likely duplicate", () => {
  assert.ok(sim("Merkez Bankası faizi yüzde 45'te sabit tuttu", "Merkez Bankası faizi sabit tuttu") >= LIKELY_DUPLICATE);
});

test("time hints detect breaking and upcoming events", () => {
  assert.deepEqual(timeHints("SON DAKİKA: Ankara'da patlama"), { breaking: true, upcoming: false });
  assert.equal(timeHints("Galatasaray-Fenerbahçe derbisi yarın saat 20.00'de").upcoming, true);
});

const H = 3_600_000;

test("score rewards importance, coverage and freshness", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const base = { aiScore: 80, sourceCount: 1, trendScore: 0, startAt: new Date(now.getTime() - H), urgency: "NORMAL" as const, eventAt: null, expiresAt: null };
  const one = computeScore(base, now);
  const many = computeScore({ ...base, sourceCount: 4 }, now);
  const old = computeScore({ ...base, startAt: new Date(now.getTime() - 30 * H) }, now);
  const trending = computeScore({ ...base, trendScore: 100 }, now);
  assert.ok(many.total > one.total);
  assert.ok(old.total < one.total);
  assert.ok(trending.total > one.total);
  assert.ok(one.total >= 60 && one.total <= 100, String(one.total));
});

test("expired stories score zero", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const r = computeScore({ aiScore: 95, sourceCount: 5, trendScore: 100, startAt: new Date(now.getTime() - 50 * H), urgency: "NORMAL", eventAt: null, expiresAt: null }, now);
  assert.equal(r.expired, true);
  assert.equal(r.total, 0);
});

test("a match preview expires when the match starts and gets an urgency boost before it", () => {
  const seen = new Date("2026-10-10T08:00:00Z");
  const kickoff = new Date("2026-10-11T17:00:00Z");
  const expiry = deriveExpiry(seen, "TIME_SENSITIVE", kickoff, 12);
  assert.equal(expiry.toISOString(), kickoff.toISOString());

  const before = computeScore({ aiScore: 70, sourceCount: 2, trendScore: 0, startAt: seen, urgency: "TIME_SENSITIVE", eventAt: kickoff, expiresAt: expiry }, new Date("2026-10-10T20:00:00Z"));
  assert.equal(before.parts.urgency, 10);
  const after = computeScore({ aiScore: 70, sourceCount: 2, trendScore: 0, startAt: seen, urgency: "TIME_SENSITIVE", eventAt: kickoff, expiresAt: expiry }, new Date("2026-10-11T18:00:00Z"));
  assert.equal(after.expired, true);
});
