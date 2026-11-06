import test from "node:test";
import assert from "node:assert/strict";
import { homeAtmospherePreloadHref } from "../src/lib/homeAtmospherePreload2029.js";
import { HOME_ATMOSPHERE_2029 } from "../src/lib/brandAssets2029.js";

const base = { release: true, pathname: "/", storedPreset: null, narrow: true };

test("home atmosphere preload picks the variant the Home CSS will use", () => {
  assert.equal(homeAtmospherePreloadHref(base), HOME_ATMOSPHERE_2029.mobile);
  assert.equal(homeAtmospherePreloadHref({ ...base, narrow: false }), HOME_ATMOSPHERE_2029.desktop);
  for (const pathname of ["/", "/2029", "/2029/"]) assert.ok(homeAtmospherePreloadHref({ ...base, pathname }));
});

test("home atmosphere preload stays off where the atmosphere is not painted", () => {
  assert.equal(homeAtmospherePreloadHref({ ...base, release: false }), null);
  for (const pathname of ["/world", "/2029/posts", "/some-post", "/community/chat", "/2029/control"])
    assert.equal(homeAtmospherePreloadHref({ ...base, pathname }), null, pathname);
  for (const storedPreset of ["light", "parchment"]) assert.equal(homeAtmospherePreloadHref({ ...base, storedPreset }), null, storedPreset);
});

test("an invalid stored preset behaves as the dark default", () => {
  assert.equal(homeAtmospherePreloadHref({ ...base, storedPreset: "garbage" }), HOME_ATMOSPHERE_2029.mobile);
  assert.equal(homeAtmospherePreloadHref({ ...base, storedPreset: "dark" }), HOME_ATMOSPHERE_2029.mobile);
});
