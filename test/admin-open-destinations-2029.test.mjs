import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminOpenClosedDestinations } from "../src/components/experience2029/adminOpenDestinations2029.js";

test("the public never gets the admin list; an admin gets every closed destination the router opens for admins", () => {
  for (const viewer of [false, null, undefined, "true", 1]) assert.deepEqual(adminOpenClosedDestinations(viewer), []);
  const list = adminOpenClosedDestinations(true);
  const labels = list.map((item) => item.label);
  for (const wanted of ["היכל", "דילוגי אותיות", "בית המדרש"]) assert.ok(labels.includes(wanted), wanted);
  assert.equal(new Set(list.map((item) => item.href)).size, list.length, "no duplicate destinations");
  assert.ok(!list.some((item) => ["/archive", "/start"].includes(item.href)), "routes that stay closed even for admins are not offered");
});

test("the עוד panel renders the admin list only through the helper and closes the panel before navigating", () => {
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(frame, /adminOpenClosedDestinations\(isAdmin\)/);
  assert.match(frame, /data-admin-open-destinations="true"/);
  assert.match(frame, /setTransient\(null\); go\(item\.href\)/);
});
