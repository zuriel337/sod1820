import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isApproved2029OnlyPost } from "../src/lib/research/post2029Publication.js";

const approved = {
  id: 5113,
  slug: "bennett-melach-631-78",
  space: "core",
  modified: "2026-10-12T14:06:54.127591+00:00",
  tags: ["טיוטה", "2029-golden-only", "2029-golden"],
};

test("only the expressly approved 2029 post is admitted, preserving the source draft", () => {
  assert.equal(isApproved2029OnlyPost(approved), true);
  assert.ok(approved.tags.includes("טיוטה"));
  for (const change of [
    { id: 5101 }, { slug: "other" }, { space: "private" }, { modified: "2026-10-13T00:00:00Z" },
    { tags: ["טיוטה", "2029-golden"] },
    { tags: ["טיוטה", "2029-golden-only", "פורום"] },
    { _privateStage: true }, { _previewSnapshot: true },
  ]) assert.equal(isApproved2029OnlyPost({ ...approved, ...change }), false);
});

test("2029-only admission leaves legacy and shared public feeds' draft guards intact", () => {
  const legacy = readFileSync(new URL("../src/legacy/legacy.jsx", import.meta.url), "utf8");
  const shared = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(legacy, /includes\("טיוטה"\) && !isAdmin/);
  assert.match(shared, /not\('tags', 'cs', '\{טיוטה\}'\)/);
  assert.match(page, /noindex:.*projection\.public2029Only/);
});
