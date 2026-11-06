// DEF-012 regression: the public build must not send a write that its own request worker always denies (403 + console error on every post view).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const supabase = fs.readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const transport = fs.readFileSync(new URL("../public-reading-deploy/transport.js", import.meta.url), "utf8");

test("logView returns before the page_views insert when the public-reading build is running", () => {
  const body = supabase.slice(supabase.indexOf("export async function logView"), supabase.indexOf("// 🔎 ספירת חיפושים כוללת"));
  const guard = body.indexOf("if (PUBLIC_READING_RELEASE) return;");
  const sink = body.indexOf('from("page_views")');
  assert.ok(guard > 0 && sink > guard, "the public-build guard must precede the insert");
});

test("the guard stays correct: the request worker still has no page_views write on its allow-list", () => {
  assert.doesNotMatch(transport, /rest\/v1\/page_views/);
  assert.match(transport, /public_reading_operation_denied/);
});
