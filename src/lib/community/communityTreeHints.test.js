import test from "node:test";
import assert from "node:assert/strict";
import { fetchTreeHints, normalizeTreeHints, setTreeHint, treeHintLine } from "./communityTreeHints.js";

const A = "11111111-2222-4333-8444-555555555555";
const B = "66666666-7777-4888-9999-aaaaaaaaaaaa";

test("a hint is one plain line: no links, no line breaks, cut with an ellipsis", () => {
  assert.equal(treeHintLine("שיעור ההצבעה 77.7%\n\nhttps://x.co/a  נתניהו בן 77"), "שיעור ההצבעה 77.7% נתניהו בן 77");
  assert.equal(treeHintLine("   "), "");
  const long = treeHintLine("מילה ".repeat(60));
  assert.ok([...long].length <= 111 && long.endsWith("…"), long);
});
test("hints keep server order, drop empty or duplicate rows and link to the thread path", () => {
  const hints = normalizeTreeHints([
    { id: B, author_name: " Jasha8 ", body: "77", entered_at: "2026-11-08T10:00:00Z", path: [A, B] },
    { id: B, body: "כפול", path: [A, B] },
    { id: A, body: "   " },
    { id: A, body: "שורש", path: [A] },
    null,
  ], "https://sod1820.co.il/community/chat?x=1");
  assert.deepEqual(hints.map(h => h.id), [B, A]);
  assert.equal(hints[0].authorName, "Jasha8");
  assert.equal(hints[0].href, `https://sod1820.co.il/community/chat?thread=${A}&reply=${B}&path=${A}%2C${B}`);
  assert.equal(hints[1].href, `https://sod1820.co.il/community/chat?thread=${A}`);
  assert.deepEqual(normalizeTreeHints(null), []);
});
test("tree hint API calls the exact RPCs and refuses unknown actions", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === "community_tree_hints_list" ? [{ id: A, body: "רמז", path: [A] }] : null, error: null }; } };
  assert.equal((await fetchTreeHints({ limit: 5 }, client)).length, 1);
  await setTreeHint(A, "enter", client);
  await setTreeHint(A, "remove", client);
  await assert.rejects(setTreeHint(A, "delete", client));
  assert.deepEqual(calls, [
    ["community_tree_hints_list", { p_limit: 5 }],
    ["community_tree_hint_set", { p_id: A, p_action: "enter" }],
    ["community_tree_hint_set", { p_id: A, p_action: "remove" }]]);
  await assert.rejects(fetchTreeHints({}, { rpc: async () => ({ data: null, error: { message: "x" } }) }));
});
