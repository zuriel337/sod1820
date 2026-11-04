import test from "node:test";
import assert from "node:assert/strict";
import { redactGroupText } from "../src/lib/research/worldGroupSource.js";

for (const url of [
  "https://sod1820.co.il/world#access_token=synthetic-token",
  "https://sod1820.co.il/number/1820?x=owner%40example.invalid",
  "https://sod1820.co.il/world#owner@example.invalid",
  "https://sod1820.co.il/2029/me/research",
  "https://sod1820.co.il:8443/world",
]) test("public source link admission must not preserve a private destination or embedded contact: " + url.split(/[?#]/)[0], () => {
  const text = redactGroupText("מקור " + url);
  assert.equal(text, "מקור [קישור]");
});

test("ordinary public source links and calendar dates survive without exposing nearby contact details", () => {
  const text = redactGroupText("4.11.2026 https://sod1820.co.il/number/1820?method=regular https://youtu.be/public-video-abc?t=4 owner@example.invalid +972-50-123-4567");
  assert.ok(text.includes("4.11.2026"));
  assert.ok(text.includes("https://sod1820.co.il/number/1820?method=regular"));
  assert.ok(text.includes("https://youtu.be/public-video-abc?t=4"));
  assert.ok(!text.includes("owner@example.invalid")); assert.ok(!text.includes("123-4567"));
});
