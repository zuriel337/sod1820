import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  archiveCommentText,
  publicPostCommentArchiveId,
  readPostCommentArchive,
  publicPostCommentPostId,
  normalizePostCommunityComment,
  readPostCommunityComments,
  mergePostComments,
  POST_COMMENT_ORIGIN,
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

test("the native post mounts the comments behind its public projection: archive by the WordPress id, new comments by the canonical post id", () => {
  const component = readFileSync(new URL("../src/components/experience2029/PostComments2029.jsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(component, /import \{ getCommentsByPostId \} from "\.\.\/\.\.\/lib\/supabaseApi2029\.js"/);
  assert.match(component, /readPostCommentArchive\(postWpId, getCommentsByPostId\)/);
  assert.match(component, /readPostCommunityComments\(postId, supabase, ownUserId\)/);
  assert.match(component, /\{rows\.length \? <details open>/, "existing comments are shown; none means no comment list");
  assert.doesNotMatch(component, /האתר הקודם|אין תגובות/);
  assert.match(component, /lazy\(\(\) => import\("\.\/PostCommentComposer2029\.jsx"\)\)/, "the writing tool loads only when it is needed");
  assert.doesNotMatch(component, /communityShareDraft|navigate\(/, "writing stays in the post: no move to the community");
  assert.match(component, /<p dir="auto">\{comment\.text\}<\/p>/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|legacy\.jsx|Discourse|useOpenWeb/);
  assert.match(page, /publicPostCommentArchiveId\(state\.projection\)/);
  assert.match(page, /publicPostCommentPostId\(state\.projection\)/);
  assert.match(page, /commentPostId != null \? <PostComments2029/, "every public post has the comments, with or without a WordPress id");
  const composer = readFileSync(new URL("../src/components/experience2029/PostCommentComposer2029.jsx", import.meta.url), "utf8");
  assert.match(composer, /addContribution\(\{ intent: "תגובה", origin: POST_COMMENT_ORIGIN, body, targetType: "post", targetId: postId/, "one record through the existing writer, keyed by the canonical post id");
  assert.match(composer, /sending\.current/, "no double send");
  assert.equal(POST_COMMENT_ORIGIN, "community_2029", "the existing community feed already lists this origin: one record, one source");
});

test("new comments: canonical post id, hidden or empty rows never show, a guest's own pending row is marked, ids are namespaced and merged once", async () => {
  assert.equal(publicPostCommentPostId({ post: { id: 5113, wp_id: null } }), 5113);
  assert.equal(publicPostCommentPostId({ post: { id: 5113 }, draft: true }), null);
  assert.equal(publicPostCommentPostId({ post: { id: "x" } }), null);
  const ok = { id: "u1", parent_id: null, author_name: "דנה", body: "<b>שלום</b>", status: "approved", created_at: "2026-11-25T10:00:00Z" };
  assert.deepEqual(normalizePostCommunityComment(ok), { id: "c:u1", parentId: null, author: "דנה", text: "שלום", date: "2026-11-25T10:00:00Z", pending: false, source: "community" });
  for (const bad of [{ ...ok, status: "hidden" }, { ...ok, status: "rejected" }, { ...ok, deleted_at: "2026-11-25" }, { ...ok, thread_hidden_at: "2026-11-25" }, { ...ok, body: "  " }, null]) assert.equal(normalizePostCommunityComment(bad), null);
  assert.equal(normalizePostCommunityComment({ ...ok, status: "pending", author_user_id: "me" }, "me").pending, true);
  assert.equal(normalizePostCommunityComment({ ...ok, status: "pending", author_user_id: "other" }, "me").pending, false);
  assert.equal("author_user_id" in normalizePostCommunityComment(ok), false, "no account identity reaches the page");
  const calls = [];
  const client = { from: () => { const q = { select: () => q, eq: (k, v) => { calls.push([k, v]); return q; }, order: () => q, limit: async () => ({ data: [ok, { ...ok, id: "u2", status: "hidden" }] }) }; return q; } };
  assert.equal((await readPostCommunityComments(5113, client)).length, 1);
  assert.deepEqual(calls, [["target_type", "post"], ["target_id", "5113"], ["origin", "community_2029"]]);
  const merged = mergePostComments([{ id: "71", date: "2020-01-01T00:00:00Z" }, { id: "72", date: "2026-01-01T00:00:00Z" }], [{ id: "c:u1", date: "2026-11-25T10:00:00Z" }, { id: "71", date: "2020-01-01T00:00:00Z" }]);
  assert.deepEqual(merged.map(row => row.id), ["71", "72", "c:u1"]);
});

test("comments (ZURIEL 25.11.2026): the comments with their number when there are some, ONLY the action «רשום תגובה» when there are none, and no source or old/new labels", () => {
  const component = readFileSync(new URL("../src/components/experience2029/PostComments2029.jsx", import.meta.url), "utf8").split("\n").filter(line => !/^\s*\/\//.test(line)).join("\n");   // code only, not comments
  assert.match(component, /<summary>תגובות \(\{rows\.length\}\)<\/summary>/, "the number of comments");
  assert.match(component, />רשום תגובה<\/button>/, "the one action");
  assert.doesNotMatch(component, /רוצים להוסיף משהו|להוסיף בקהילה/, "no extra invitation text and no second wording for the action");
  assert.doesNotMatch(component, /ורדפרס|וורדפרס|WordPress|תגובות ישנות|תגובות חדשות/i, "no source or old/new labels");
  // With no rows nothing but the action is drawn: the list block is conditional on rows, the action block on the href only.
  assert.match(component, /\{rows\.length \? <details open>/);
  assert.match(component, /<div className="sod29-post-comments-add">/);
});

test("the edit date (ZURIEL 25.11.2026) appears only for a real edit after the publication day", async () => {
  const { postArticleByline2029 } = await import("../src/lib/research/postArticleDocument2029.js");
  const edited = postArticleByline2029({ date: "2026-02-05T08:00:00Z", modified: "2026-03-01T10:00:00Z", author: "" });
  assert.equal(edited.modified, "2026-03-01");
  assert.match(edited.modifiedLabel, /2026/);
  for (const post of [{ date: "2026-02-05T08:00:00Z", modified: "2026-02-05T23:00:00Z" }, { date: "2026-02-05T08:00:00Z", modified: null }, { date: "2026-02-05T08:00:00Z", modified: "garbage" }, { date: "2026-02-05T08:00:00Z", modified: "2025-01-01T00:00:00Z" }]) {
    assert.equal(postArticleByline2029(post).modified, "", "same day, missing, malformed or earlier: no edit date");
  }
});
