import { test } from "node:test";
import assert from "node:assert/strict";
import { createCounter } from "./server.mjs";

const T = Date.parse("2026-11-27T12:30:00Z");

test("counts every visit the page reports", () => {
  const c = createCounter({ since: "2026-11-27T00:00:00Z" });
  assert.equal(c.hit(T), true);
  assert.equal(c.hit(T + 1000), true);
  assert.equal(c.data.total, 2);
});

test("stops counting past 120 a minute, and starts again the next minute", () => {
  const c = createCounter({ since: "2026-11-27T00:00:00Z" });
  const start = Date.parse("2026-11-27T12:30:00Z");
  for (let k = 0; k < 120; k++) assert.equal(c.hit(start + k), true);
  assert.equal(c.hit(start + 200), false);
  assert.equal(c.hit(start + 60e3), true);
  assert.equal(c.data.total, 121);
});

test("shows 56 hours, empty before counting started", () => {
  const c = createCounter({ since: "2026-11-27T10:00:00Z" });
  c.hit(T);
  c.hit(T - 3600e3);
  const v = c.view(T);
  assert.equal(v.hours.length, 56);
  assert.deepEqual(v.hours.slice(-3), [0, 1, 1]);
  assert.equal(v.hours.at(-4), null);
  assert.equal(v.total, 2);
});

test("forgets hours older than 90 days", () => {
  const c = createCounter({ since: "2026-01-01T00:00:00Z", hours: { "2026-01-01T00": 4 } });
  c.prune(T);
  assert.equal(c.data.hours["2026-01-01T00"], undefined);
});
