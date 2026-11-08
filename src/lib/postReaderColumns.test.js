// node --test src/lib/postReaderColumns.test.js
// PF4: the public single-Post reader no longer uses select('*'). These tests pin the contract that makes that safe.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { POST_READER_COLUMNS, POST_READER_EXCLUDED_COLUMNS, POST_READER_SELECT } from "./postReaderColumns.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The 42 columns of public.posts on 2026-11-07 (information_schema, SELECT only).
const LIVE_POSTS_COLUMNS = [
  "id", "title", "content", "date", "slug", "link", "images", "categories", "created_at", "wp_id", "image_url", "excerpt", "author",
  "tags", "modified", "source", "tree_priority", "space", "content_old", "verified", "verified_at", "verified_by", "ai_addition",
  "ai_touched", "ai_touched_note", "verify_level", "convergence_score", "convergence_axes", "has_1820", "verify_signature",
  "has_1820_seal", "ai_number", "share_to_fb", "fb_posted_at", "fb_post_id", "fb_error", "theme", "authors", "axis_pin", "thumb_url",
  "home_hidden", "cipher_slug",
];

test("reader columns + excluded columns are exactly the posts table, with no overlap and no duplicates", () => {
  assert.equal(new Set(POST_READER_COLUMNS).size, POST_READER_COLUMNS.length);
  assert.equal(new Set(POST_READER_EXCLUDED_COLUMNS).size, POST_READER_EXCLUDED_COLUMNS.length);
  assert.deepEqual(POST_READER_COLUMNS.filter((c) => POST_READER_EXCLUDED_COLUMNS.includes(c)), []);
  assert.deepEqual([...POST_READER_COLUMNS, ...POST_READER_EXCLUDED_COLUMNS].sort(), [...LIVE_POSTS_COLUMNS].sort());
  assert.equal(POST_READER_SELECT, POST_READER_COLUMNS.join(","));
  assert.equal(POST_READER_SELECT.includes("*"), false);
});

test("the body, identity and every field the Post surfaces read stay in the projection", () => {
  for (const column of ["id", "slug", "title", "content", "excerpt", "author", "date", "modified", "created_at", "source", "link", "wp_id",
    "tags", "categories", "image_url", "thumb_url", "home_hidden", "images", "space", "ai_addition", "cipher_slug"]) {
    assert.ok(POST_READER_COLUMNS.includes(column), `${column} must stay readable`);
  }
});

function* sourceFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "node_modules" && entry.name !== "dist") yield* sourceFiles(full); continue; }
    if (/\.(?:js|jsx|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name)) yield full;
  }
}

test("no client or server source reads a column the reader no longer fetches", () => {
  const roots = ["src", "api", "server", "public-reading-deploy"].map((d) => path.join(root, d)).filter((d) => fs.existsSync(d));
  const self = path.join(root, "src", "lib", "postReaderColumns.js");
  const patterns = POST_READER_EXCLUDED_COLUMNS.map((column) => [column, new RegExp(`\\b${column}\\b`)]);
  const hits = [];
  for (const base of roots) {
    for (const file of sourceFiles(base)) {
      if (file === self) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const [column, re] of patterns) if (re.test(text)) hits.push(`${path.relative(root, file)}: ${column}`);
    }
  }
  assert.deepEqual(hits, [], "move the column into POST_READER_COLUMNS before reading it");
});

test("getPostBySlug sends the explicit projection (never *) and keeps its other filters", async () => {
  const { supabase, getPostBySlug } = await import("./supabase.js");
  const calls = [];
  const originalFrom = supabase.from;
  const row = { id: 1, slug: "x", title: "t", content: "<p>c</p>" };
  const chain = (table) => {
    const state = { table, ops: [] };
    const builder = new Proxy({}, {
      get(_, op) {
        if (op === "then") return (resolve) => resolve({ data: [row], error: null });
        return (...args) => { state.ops.push([op, ...args]); return builder; };
      },
    });
    calls.push(state);
    return builder;
  };
  supabase.from = chain;
  try {
    const post = await getPostBySlug("x");
    assert.deepEqual(post, row);
  } finally { supabase.from = originalFrom; }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, "posts");
  const select = calls[0].ops.find(([op]) => op === "select");
  assert.equal(select[1], POST_READER_SELECT);
  assert.notEqual(select[1], "*");
  assert.deepEqual(calls[0].ops.find(([op]) => op === "limit"), ["limit", 1]);
  assert.equal(calls[0].ops.some(([op]) => op === "in"), true);
});
