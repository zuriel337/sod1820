import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformWithOxc } from "vite";
import { normalizeCommunityThreadFocus, legacyLikeCount } from "../../lib/community/communityArchive.js";
import { communityAccountReturnHref, communityChatHref, communityPersonReturnHref, communityReadingReturnHref } from "../../lib/community/communityPersonNavigation.js";
import { readGuestName } from "../../lib/community/communityGuestApi.js";
import { reviewedCommunityAccountId } from "../../lib/community/communityCanonicalIdentity2029.js";

// Execute the actual component and effect bodies with isolated hooks/transports.
// This is a focused unit harness, not a browser or a replacement authorization model.
async function harness(file, names, overrides = {}) {
  const slots = [], pending = [];
  let cursor = 0;
  const slot = () => slots[cursor++] ||= {};
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const effect = (run, deps) => {
    const current = slot();
    if (!same(current.deps, deps)) {
      current.deps = deps;
      pending.push(() => { current.cleanup?.(); current.cleanup = run(); });
    }
  };
  const useState = initial => {
    const current = slot();
    if (!("value" in current)) current.value = typeof initial === "function" ? initial() : initial;
    return [current.value, next => { current.value = typeof next === "function" ? next(current.value) : next; }];
  };
  const useMemo = (get, deps) => {
    const current = slot();
    if (!same(current.deps, deps)) { current.deps = deps; current.value = get(); }
    return current.value;
  };
  const location = new URL("https://preview.example/community/chat");
  const context = {
    Intl, URL, URLSearchParams, AbortController, AbortSignal, Set, Map,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    window: { location, addEventListener() {}, removeEventListener() {} },
    document: { hidden: false, createElement: () => ({}), querySelector: () => null, getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState, useMemo, useCallback: (callback, deps) => useMemo(() => callback, deps),
    useRef: value => { const current = slot(); return current.ref ||= { current: value }; },
    useEffect: effect, useLayoutEffect: effect, useId: () => "unit-id", lazy: () => "LazyComponent",
    useAuth: () => ({ user: { id: "account" }, isAdmin: false, loading: false }),
    useCommunityReadingPosition2029: () => ({ resume: null, updates: {}, error: false }),
    useCommunityDraft2029: () => { const [draft, setDraft] = useState(""); const [replyTo, setReplyTo] = useState(null); return { draft, setDraft, replyTo, setReplyTo, status: "idle", clear() { setDraft(""); setReplyTo(null); }, setHasFiles() {} }; },
    publicLaunchActionsLocked: isAdmin => isAdmin !== true,
    communityActionsLocked: isAdmin => isAdmin !== true,
    PUBLIC_READING_PRODUCTION_ARTIFACT: false,
    use2029Palette: () => ({}), useLocation: () => location,
    useSearchParams: () => [new URLSearchParams(location.search)], useNavigate: () => () => {},
    publicStats: { messages: 1 }, normalizeCommunityThreadFocus, legacyLikeCount,
    // Pure helpers the components call while rendering/normalizing (guest name memory #1243, reviewed account link 59694e8bb);
    // the real implementations run, never opaque placeholders.
    readGuestName, reviewedCommunityAccountId,
    UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    communityAccountReturnHref, communityChatHref, communityPersonReturnHref, communityReadingReturnHref, personalMessagesReturnHref: () => null,
    writerPersonalHref: module => `/2029/me/${module}`,
    useCommunityMessageActions2029: () => ({ items: {}, patches: {}, register() {} }),
    canonicalCommunityAuthorKey: value => value, useCommunityTyping2029: () => ({ typingPeople: { names: [], anonymous: 0 }, notifyTyping() {} }),
    fetchGuestUnreviewed: async () => [], typingLabel: people => people.names.length || people.anonymous ? "x" : "",
    fetchTreeHints: async () => [], setTreeHint: async () => {}, parseTreeHintNumbers: () => [],
    pingCommunityPresence: async () => {}, fetchCommunityPresenceOnline: async () => [], COMMUNITY_PRESENCE_PING_MS: 45000,
    fetchCommunityArchivePage: async () => ({ rows: [], nextOffset: 0, count: 0 }),
    fetchLinkedAccountProfiles: async () => ({}), fetchCommunityReplyCounts: async () => ({}),
    startCommunityRefresh: () => () => {}, applySeo() {}, restoreCommunityScrollAnchor() {},
    ...overrides,
  };
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const { code } = await transformWithOxc(source, file.endsWith(".jsx") ? file : `${file}.js`, { jsx: { runtime: "classic" } });
  // Unused imported components remain opaque element types. Only the requested
  // component is executed; its side effects must go through the explicit spies.
  for (const match of code.matchAll(/^import (.+?) from /gm)) {
    for (const name of match[1].replace(/[{}]/g, "").split(",").map(value => value.trim()).filter(Boolean)) {
      if (!(name in context)) context[name] = name;
    }
  }
  const body = code.replace(/^export\s*\{[^}]*\}\s*from[^;]+;\n/gm, "").replace(/^import[\s\S]*?;\n/gm, "").replace(/\bexport (?:default )?/g, "")
    .replace(/import\.meta\.env/g, "({})");
  vm.runInNewContext(`${body}\nthis.result = { ${names.join(",")} };`, context, { filename: file });
  return {
    ...context.result, location,
    render(fn, props) { cursor = 0; return fn(props); },
    async flush() { while (pending.length) pending.shift()(); await Promise.resolve(); await Promise.resolve(); },
  };
}

function elements(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
const row = { id: "11111111-1111-4111-8111-111111111111", origin: "openweb", body: "public", reactions: { likes: 7 } };
// The general feed container is "sod29-community-feed", plus "is-initial-loading" while the first page reserves its screen
// (CLS fix cd2a91975, #1223). Exactly these two class strings are the feed; anything else is not.
const isGeneralFeed = node => ["sod29-community-feed", "sod29-community-feed is-initial-loading"].includes(node.props?.className);

test("public read mounts the feed while its composer/account widgets stay unmounted; admin keeps compact composer", async () => {
  for (const [user, isAdmin] of [[null, false], [{ id: "account" }, false], [{ id: "admin" }, true]]) {
    const h = await harness("./CommunityLive2029.jsx", ["CommunityLive2029", "LiveLike"], {
      useAuth: () => ({ user, profile: {}, isAdmin }),
    });
    const tree = elements(h.render(h.CommunityLive2029, {}));
    const composer = tree.find(node => node.props?.className === "sod29-community-composer");
    assert.equal(Boolean(composer), isAdmin);
    if (isAdmin) assert.equal(composer.props["data-compact"], true);
    assert.equal(tree.some(node => node.type === "CommunitySignIn"), isAdmin);
    assert.ok(tree.some(isGeneralFeed));
    const likes = elements(h.render(h.LiveLike, { row }));
    assert.equal(likes.some(node => node.type === "ReactionBar"), isAdmin);
  }
});

test("a malformed exact thread request does not read or display the general feed", async () => {
  let feedReads = 0;
  const h = await harness("./CommunityLive2029.jsx", ["CommunityLive2029"], {
    fetchCommunityArchivePage: async () => { feedReads++; return { rows: [], nextOffset: 0 }; },
  });
  h.location.search = "?thread=missing&reply=private";
  h.render(h.CommunityLive2029, {}); await h.flush();
  const tree = elements(h.render(h.CommunityLive2029, {}));
  assert.equal(feedReads, 0);
  assert.equal(tree.some(isGeneralFeed), false);
  assert.ok(tree.some(node => node.props?.title === "השיחה אינה זמינה"));
});

test("retrying an unavailable deep reply repeats the exact parent/child lookup", async () => {
  const child = "22222222-2222-4222-8222-222222222222", calls = [];
  const h = await harness("./CommunityLive2029.jsx", ["LiveThread"], {
    fetchCommunityReply: async (parent, id) => { calls.push([parent, id]); return null; },
    fetchCommunityReplies: () => { throw new Error("must not substitute other replies"); },
  });
  const props = { row, accountProfiles: {}, replyCounts: {}, onRepliesLoaded() {}, focusPath: [row.id, child] };
  h.render(h.LiveThread, props); await h.flush();
  const retry = elements(h.render(h.LiveThread, props)).find(node => node.type === "button" && node.props.children.includes("ניסיון נוסף"));
  assert.ok(retry); retry.props.onClick();
  h.render(h.LiveThread, props); await h.flush();
  assert.deepEqual(calls, [[row.id, child], [row.id, child]]);
});

test("public message actions never request ownership or mutate even for a signed-in account", async () => {
  const calls = [];
  const h = await harness("./useCommunityMessageActions2029.js", ["useCommunityMessageActions2029"], {
    fetchCommunityMessageActions: async () => { calls.push("permission"); return { state: "ready", items: {} }; },
    editCommunityMessage: async () => { calls.push("edit"); }, deleteCommunityMessage: async () => { calls.push("delete"); },
  });
  h.render(h.useCommunityMessageActions2029, [row]); await h.flush();
  const actions = h.render(h.useCommunityMessageActions2029, [row]); await h.flush();
  assert.equal(actions.principalKey, null);
  assert.equal((await actions.mutate("edit", row, "changed")).state, "unavailable");
  assert.equal((await actions.mutate("delete", row)).state, "unavailable");
  assert.deepEqual(calls, []);
});

test("public old-chat anchor has neither OpenWeb launcher/SSO nor a same-domain escape link", async () => {
  let sso = 0;
  const h = await harness("./LegacyOpenWebChat2029.jsx", ["LegacyOpenWebChat2029"], { useOpenWeb: () => { sso++; } });
  h.location.hash = "#legacy-chat";
  const tree = elements(h.render(h.LegacyOpenWebChat2029, {})); await h.flush();
  assert.equal(sso, 0);
  assert.equal(tree.some(node => typeof node.type === "function" && node.type.name === "OpenWebConversation"), false);
  assert.ok(tree.some(node => node.props?.["data-openweb-loaded"] === "false"));
  assert.ok(tree.filter(node => node.type === "a").every(node => node.props.href.startsWith("#")));
});

test("public profile avatar and notifications do not probe private account capability", async () => {
  const forbidden = () => { throw new Error("private account read under the public lock"); };
  const avatar = await harness("../contributor2029/QuickProfileAvatar2029.jsx", ["QuickProfileAvatar2029"], {
    writerSelfRequest: forbidden, supabase: { auth: { getUser: forbidden } },
  });
  assert.equal(avatar.render(avatar.QuickProfileAvatar2029, { view: { communityAuthorKey: row.id } }), null);
  await avatar.flush();
  const account = await harness("./CommunitySignedInControls2029.jsx", ["CommunitySignedInControls2029"], {
    communityAccountReturnHref: () => "/community/chat", supabase: { auth: { getUser: forbidden } }, getUnreadCount: forbidden,
  });
  assert.equal(account.render(account.CommunitySignedInControls2029, {}), null);
  await account.flush();
});

test("public contributor capability/subscription/inbox controls stay unmounted while overview reads continue", async () => {
  let overviewReads = 0;
  const h = await harness("../contributor2029/ContributorActionsController2029.jsx", ["ContributorActionsController2029"], {
    use2029Shell: () => ({}), contributorInteraction: () => { throw new Error("private capability read"); },
    fetchContributorOverview: async () => { overviewReads++; return { state: "unavailable" }; },
  });
  const props = { view: { canonicalHref: "/community/researcher/public", profile: { name: "Public" } } };
  h.render(h.ContributorActionsController2029, props); await h.flush();
  const tree = elements(h.render(h.ContributorActionsController2029, props));
  assert.equal(overviewReads, 1);
  assert.equal(tree.some(node => node.type === "WatchButton"), false);
  assert.equal(tree.some(node => node.props?.children?.includes("שליחת הודעה לכותב")), false);
  assert.equal(tree.find(node => node.type === "ContributorMessageDialog2029").props.open, false);
});

test("public contributor reading does not save, mark history or expose personal summaries; admin keeps existing actions", async () => {
  for (const isAdmin of [false, true]) {
    const writes = [];
    const h = await harness("../contributor2029/ContributorReadingController2029.jsx", ["useContributorReading2029"], {
      useAuth: () => ({ user: { id: "account" }, isAdmin }), use2029Shell: () => ({}),
      useResearch: () => ({ saved: [], saveItem: () => { writes.push("save"); return true; },
        logHistory: () => writes.push("history"), updateResearchContext: () => writes.push("context") }),
      writerFeaturedItems: () => [], writerReadingProjection: () => ({ savedCount: 1, resume: { href: "/private" } }),
      writerReadingEntity: item => ({ ref: item.id, type: "post", title: "Public", link: item.href, metadata: {} }),
    });
    const reading = h.render(h.useContributorReading2029, { canonicalHref: "/community/researcher/public", profile: { name: "Public" } });
    const actions = reading.actions({ id: "public-post", href: "/post/public" });
    assert.equal(typeof actions.props.onSave === "function", isAdmin);
    actions.props.onResume();
    actions.props.onSave?.();
    assert.equal(writes.length, isAdmin ? 3 : 0);
    assert.equal(elements(reading.header).some(node => node.type === "WriterReadingSummary2029"), isAdmin);
  }
});

test("all default community reads use the anonymous client in the read profile and retain ordinary-build behavior", async () => {
  for (const readOnly of [true, false]) {
    const calls = [];
    const client = label => ({
      rpc(name, args) {
        calls.push([label, name]);
        const data = name === "community_reply_counts" ? args.p_ids.map(parent_id => ({ parent_id, reply_count: 0 }))
          : name === "community_message_context" ? [{ id: row.id, parent_id: null, origin: "openweb", body: "Public" }] : [];
        const result = { data, error: null };
        return { select: async () => result, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
      },
      from(table) {
        calls.push([label, table]);
        const query = {};
        for (const method of ["select", "eq", "in", "not", "neq", "or", "order", "limit", "range"]) query[method] = () => query;
        query.then = (resolve, reject) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
        return query;
      },
    });
    const anonymous = client("anonymous");
    const h = await harness("../../lib/community/communityArchive.js", ["fetchCommunityArchivePage", "fetchCommunityThread", "fetchCommunityReplies", "fetchCommunityReplyCounts", "fetchCommunityAuthorPage", "fetchCommunityAuthorSummary", "fetchLinkedAccountProfiles"], {
      PUBLIC_LAUNCH_READ_ONLY_PREVIEW: readOnly, supabase: client("session"), getPublicResearchClient: () => anonymous,
    });
    await h.fetchCommunityArchivePage(); await h.fetchCommunityThread(row.id);
    await h.fetchCommunityReplies(row.id); await h.fetchCommunityReplyCounts([row.id]);
    await h.fetchCommunityAuthorPage("4cd9c034-0464-4600-a35d-7156f0584d9b");
    await h.fetchCommunityAuthorSummary("4cd9c034-0464-4600-a35d-7156f0584d9b");
    await h.fetchLinkedAccountProfiles();
    assert.ok(calls.length >= 7);
    assert.ok(calls.every(([label]) => label === (readOnly ? "anonymous" : "session")));
  }
});


test("the old chat is closed by default (ZURIEL 8.11.2026: it feels heavy on the page) and opens only on an explicit click", async () => {
  const h = await harness("./LegacyOpenWebChat2029.jsx", ["LegacyOpenWebChat2029"], {
    PUBLIC_READING_PRODUCTION_ARTIFACT: true,
  });
  let tree = elements(h.render(h.LegacyOpenWebChat2029, {}));
  assert.ok(tree.some(node => node.props?.["data-openweb-loaded"] === "false"));
  assert.equal(tree.some(node => typeof node.type === "function" && node.type.name === "OpenWebConversation"), false);
  const open = tree.find(node => node.type === "button" && node.props.className === "sod29-legacy-chat-open");
  assert.ok(open);
  open.props.onClick();
  tree = elements(h.render(h.LegacyOpenWebChat2029, {}));
  assert.ok(tree.some(node => node.props?.["data-openweb-loaded"] === "true"));
  assert.ok(tree.some(node => typeof node.type === "function" && node.type.name === "OpenWebConversation"));
});
test("a direct #legacy-chat link still opens the old chat immediately", async () => {
  const h = await harness("./LegacyOpenWebChat2029.jsx", ["LegacyOpenWebChat2029"], {
    PUBLIC_READING_PRODUCTION_ARTIFACT: true,
  });
  h.location.hash = "#legacy-chat";
  const tree = elements(h.render(h.LegacyOpenWebChat2029, {})); await h.flush();
  assert.ok(tree.some(node => node.props?.["data-openweb-loaded"] === "true"));
  assert.ok(tree.some(node => typeof node.type === "function" && node.type.name === "OpenWebConversation"));
});

test("restored production artifact reuses the existing ordinary-member composer", async () => {
  const h = await harness("./CommunityLive2029.jsx", ["CommunityLive2029"], {
    PUBLIC_READING_PRODUCTION_ARTIFACT: true, communityActionsLocked: () => false,
  });
  const tree = elements(h.render(h.CommunityLive2029, {}));
  assert.ok(tree.some(node => node.props?.id === "community-live-draft"));
  assert.ok(tree.some(node => node.type === "CommunitySignIn"));
});

test('leaf replies never advertise a speculative expand button and can appear after a later public refresh', async () => {
  let count=0,reads=0;
  const h=await harness('./CommunityLive2029.jsx',['LiveThread'],{fetchCommunityReplies:async()=>{reads++;return{rows:count?[{...row,id:'22222222-2222-4222-8222-222222222222'}]:[],count,nextOffset:count}}});
  const props={row,accountProfiles:{},replyCounts:{},onRepliesLoaded(){},ancestors:['root'],refreshToken:0};
  let tree=elements(h.render(h.LiveThread,props));assert.equal(tree.filter(n=>n.props?.className==='sod29-community-replies-toggle').length,0);
  await h.flush();tree=elements(h.render(h.LiveThread,props));assert.equal(tree.filter(n=>n.props?.className==='sod29-community-replies-toggle').length,0);assert.equal(reads,1);
  count=1;h.render(h.LiveThread,{...props,refreshToken:1});await h.flush();tree=elements(h.render(h.LiveThread,{...props,refreshToken:1}));assert.equal(tree.filter(n=>n.props?.className==='sod29-community-replies-toggle').length,1);assert.equal(reads,2);
});

test('partial replies offer exactly remaining messages; a complete branch offers only close and cached reopen',async()=>{
  let reads=0;
  const children=['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'].map(id=>({...row,id}));
  const {mergeCommunityRefreshRows}=await import('../../lib/community/communityRefresh.js');
  const h=await harness('./CommunityLive2029.jsx',['LiveThread'],{captureCommunityScrollAnchor:()=>null,mergeCommunityRefreshRows,fetchCommunityReplies:async(_id,args)=>{reads++;const items=args.offset?children.slice(2):children.slice(0,2);return{rows:items,count:3,nextOffset:args.offset+items.length}}});
  const props={row,accountProfiles:{},replyCounts:{},onRepliesLoaded(){},refreshToken:0};
  h.render(h.LiveThread,props);await h.flush();let tree=elements(h.render(h.LiveThread,props));let more=tree.find(n=>n.props?.className==='sod29-community-more-replies');assert.ok(more);assert.ok(more.props.children.includes('תגובה נוספת אחת'));
  await more.props.onClick();await h.flush();tree=elements(h.render(h.LiveThread,props));assert.equal(tree.filter(n=>n.props?.className==='sod29-community-more-replies').length,0);
  const close=tree.find(n=>n.props?.className==='sod29-community-replies-toggle');assert.ok(close.props.children.includes('סגירת תגובות'));close.props.onClick();tree=elements(h.render(h.LiveThread,props));const open=tree.find(n=>n.props?.className==='sod29-community-replies-toggle');assert.equal(open.props['aria-expanded'],'false');open.props.onClick();await h.flush();assert.equal(reads,2,'reopen uses the already completed public page');
});

test('canonical UserBadge keeps opt-in fallbacks colorful while real images and ordinary callers retain priority',async()=>{
  const {displayAvatarUrl,writerAvatarStyle}=await import('../../lib/avatar.js');
  const h=await harness('../UserBadge.jsx',['UserBadge'],{displayAvatarUrl,writerAvatarStyle});
  const props={name:'כותב',avatarOnly:true,colorfulFallback:true,fallbackSeed:'stable-public-writer',avatarUrl:'https://images.example.invalid/own.jpg'};
  let tree=h.render(h.UserBadge,props);assert.equal(tree.props['data-avatar-state'],'image');assert.equal(tree.props['data-avatar-treatment'],'color');
  elements(tree).find(n=>n.type==='img').props.onError();tree=h.render(h.UserBadge,props);assert.equal(tree.props['data-avatar-state'],'fallback');assert.ok(tree.props.style['--user-badge-fallback-ink']);
  tree=h.render(h.UserBadge,{...props,avatarUrl:'https://images.example.invalid/replacement.jpg'});assert.equal(tree.props['data-avatar-state'],'image');
  tree=h.render(h.UserBadge,{name:'historical',avatarOnly:true,fallbackImage:'/community-avatars/090688eb8d8b7febc9c3.jpg'});assert.equal(tree.props['data-avatar-state'],'image');
  tree=h.render(h.UserBadge,{name:'unsafe',avatarOnly:true,fallbackImage:'/community-avatars/../../private.svg'});assert.equal(tree.props['data-avatar-state'],'fallback');
  tree=h.render(h.UserBadge,{name:'ordinary',avatarOnly:true});assert.equal(tree.props['data-avatar-treatment'],undefined);assert.equal(tree.props.style['--user-badge-fallback-ink'],undefined);
});

test("a guest can only comment (reply-only); a member always sees publish", async () => {
  const replyTo = { id: "11111111-1111-4111-8111-111111111111" };
  // [user, guest, replyTo]: a member always publishes; a guest needs an open reply to publish at all.
  for (const [user, guest, reply] of [[null, true, null], [null, true, replyTo], [{ id: "account" }, false, null]]) {
    const h = await harness("./CommunityLive2029.jsx", ["CommunityLive2029"], {
      PUBLIC_READING_PRODUCTION_ARTIFACT: true, communityActionsLocked: () => false, plainMessageText: value => value,
      useAuth: () => ({ user, profile: {}, isAdmin: false, loading: false, verified: Boolean(user) }),
      useCommunityDraft2029: () => ({ draft: "שלום", setDraft() {}, replyTo: reply, setReplyTo() {}, status: "idle", clear() {}, setHasFiles() {}, reattach: false }),
    });
    const tree = elements(h.render(h.CommunityLive2029, {}));
    const primary = tree.find(node => node.props?.className === "sod29-community-primary");
    // A guest sees the publish-as-guest button only once they are replying to an existing message;
    // a member always sees it. Either way a quiet signup/registration link is also present for a guest.
    const expectPublish = guest ? Boolean(reply) : true;
    assert.equal(Boolean(primary), expectPublish);
    if (expectPublish) {
      assert.equal(primary.props["data-guest-publish"], guest ? "true" : undefined);
      assert.equal(Boolean(primary.props.disabled), false);
    }
    assert.equal(tree.some(node => node.props?.className === "sod29-community-join-link" && node.props["data-guest-join"] === "true"), guest);
    assert.equal(tree.filter(node => String(node.props?.className || "").includes("sod29-community-primary")).length, expectPublish ? 1 : 0);
    // Without an open reply, a guest sees the reply-only explanation instead of a publish button.
    assert.equal(tree.some(node => node.props?.["data-guest-reply-only"] === "true"), guest && !reply);
    assert.equal(tree.some(node => node.props?.name === "website"), guest);
    // A guest never gets to type their own name; every guest comment publishes as plain "אורח".
    assert.equal(tree.some(node => node.props?.name === "guest-name"), false);
    assert.ok(tree.some(node => node.props?.className === "sod29-community-typing"));
    const authLinks = tree.filter(node => String(node.props?.className || "").startsWith("sod29-community-auth-btn"));
    assert.equal(authLinks.length, guest ? 2 : 0);
    if (guest) assert.deepEqual(authLinks.map(node => node.props.children.join("")), ["התחברות", "הרשמה"]);
  }
});
