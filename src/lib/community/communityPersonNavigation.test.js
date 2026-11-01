import test from "node:test";
import assert from "node:assert/strict";
import { validCommunityAuthorKey, communityPersonHref, isCommunityPersonHref, communityPersonReturnHref, communityAccountReturnHref } from "./communityPersonNavigation.js";

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
