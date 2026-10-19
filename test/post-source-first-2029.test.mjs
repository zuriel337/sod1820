import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPost2029PrimaryProjection } from "../src/lib/research/post2029PrimaryProjection.js";

test("the early Post projection is a complete source reader without guessed enrichment", () => {
  const post = {
    id: 42,
    slug: "ordinary-source",
    title: "מקור ציבורי",
    author: "מחבר",
    excerpt: "תקציר",
    content: '<section><h2 data-source-heading="true">פרק ראשון</h2><p>אב = 3</p></section>',
    tags: [],
    categories: ["מקור"],
  };

  const projection = buildPost2029PrimaryProjection(post);

  assert.equal(projection.extensionsPending, true);
  assert.equal(projection.post.title, post.title);
  assert.equal(projection.post.content, post.content, "the source body is presented before decoration");
  assert.equal(projection.sourceLine, "מחבר");
  assert.equal(projection.sourceLabel, "מחבר");
  assert.equal(projection.excerpt, "תקציר");
  assert.equal(projection.regions[0].id, "post-story");
  assert.equal(projection.regions[0].heading, post.title);
  assert.equal(projection.defaultRegionId, projection.regions[0].id);
  assert.deepEqual(projection.experience.connections, []);
  assert.deepEqual(projection.experience.timeline, []);
  assert.deepEqual(projection.experience.trail, []);
  assert.equal(projection.contextPack, null);
  assert.equal(post.content.includes("data-gem"), false, "the canonical row is not mutated");
});

test("the early FZ1073 reader exposes only the canonical source while every extension stays closed", () => {
  const post = {
    id: 5112,
    slug: "flydubai-fz1073-363-14000-remzei-geula",
    title: "טיסה 1073",
    author: "SOD1820",
    excerpt: "מקור הטיסה",
    content: "<section><h2>FZ 1073</h2><p>מקור</p></section>",
    tags: [],
    categories: ["רמזי גאולה"],
    date: "2026-09-30T00:00:00Z",
  };

  const projection = buildPost2029PrimaryProjection(post);

  assert.equal(projection.golden, true);
  assert.equal(projection.regions.length, 1);
  assert.equal(projection.regions[0].id, "post-story");
  assert.equal(projection.experience.media, null);
  assert.deepEqual(projection.experience.connections, []);
  assert.equal(projection.regions.some((region) => region.id === "post-connections"), false);
});

test("Post2029Page publishes the primary source before requesting the extension chunk and keeps it after an extension error", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const primary = page.indexOf("acceptProjection(buildPost2029PrimaryProjection(post), true)");
  const extension = page.indexOf('import("../lib/research/post2029ReadingProjection.js")');
  assert.ok(primary > 0 && extension > primary, "source acceptance precedes the extension module request");
  assert.match(page, /current\.projection\s*\?\s*\{\s*\.\.\.current,[^}]*extensionsError:\s*message/s);
  assert.match(page, /data-extensions-status=/);
});
