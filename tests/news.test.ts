// Home news card. Run: node --test tests/news.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanNews, officialUrl } from "../src/dashboard/news.ts";

test("links: https on the official site only, nothing cmd would read as syntax", () => {
  const ok = "https://aion2.plaync.com/en-us/board/notice/view?articleId=6afab800ebccad0e4b5bacff";
  assert.equal(officialUrl(ok), ok);
  assert.equal(officialUrl("https://cdn.plaync.com/a"), "https://cdn.plaync.com/a");
  assert.equal(officialUrl("http://aion2.plaync.com/a"), null);
  assert.equal(officialUrl("https://evilplaync.com/a"), null);
  assert.equal(officialUrl("https://aion2.plaync.com.evil.io/a"), null);
  assert.equal(officialUrl("https://aion2.plaync.com@evil.io/a"), null);
  assert.equal(officialUrl("https://aion2.plaync.com/a?x=1&calc"), null);
  assert.equal(officialUrl("https://aion2.plaync.com/%USERPROFILE%"), null);
  assert.equal(officialUrl("https://aion2.plaync.com/공지"), null);
  assert.equal(officialUrl("javascript:alert(1)"), null);
  assert.equal(officialUrl(42), null);
});

test("lists: bad entries dropped, at most 5, missing lists empty", () => {
  const good = { title: " Patch Notes | Nov. 11 ", date: "2026-11-11T08:40:57.923Z", url: "https://aion2.plaync.com/en-us/board/update/view?articleId=1" };
  const news = cleanNews({
    notices: [good, { ...good, title: "" }, { ...good, date: "soon" }, { ...good, url: "https://example.com" }, null],
    updates: Array(7).fill(good),
  });
  assert.deepEqual(news.notices, [{ ...good, title: "Patch Notes | Nov. 11" }]);
  assert.equal(news.updates.length, 5);
  assert.deepEqual(cleanNews(null), { notices: [], updates: [] });
  assert.deepEqual(cleanNews({ notices: "x" }), { notices: [], updates: [] });
});
