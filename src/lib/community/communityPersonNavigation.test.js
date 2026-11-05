import test from "node:test";
import assert from "node:assert/strict";
import { validCommunityAuthorKey, communityPersonHref, isCommunityPersonHref, communityPersonReturnHref, communityAccountReturnHref, communityChatHref, communityReadingReturnHref } from "./communityPersonNavigation.js";

const id = "11111111-1111-4111-8111-111111111111";
test("existing contributor/account namespaces survive native community URLs", () => {
  for (const key of [id, `user:${id}`]) {
    assert.equal(validCommunityAuthorKey(key), true);
    assert.equal(new URL(communityPersonHref(key), "https://local.invalid").searchParams.get("member"), key);
    assert.equal(isCommunityPersonHref(communityPersonHref(key)), true);
  }
  for (const key of ["יניב", "user:other", "../admin", null, [id]]) {
    assert.equal(validCommunityAuthorKey(key), false);
    assert.equal(communityPersonHref(key), null);
  }
});
test("canonical source projection URL cannot authorize other destinations/fields", () => {
  for (const href of ["https://evil.example/2029?preview=community", "/2029?preview=world", "/2029?preview=community&member=anything",
    communityPersonHref(id) + "&mode=admin_all", communityPersonHref(id) + "#private", "/2029?preview=community&data=live&member=me"]) {
    assert.equal(isCommunityPersonHref(href), false, href);
  }
});
test("profile return preserves the existing feed query and message anchor without recursive profile state", () => {
  assert.equal(communityPersonReturnHref("/2029", `preview=community&data=live&member=${id}&section=sources&sort=oldest&returnTo=bad`, "#message-7"),
    "/2029?preview=community&data=live&sort=oldest#message-7");
});
test("private account trips retain thread, repeated query and inert anchor without carrying access grants", () => {
  assert.equal(communityAccountReturnHref({pathname:"/community/chat",search:"?thread="+id+"&part=1&part=2&_vercel_share=synthetic-grant&access_token=synthetic-token",hash:"#message-"+id}),"/community/chat?thread="+id+"&part=1&part=2#message-"+id);
  assert.equal(communityAccountReturnHref({pathname:"/community/chat",search:"?sort=oldest",hash:"#access_token=synthetic-token"}),"/community/chat?sort=oldest");
});

test("new community person links are canonical and historical source URLs remain recognized", () => {
  assert.equal(communityPersonHref(id), `/community/chat?member=${id}`);
  assert.equal(isCommunityPersonHref(`/2029?preview=community&data=live&member=${id}`), true);
});
test("canonical community navigation retains message selection, repeated state and inert anchors", () => {
  const path = `${id},22222222-2222-4222-8222-222222222222`;
  const search = new URLSearchParams(`preview=community&data=live&thread=${id}&reply=22222222-2222-4222-8222-222222222222&path=${path}&sort=liked&sourceSort=oldest&q=hello&part=1&part=2&_vercel_share=synthetic`);
  const href = communityChatHref(search, `#message-${id}`);
  const url = new URL(href, "https://local.invalid");
  assert.equal(url.pathname, "/community/chat");
  assert.equal(url.searchParams.get("thread"), id);
  assert.equal(url.searchParams.get("path"), path);
  assert.equal(url.searchParams.get("sort"), "liked");
  assert.equal(url.searchParams.get("sourceSort"), "oldest");
  assert.equal(url.searchParams.get("q"), "hello");
  assert.deepEqual(url.searchParams.getAll("part"), ["1", "2"]);
  assert.equal(url.hash, `#message-${id}`);
  for (const key of ["preview", "data", "_vercel_share"]) assert.equal(url.searchParams.has(key), false);
  assert.equal(search.get("preview"), "community", "navigation never mutates the current URL state");
});
test("community return preserves exact legacy or canonical reading state without recursive returns", () => {
  assert.equal(communityReadingReturnHref(`/2029?preview=community&data=live&sort=oldest&thread=${id}&returnTo=%2Fworld#message-${id}`), `/community/chat?sort=oldest&thread=${id}#message-${id}`);
  assert.equal(communityReadingReturnHref(`/community/chat?member=user%3A${id}&section=community#message-${id}`), `/community/chat?member=user%3A${id}&section=community#message-${id}`);
  for (const href of ["//evil.example/community/chat", "https://evil.example/community/chat", "/2029?preview=world", "/2029/me/messages", "/community/chat/extra", "/community/chat\\secret"]) assert.equal(communityReadingReturnHref(href), null);
});

test("reviewed historical Torah Tamima link uses only the newer account public page", () => {
  const oldContributor = "1f95f46b-b18b-480b-a2d2-8a9ce90eb194";
  const account = "365fb241-77ed-4a9d-98ab-4e30ab53c093";
  const canonical = `/community/chat?member=user%3A${account}`;
  assert.equal(communityPersonHref(oldContributor), canonical);
  assert.equal(communityPersonHref(`user:${account}`), canonical);
  assert.equal(isCommunityPersonHref(canonical), true);
  assert.equal(communityPersonHref("793dc271-2194-4110-b5ff-d2422d6f1c85"),
    "/community/chat?member=793dc271-2194-4110-b5ff-d2422d6f1c85",
    "older distinct login is never automatically treated as the newly claimed source");
});
