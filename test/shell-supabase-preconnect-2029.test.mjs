import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUPABASE_URL } from "../src/lib/supabase.js";

const shell = readFileSync(new URL("../2029.html", import.meta.url), "utf8");

// The first Supabase request (REST/RPC/Storage) is on the critical path of /post, /community/chat and Home. The shell opens that
// connection while the document is parsed. Anonymous (crossorigin) pool = fetch(), which is what supabase-js and the worker use.
test("the 2029 shell preconnects to the exact Supabase origin the client uses", () => {
  const links = [...shell.matchAll(/<link\b[^>]*rel="preconnect"[^>]*>/g)].map(match => match[0]);
  const supabase = links.filter(tag => tag.includes(`href="${SUPABASE_URL}"`));
  assert.equal(supabase.length, 1, "exactly one Supabase preconnect");
  assert.match(supabase[0], /\bcrossorigin\b/);
});

test("existing font hints are unchanged and the Supabase hint precedes them", () => {
  const order = [...shell.matchAll(/<link\b[^>]*rel="preconnect"[^>]*href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order, [SUPABASE_URL, "https://fonts.googleapis.com", "https://fonts.gstatic.com"]);
});
