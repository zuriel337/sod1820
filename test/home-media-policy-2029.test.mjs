import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_MEDIA_SLOTS_2029, homeMediaProps2029 } from "../src/components/experience2029/homeMediaPolicy2029.js";

const SOURCE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/posts/5018.jpg";

test("Home Media Policy creates responsive small delivery copies without changing the original", () => {
  const media = homeMediaProps2029(SOURCE, "compact");
  assert.match(media.src, /\/storage\/v1\/render\/image\/public\/media\/sod1820\/posts\/5018\.jpg\?width=96&quality=58&resize=contain$/);
  assert.equal(media.sizes, "64px");
  assert.match(media.srcSet, /width=96&quality=58&resize=contain 96w, .*width=160&quality=58&resize=contain 160w$/);
  assert.equal(SOURCE.includes("/object/public/"), true, "the original URL remains the source input");
});

test("every defined Home slot has a bounded responsive pair", () => {
  for (const [name, policy] of Object.entries(HOME_MEDIA_SLOTS_2029)) {
    assert.equal(policy.widths.length, 2, name);
    assert.ok(policy.widths[0] < policy.widths[1], name);
    const media = homeMediaProps2029(SOURCE, name);
    assert.match(media.srcSet, new RegExp(` ${policy.widths[0]}w, .* ${policy.widths[1]}w$`), name);
  }
});

test("external and already transformed sources stay untouched", () => {
  const external = "https://i.ytimg.com/vi/example/hqdefault.jpg";
  assert.deepEqual(homeMediaProps2029(external, "tile"), { src: external, srcSet: null, sizes: null });
  const rendered = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/render/image/public/media/sod1820/posts/5018.jpg?width=480";
  assert.deepEqual(homeMediaProps2029(rendered, "tile"), { src: rendered, srcSet: null, sizes: null });
});

test("the Home uses the policy for compact cards, series cards and video tiles", () => {
  const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
  assert.match(home, /import \{ homeMediaProps2029 \} from "\.\/homeMediaPolicy2029\.js";/);
  assert.match(home, /function Media\([^]*?homeMediaProps2029\(src, slot\)[^]*?data-home-media=\{slot\}/);
  assert.match(home, /<Media src=\{item\.imageUrl\} fallback="✦" slot="series" \/>/);
  assert.match(home, /className="h29-rm-thumb" slot="compact"/);
  assert.match(home, /className="h29-live-thumb" slot="compact"/);
  assert.match(home, /className="h29-recent-thumb" slot="compact"/);
  assert.match(home, /fallback="▶" slot="tile" \/>/);
});
