import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  endArticleSession,
  getSessionSnapshot,
  minReadSeconds,
  reportListen,
  reportScroll,
  sessionProgress,
  startArticleSession,
} from "../lib/article-session";

// Sekme görünür kabul edilir
(globalThis as { document?: unknown }).document = { visibilityState: "visible" };

function withClock(fn: (tick: (s: number) => void) => void) {
  mock.timers.enable({ apis: ["setInterval"] });
  try {
    fn((s) => mock.timers.tick(s * 1000));
  } finally {
    mock.timers.reset();
  }
}

test("haberi açıp hemen çıkmak okumaya başlamak sayılmaz", () => {
  withClock((tick) => {
    startArticleSession("a1", 3, false);
    reportScroll(35); // kısa haberde açılışta görünen kısım
    tick(20);
    assert.equal(getSessionSnapshot().engaged, false);
    reportScroll(50); // gerçekten kaydırdı
    assert.equal(getSessionSnapshot().engaged, true);
    endArticleSession("a1");
  });
});

test("hızla en alta kaydırmak okundu sayılmaz; yeterli süre geçince sayılır", () => {
  withClock((tick) => {
    startArticleSession("a2", 4, false);
    reportScroll(5);
    tick(3);
    reportScroll(100);
    assert.equal(getSessionSnapshot().completed, false);
    assert.equal(sessionProgress(), 96);
    tick(minReadSeconds(4));
    assert.equal(sessionProgress(), 100);
    const s = getSessionSnapshot();
    assert.equal(s.completed, true);
    assert.equal(s.completedBy, "scroll");
    endArticleSession("a2");
  });
});

test("sesli dinlemeyi sonuna kadar dinlemek okundu sayılır, kaydırmadan bağımsız", () => {
  withClock((tick) => {
    startArticleSession("a3", 5, false);
    reportScroll(10);
    reportListen(40, true, 120);
    tick(10);
    assert.equal(getSessionSnapshot().engaged, true);
    assert.equal(sessionProgress(), 40);
    reportListen(96, false, 5);
    const s = getSessionSnapshot();
    assert.equal(s.completed, true);
    assert.equal(s.completedBy, "listen");
    endArticleSession("a3");
  });
});

test("ilerleme geriye düşmez", () => {
  withClock(() => {
    startArticleSession("a4", 2, false);
    reportScroll(60);
    reportScroll(20);
    reportListen(30, true, 60);
    reportListen(10, true, 80);
    const s = getSessionSnapshot();
    assert.equal(s.scroll, 60);
    assert.equal(s.listen, 30);
    endArticleSession("a4");
  });
});

test("en az okuma süresi makul sınırlar içinde", () => {
  assert.equal(minReadSeconds(1), 18);
  assert.equal(minReadSeconds(0.2), 15);
  assert.equal(minReadSeconds(20), 90);
});
