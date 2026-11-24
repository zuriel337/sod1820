import test from "node:test";
import assert from "node:assert/strict";
import { publicMapGroups2029, publicMapLinks2029 } from "../src/lib/publicMap2029.js";

const groups = publicMapGroups2029(true);
const destinations = groups.flatMap(group => group.links);
const hrefs = destinations.map(([href]) => href);

test("the expanded menu and reader map share unique public sections", () => {
  assert.equal(hrefs.length, new Set(hrefs).size);
  assert.equal(new Set(groups.map(group => group.title)).size, groups.length);
  const map = publicMapLinks2029(true).map(([href]) => href);
  assert.ok(!map.includes("/map"));
  for (const href of hrefs.filter(href => href !== "/map")) assert.ok(map.includes(href), href);
  for (const href of ["/map", "/post", "/world", "/findings", "/archive", "/timeline", "/broadcasts", "/gallery", "/reality", "/books", "/cross", "/languages", "/beit-midrash", "/stats"]) assert.ok(hrefs.includes(href), href);
  for (const href of ["/journey", "/heichal?mode=workspace", "/admin", "/early-access", "/unsubscribe"]) assert.ok(!hrefs.includes(href), href);
  assert.ok(map.includes("/unsubscribe"), "the existing signed mail service still has a help entry");
  assert.deepEqual(groups.find(group => group.title === "הרצאות").links, [["/category/הרצאות", "קטלוג ההרצאות"]]);
  for (const oldHref of ["/משיח-בשנת-התשעו", "/משיח-בשנת-התשעו/מתי-שנת-הגאולה", "/הוכחות-לאמיתות-התורה-משמים"]) {
    assert.ok(!hrefs.includes(oldHref), "historical lecture links stay published but outside navigation");
  }
});

test("community distinguishes the live chat from author pages, and tools from their libraries", () => {
  assert.deepEqual(groups.find(group => group.title === "קהילה").links, [
    ["/community/chat", "צ'אט הקהילה"], ["/community/researchers", "כותבי הקהילה"], ["/community/comments", "תגובות לפוסטים"],
  ]);
  for (const [href, label] of [
    ["/gematria", "מחשבון גימטריה מקצועי"], ["/community/calculator", "מחשבון הקהילה לשמות"],
    ["/codes", "ספריית הצפנים"], ["/codes/מחקר", "אוסף המחקר בצפנים"], ["/code", "כלי הצופן התנ״כי"],
  ]) assert.deepEqual(destinations.find(([to]) => to === href), [href, label]);
});
