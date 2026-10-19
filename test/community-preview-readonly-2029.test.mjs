import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { renderPreviewReadonlyWorker } from "../scripts/preview-readonly-worker.mjs";
import { isCommunityReadOnlyPreview } from "../src/lib/community/communityPreviewReadOnly.js";

function workerPolicy() {
  const handlers = {};
  const { worker } = renderPreviewReadonlyWorker({
    commit: "5de4d5772bbf2624d9f6195c00216d49df2d04d1",
    branch: "gpt/2029-hybrid-stage-preview-20261018",
    host: "sod1820-community-test-sod1820-s-projects.vercel.app",
    buildTarget: "hybrid",
  });
  runInNewContext(worker, {
    self: { addEventListener: (kind, handler) => { handlers[kind] = handler; } },
    URL, Response,
    fetch: () => { throw new Error("No network is permitted in this policy test"); },
  });
  return async (name, origin = "https://linswmnnkjxvweumprav.supabase.co") => {
    let response;
    handlers.fetch({
      request: new Request(`${origin}/rest/v1/rpc/${name}`, { method: "POST", body: "{}" }),
      respondWith: (value) => { response = value; },
    });
    return response ? await response : null;
  };
}

test("the existing Preview markers disable Community write presentation; ordinary documents keep their behavior", () => {
  assert.equal(isCommunityReadOnlyPreview(null), false);
  assert.equal(isCommunityReadOnlyPreview({ getElementById: () => null }), false);
  for (const marker of ["sod-hybrid-local-readonly", "sod-preview-readonly-bootstrap"]) {
    assert.equal(isCommunityReadOnlyPreview({ getElementById: (id) => id === marker ? {} : null }), true);
  }
});

test("the real worker admits only the three installed Community read RPCs", async () => {
  const check = workerPolicy();
  for (const name of ["community_feed_page", "community_replies_page", "community_reply_counts"]) {
    assert.equal(await check(name), null, `${name} passes through to the existing server-authorized reader`);
    const foreign = await check(name, "https://other.example");
    assert.equal(foreign.status, 403, `${name} on another origin is denied`);
    assert.equal((await check(`${name}_other`)).status, 403, "adjacent names do not inherit admission");
  }
});

test("Community writes, automatic account linking and unavailable advanced reads remain blocked", async () => {
  const check = workerPolicy();
  for (const name of [
    "community_edit_message", "community_delete_message", "community_hide_thread", "community_restore",
    "community_report_message", "community_resolve_report", "contributors_claim_legacy_by_email",
    "contributors_link_registered_legacy", "contributors_claim_legacy", "add_contribution",
    "toggle_contribution_reaction", "community_search", "community_message_context",
    "community_edit_history", "community_admin_removed", "community_admin_reports",
  ]) {
    const response = await check(name);
    assert.equal(response.status, 403, name);
    assert.equal(response.headers.get("X-Preview-Write-Blocked"), "true", name);
    assert.equal((await response.json()).error, "preview_read_only", name);
  }
});
