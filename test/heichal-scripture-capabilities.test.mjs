import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const heichal = readFileSync(
  new URL("../src/pages/Heichal2029Page.jsx", import.meta.url),
  "utf8",
);

test("Heichal projects Scripture discovery from the existing Research/Entity Hub seam", () => {
  assert.match(heichal, /data\?\.research\?\.scriptureDiscovery/);
  assert.match(heichal, /data\?\.research\?\.scriptureTermDiscovery/);
  assert.match(heichal, /Discovery ≠ Truth/);
  assert.match(heichal, /fetchTanachVerseByOrdinal/);
});

test("Heichal does not call Tanakh research RPCs directly", () => {
  assert.doesNotMatch(heichal, /supabase\.rpc\(["']fn_(?:notarikon|name_in_tanach|name_in_verse|tanach_together|tanach_proximity|verses_by_gematria)/);
  assert.match(heichal, /fetchEntityHubProjection/);
  assert.match(heichal, /to="\/verse-gematria"/);
  assert.doesNotMatch(heichal, /tool=verse/);
});

test("technical ordinal projection requires explicit user intent and stays bounded", () => {
  assert.match(heichal, /TANACH_ORDINAL_SCOPE\.TORAH/);
  assert.match(heichal, /canProbeTorahOrdinal/);
  assert.match(heichal, /ordinalValue <= 5846/);
  assert.match(heichal, /onClick=\{runOrdinalDiscovery\}/);
  assert.match(heichal, /requestIntent: "explicit_user_action"/);
  assert.match(heichal, /A bare number is NOT ordinal intent/);
  assert.match(heichal, /סדר קורפוס התורה הנוכחי/);
});
