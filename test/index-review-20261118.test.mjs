// Indexing review 18.11.2026 (ZURIEL): the site map no longer promises Journey; the Journey addresses themselves are unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingContinuation, publicReadingPath } from "../src/lib/publicReadingRelease2029.js";

const services = readFileSync(new URL("../src/pages/PublicServices2029Page.jsx", import.meta.url), "utf8");

test("the site map's 'still under construction' list has no Journey link", () => {
  assert.doesNotMatch(services, /\["\/journey"/);
  assert.doesNotMatch(services, /מסע החיים/);
  for (const href of ["/code", "/heichal", "/raziel", "/forum", "/name", "/credits"]) assert.match(services, new RegExp(`\\["${href}"`), href);
});

test("Journey and the old account addresses keep their current answers (no redirect, no new target)", () => {
  assert.equal(publicReadingContinuation("/journey", "?from=26"), null);
  assert.equal(publicReadingContinuation("/journey", ""), null);
  assert.equal(publicReadingPath("/journey"), "closed");
  assert.equal(publicReadingContinuation("/profile", ""), "/2029/me/profile");
  assert.equal(publicReadingPath("/2029/me/profile"), "account");
  assert.equal(publicReadingPath("/2029/me/notifications"), "account");
});
