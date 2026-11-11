import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminOpenClosedDestinations } from "../src/components/experience2029/adminOpenDestinations2029.js";
import { publicReadingPath } from "../src/lib/publicReadingRelease2029.js";

test("the public never gets the admin list; an admin gets every closed destination the router opens for admins", () => {
  for (const viewer of [false, null, undefined, "true", 1]) assert.deepEqual(adminOpenClosedDestinations(viewer), []);
  const list = adminOpenClosedDestinations(true);
  const labels = list.map((item) => item.label);
  // Still closed to the public and opened for the administrator: the Heichal.
  for (const wanted of ["היכל"]) assert.ok(labels.includes(wanted), wanted);
  // ZURIEL opened the Bible code (Classic) and the Beit Midrash to everyone (5.11.2026): they are not "still closed", so the administrator list must not offer them.
  for (const opened of ["דילוגי אותיות", "בית המדרש"]) assert.ok(!labels.includes(opened), `${opened} is open to the public and is not offered as a closed destination`);
  // Everything offered is closed for the public and admin-view for the administrator, by the same router the pages use (no private list).
  for (const item of list) {
    assert.equal(publicReadingPath(item.href.split("#")[0], { isAdmin: false }), "closed", `${item.label} is closed for the public`);
    assert.equal(publicReadingPath(item.href.split("#")[0], { isAdmin: true }), "admin-view", `${item.label} is open for the administrator`);
  }
  assert.equal(new Set(list.map((item) => item.href)).size, list.length, "no duplicate destinations");
  assert.ok(!list.some((item) => ["/archive", "/start"].includes(item.href)), "routes that stay closed even for admins are not offered");
});

test("the עוד panel renders the admin list only through the helper and closes the panel before navigating", () => {
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(frame, /adminOpenClosedDestinations\(isAdmin\)/);
  const panel = readFileSync(new URL("../src/components/experience2029/MorePanel2029.jsx", import.meta.url), "utf8");
  assert.match(panel, /data-admin-open-destinations="true"/, "the More panel body (MorePanel2029) renders the list it is given");
  assert.match(frame, /adminDestinations=\{adminOpenClosedDestinations\(isAdmin\)\}/, "and the frame gives it only the helper's list");
  assert.match(frame, /setTransient\(null\); go\(item\.href\)/);
});
