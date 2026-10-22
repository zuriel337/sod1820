import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("the public root remains on the legacy home document", () => {
  assert.equal(
    vercel.redirects.some((row) => row.source === "/"),
    false,
    "the root must not redirect to the isolated 2029 document",
  );

  const homeRoute = app.match(/function HomeRoute\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(homeRoute, /stream === "reality" \? <HomeReality \/> : <HomeNewPage \/>/);
  assert.doesNotMatch(homeRoute, /CORE_PUBLIC_LAUNCH_2029/);
});
