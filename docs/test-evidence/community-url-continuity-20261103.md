# Community URL continuity — scoped implementation

Date: 2026-11-03. Branch: `gpt/2029-url-community-20261103`.
Base: `9d3a09689a05bd0b72ca484335c1fbce8b538170`.
Status: **IMPLEMENTED / FOCUSED_UNIT_TESTED**. Browser, hosted transport and actual-service acceptance remain open.

Scope follows the existing Community/Person/Experience owners and the URL-continuity plan F06–F10. The root integrator holds the route, release-profile, metadata, transport and server changes. No database, auth policy, shared capability policy, migration or deployment is included here.

## Read and action boundary

- `CommunityChatTransition2029Page` mounts the existing public community reader instead of closing the entire page. The old community preview page uses the real reader in the public reading profile.
- `publicLaunchActionsLocked(isAdmin)` still controls mutations and account functionality. Locked readers do not mount the composer, attachments, live reactions, account/claim entry, avatar editor, subscription or private-inbox controls. The message-action hook does not request ownership or mutate. Notification polling, contributor private capability probes, reading history writes and saves are also suppressed. Existing verified-admin behavior still uses its existing server checks; the guard grants no role.
- Community reader defaults use the existing anonymous `getPublicResearchClient()` only in the read-only launch profile. Other build profiles retain their existing session-client behavior. Reader injection is carried through all pagination/count calls. Existing RPC admission, fallback status/origin filters, public person rules and source IDs are preserved.
- The recursive root reader still previews two direct replies. New messages retain `community_2029`; historical messages retain `openweb`. Reading archived conversation is not research admission, an independent source claim, or permission to expose a private dossier.

## Exact navigation

- New member and claim links use `/community/chat`. Historical `/2029?preview=community&data=live&member=…` source links remain recognized.
- Community navigation preserves `thread`, `reply`, `path`, sort/source sort, search, repeated parameters and inert hash through cards, filtering and return links. Access grants are removed using the existing URL sanitizer. Existing private-inbox return validation is retained.
- The existing safe share helper already emits canonical `/community/chat` links using the public reader's established ancestry; its deliberate removal of account/inbox/access state is preserved.
- Malformed, cyclic, mismatched and oversized thread paths fail explicitly. An invalid exact request does not become the general feed. A changed destination does not render a previously loaded root. Retry for an unavailable reply repeats the same parent/child lookup instead of displaying other replies.
- `#legacy-chat` and OpenWeb/Spot.IM query context reach the history status. No guessed mapping is made between an external OpenWeb message selector and an imported message UUID.

## OpenWeb boundary

The existing `useOpenWeb()` loads a third-party launcher and calls the existing `openweb-sso` function for authenticated users. It is not a read-only transport. Under the launch lock, the bridge does not mount that conversation, iframe or SSO hook. The same-domain “open the conversation” link is removed from this state because it could loop back to the same route. The bridge explains that only history available through the existing public reader is shown above, and that a particular source-side message is not thereby proven available.

The live external conversation and exact source-side selectors remain **NOT SERVICE-ACCEPTED**. This implementation does not claim that every imported or original OpenWeb message is public or available.

## Focused verification

`communityPublicReading2029.test.js` transpiles the changed component/effect bodies with Vite/Oxc and executes them with isolated hooks and transport spies. It checks the guest, ordinary account and admin branches; forbidden widget mounts and requests; exact reply retry; anonymous default reads; ordinary-build compatibility; and suppression of saves/history/private summaries. It is a unit test, not browser acceptance.

Additional tests cover canonical and historical member links, full ancestry shares, query/hash/return continuity, malformed paths, authoritative empty/denied public reads, tombstones, two-page count injection, attachments, owner-action responses, account-switch isolation, refresh anchors, existing public author activity and person projection.

Command:

```sh
node --test src/components/community2029/communityPublicReading2029.test.js src/lib/community/communityArchive.test.js src/lib/community/communityPersonNavigation.test.js src/lib/community/communityMessageShare.test.js src/lib/community/communityRefresh.test.js src/lib/community/communityMessageActions.test.js src/lib/community/communityAttachments.test.js src/lib/community/writerCommunityReuse.test.js src/components/contributor2029/loadCommunityPerson2029.test.js
```

Result: **67/67 tests passed**. Eight changed JSX files were parsed with `transformWithOxc`; `git diff --check` is clean. No browser run or full build was performed in this lane.

## Root integration and remaining acceptance

The integrator must wire the existing `/community` service entry, `/community/chat`, historical chat aliases and `/2029?preview=community…` to the intended existing community surface while retaining search/hash. The public route classifier and HTTP route resolver must admit public reads without admitting actions.

Read requests still use `community_feed_page`, `community_message_context`, `community_replies_page`, `community_reply_counts` and the existing anonymous table reads for public message/person credit and user display fields. Public writer overview remains the existing `/api/contributor-public-overview` reader. Hosted transport must admit only its existing read operations; an RPC error/denial must stay an error/denial.

F10 forum and post-comment routes remain the root integrator's separate exact-source/status work. They are not relabeled as community archive messages. Live RLS/HTTP behavior, history availability, actual OpenWeb selectors, mobile layout, media, keyboard/browser back-forward and authenticated admin workflows require the root's permitted integration acceptance.
