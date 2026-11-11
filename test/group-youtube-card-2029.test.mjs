// A public group source's YouTube link (ZURIEL 11.11.2026): the group reader lets only a canonical YouTube address through, the client keeps it,
// and Now and the World show the ONE shared click-to-load card for it, while the row keeps its "מקור · טרם נבדק" framing.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupRowToWorldUpdate, redactGroupText } from "../src/lib/research/worldGroupSource.js";
import { externalVideoLinksFromText } from "../src/lib/community/messageLinks.js";

const row = body => ({ id: "60435726-d28f-42cb-87ab-ce5a00994419", body, created_at: "2026-10-20T02:24:01Z", contributor_slug: "shimon-haimov", contributor_name: "שמעון חיימוב", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "torat-haremez" });

test("a canonical YouTube address from a public group reaches one card; other addresses, phones and e-mail stay hidden", () => {
  const item = groupRowToWorldUpdate(row("https://youtu.be/-N099Nn6Yjo"));
  assert.equal(item.fullText, "https://youtu.be/-N099Nn6Yjo");
  const links = externalVideoLinksFromText(item.fullText);
  assert.equal(links.length, 1); assert.equal(links[0].kind, "youtube"); assert.equal(links[0].watch, "https://www.youtube.com/watch?v=-N099Nn6Yjo");
  assert.equal(redactGroupText("https://example.org/x 050-123-4567 a@b.co"), "[קישור] [מספר] [דוא״ל]");
  assert.equal(externalVideoLinksFromText(redactGroupText("https://evil.test/youtube.com/watch?v=-N099Nn6Yjo")).length, 0);
});

test("Now and the World render the shared card for a group source too, labelled as an unchecked source", () => {
  const now = readFileSync(new URL("../src/components/experience2029/NowPublications2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(now, /!model\.unverified \? externalVideoLinksFromText/, "the group guard is gone");
  assert.match(now, /externalVideoLinksFromText\(model\.fullText \|\| model\.title\)\.map\(link =>\s*<ExternalVideoFacade2029[^>]*context=\{model\.unverified \? `מקור · טרם נבדק/);
  const world = readFileSync(new URL("../src/components/research/WorldPublicUpdates2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(world, /!groupSourceAnchor\(item\) \? externalVideoLinksFromText/);
  assert.match(world, /context=\{groupSourceAnchor\(item\) \? `מקור · טרם נבדק/);
});
