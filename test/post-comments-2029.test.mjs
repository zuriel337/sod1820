import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  archiveCommentText,
  publicPostCommentArchiveId,
  readPostCommentArchive,
} from "../src/components/experience2029/postComments2029.js";

test("the archive reads the original WordPress identity and preserves parent, author, text and date", async () => {
  const reads = [];
  const comments = await readPostCommentArchive("12345", async (id) => {
    reads.push(id);
    return [
      { wp_id: 71, post_wp_id: 12345, parent_wp_id: 0, author_name: "מחבר &amp; חבר", content: "<p>שלום [מקור]</p><p>שורה שנייה<br>סוף</p>", date: "2020-04-05T10:15:00Z" },
      { wp_id: 72, post_wp_id: "12345", parent_wp_id: 71, author_name: "קורא", content: "<b>תודה</b>", date: "2020-04-05T11:15:00Z" },
      { wp_id: 73, post_wp_id: 999, author_name: "פוסט אחר", content: "לא יופיע" },
    ];
  });
  assert.deepEqual(reads, ["12345"], "do not substitute posts.id, slug or conversation identity");
  assert.deepEqual(comments, [
    { id: "71", parentId: null, author: "מחבר & חבר", text: "שלום [מקור]\nשורה שנייה\nסוף", date: "2020-04-05T10:15:00Z" },
    { id: "72", parentId: "71", author: "קורא", text: "תודה", date: "2020-04-05T11:15:00Z" },
  ]);
});

test("archive content is plain text and never activates stored HTML or media", () => {
  assert.equal(archiveCommentText('<script>window.stolen=true</script><style>body{display:none}</style><p>שמור &lt;img onerror=alert(1)&gt;</p><img src="https://example.test/track" onerror="alert(1)"><a href="javascript:alert(1)">קישור</a>'), "שמור <img onerror=alert(1)>\nקישור");
  assert.equal(archiveCommentText("&#x5e9;&#1500;&#1493;&#1501; &quot;טקסט&quot; &hellip; &#0; &#x110000;"), 'שלום "טקסט" …');
});

test("archive eligibility follows only a public real post with its WordPress ID", async () => {
  const projection = { post: { id: 9, wp_id: 12345, slug: "source" } };
  assert.equal(publicPostCommentArchiveId(projection), 12345);
  for (const flag of ["draft", "privateStage", "previewSnapshot"]) {
    assert.equal(publicPostCommentArchiveId({ ...projection, [flag]: true }), null);
  }
  for (const wp_id of [null, undefined, 0, -1, "slug", "", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(publicPostCommentArchiveId({ post: { wp_id } }), null);
    assert.deepEqual(await readPostCommentArchive(wp_id, () => { throw Error("invalid ID must not read"); }), []);
  }
});

test("missing rows, root parent zero and malformed dates do not invent archive facts", async () => {
  assert.deepEqual(await readPostCommentArchive(12, async () => null), []);
  const rows = await readPostCommentArchive(12, async () => [{ wp_id: 7, post_wp_id: 12, parent_wp_id: "0", date: "not-a-date" }]);
  assert.deepEqual(rows, [{ id: "7", parentId: null, author: "", text: "", date: null }]);
});

test("the native post mounts the archive behind its public projection and uses the existing canonical reader", () => {
  const component = readFileSync(new URL("../src/components/experience2029/PostComments2029.jsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(component, /import \{ getCommentsByPostId \} from "\.\.\/\.\.\/lib\/supabase\.js"/);
  assert.match(component, /readPostCommentArchive\(postWpId, getCommentsByPostId\)/);
  assert.match(component, /<details>/);
  assert.match(component, /<p dir="auto">\{comment\.text\}<\/p>/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|legacy\.jsx|Discourse|useOpenWeb/);
  assert.match(page, /const PostComments2029 = lazy\(\(\) => import\("\.\.\/components\/experience2029\/PostComments2029\.jsx"\)\)/);
  assert.match(page, /publicPostCommentArchiveId\(state\.projection\)/);
  assert.match(page, /commentArchiveId != null && !state\.extensionsLoading \? <Suspense fallback=\{null\}>/);
  assert.match(page, /<PostComments2029 key=\{String\(commentArchiveId\)\} postWpId=\{commentArchiveId\}/);
});
