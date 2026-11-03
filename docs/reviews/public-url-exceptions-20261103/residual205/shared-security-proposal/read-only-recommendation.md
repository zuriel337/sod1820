# Scoped S2 follow-up — current Post and language-link read boundaries

Status: OPEN. Base: 7360f1d8337e468a69cc061686674d2225d731c4.
Metadata observed: 2026-11-03 15:42:35 UTC, canonical project linswmnnkjxvweumprav.
Root is sole integrator. This review ran no product RPC, negative live probe, private-row read, write, test, build, mail, model or deployment. Only schema/function/ACL metadata was read.

Basic existing-account login/save/edit/refresh/logout/re-login/account-switch flows on 7360 are separately ACCEPTED_USER_REPORTED by the user's latest report. That acceptance does not close the server authorization findings below.

Evidence:
- /tmp/transition-gate-closure-s2-metadata-20261103.json — exact columns, types, defaults, RLS, grants, policies, triggers, signatures, source hashes and definitions.
- /tmp/transition-gate-closure-s2-current-definitions-20261103.sql — exact current function definitions for preparing an object-specific rollback. NOT an executable deployment or approval.
- Existing requirement: docs/2029-security-hardening-gate-plan-v1.md:88–133.
- Existing source distinction: docs/reviews/url-continuity-plan-20261103/source-boundaries-evidence.md. Do not repeat P0/G3 history.

## 1. Publication and ownership semantics already present

public.posts has no status, published, visibility, owner_user_id or user_id column. author/authors are attribution labels, not authenticated ownership.
PostEditorPage.jsx:403–405 defines draft by the exact tag טיוטה; publishing removes that tag. Date, verified, home_hidden, space and source do NOT replace publication status.
publicPostBoundary.js:3 suppresses both טיוטה and פורום from ordinary Post catalogs. These mean different things:
- טיוטה = unpublished draft.
- פורום = an existing public Forum Post route/classification. Do not turn it into private content or exclude it from the database public-read policy.
Legacy getForumFeed explicitly reads posts with פורום in src/lib/contributions.js:337–345.
Do not invent an ordinary-user ownership exception based on author text or source.

Current policies:
- posts_anon_read, SELECT TO anon, USING(true).
- posts_auth_read, SELECT TO authenticated, USING(true).
- posts_admin_write, ALL TO authenticated, USING/WITH CHECK EXISTS users.id=auth.uid() AND users.role='admin'.
The last policy is permissive and already gives verified admins draft read/write access. Preserve it.
Existing authenticated admin_save_post and admin_restore_post_revision check canonical admin role in their bodies. sys_save_post is EXECUTE-granted only to postgres/service_role. post-save Edge source checks a JWT through rd_is_admin before calling sys_save_post; no static token is an authorization factor in the current source. No change to these writers is required for the minimal read-boundary proposal.

## 2. Proven public entrypoints bypassing a posts RLS-only repair

"Proven" here means ACL + SECURITY DEFINER/source metadata establish an executable entrypoint and an unfiltered read. No request using a real draft was sent; no private payload was read.
Do not claim a fresh exploit test or that every warning in the dependency list is a vulnerability.

| Existing entrypoint | Source-proven issue | Caller / Legacy compatibility | Minimal proposal |
|---|---|---|---|
| posts table | anon/authenticated SELECT + USING(true) expose drafts directly | Existing Legacy and 2029 Post readers use this table | Change only the two SELECT predicates to exclude exact draft tag; keep null/empty tags readable and preserve admin ALL policy. |
| redirect_map view | Owner-executed, anon/authenticated SELECT, projects ID/slug without draft filter | Existing URL identity bridge; metadata exposure, not full post-body exposure | Keep columns/URLs/ACL; filter unpublished drafts in this existing view. |
| chat_search_facts(text,integer) | SECURITY DEFINER, anon EXECUTE; returns matching draft title and excerpt/content snippets without publication filter | src/lib/supabase.js:1409–1412; RazielChat.jsx:40; wa-raziel/index.ts:427 | Add publication predicate only to the existing posts CTE; keep text return shape and numeric dossier behavior. |
| cross_source_posts(text[]) | SECURITY DEFINER, anon EXECUTE; text arm returns draft title/slug; graph arm returns post-node metadata without checking canonical Post publication | CrossMethodPage.jsx:148, existing Cross route | Filter existing posts text arm. Gate graph arm by an exact existing canonical Post identity; no title similarity or new graph. Preserve graph-first/text-fallback behavior. If node-to-Post identity is ambiguous, leave that arm unresolved in the proposal rather than claim it sealed. |
| hot_posts_live(integer,integer) | SECURITY DEFINER, anon EXECUTE; returns title/image/slug from page-view join with no draft filter | src/lib/supabase.js:2358–2360; src/lib/hotPosts.js | Add publication predicate to existing join/WHERE; preserve counts/order/shape. |
| name_lab_research(text,integer) | SECURITY DEFINER, anon EXECUTE; posts list and its count have no draft filter | src/lib/supabase.js:3883,3902; NameJourney/NameLab | Filter both existing posts count and list. Leave other domains untouched. |
| number_dossier_json(integer) | SECURITY DEFINER, anon EXECUTE; returns draft Post titles referenced by verified/published gematria rows | src/lib/supabase.js:1215; ai-analyze existing number context | Add publication predicate only to existing posts subquery. Preserve all other sections and the number_dossier wrapper. |
| post_conversation_projection(bigint,integer) | SECURITY DEFINER, anon EXECUTE; resolves any Post and projects its public-status comments without checking Post publication | Existing public discussion endpoint; no direct app caller found in inspected source | Gate the initial exact wp_id Post lookup by publication. This is a parent-visibility gap, not evidence that it returns the draft Post body. Preserve approved public comments and Forum Posts. |

Exact current definitions and source hashes for all six named RPCs are in the attached SQL/JSON.
posts_by_number_strict is SECURITY INVOKER: it will inherit the corrected table RLS, so do not rewrite it solely because it lacks its own draft predicate.
video_media_placements_v1 is security_invoker=true and already explicitly excludes drafts/ordinary-forum placement; preserve it.
The metadata appendix lists count/statistics and admin functions referencing posts for completeness. Those were not promoted into new findings or a broad rewrite.

## 3. Smallest Post predicate and isolated acceptance

Existing status predicate, not a new database function:
    NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה']::text[])
For function aliases use p.tags. Array overlap preserves null/empty-tag reads, including arrays containing nulls. Do not substitute verified=true, home_hidden=false, space='core' or the combined catalog suppression tags.
The proposed DDL is just ALTER POLICY for the two reads, CREATE OR REPLACE VIEW for redirect_map, and surgical predicate edits to proven existing definer readers. Keep signatures, return types, public links and owner/write policies. No new table, engine, migration deletion, row mutation or mass grant changes.

Root can test in its isolated Postgres harness with synthetic rows only:
1. Published ordinary, published Forum, draft ordinary, draft Forum, null tags, empty tags, null array element, same title with different exact IDs.
2. anon and ordinary user see public ordinary + public Forum, never either draft.
3. Verified admin can still list/edit/save/restore drafts through existing authorization; wrong user/non-admin cannot write.
4. Direct table, redirect_map and each affected SECURITY DEFINER entrypoint reject the synthetic draft; title/excerpt/content/image markers never appear.
5. Cross graph and text arms preserve exact identity, fallback and duplicates behavior, including a withdrawn Post.
6. Numeric dossier/calculations stay equal for published inputs; no new model or notification calls.
7. Apply twice, compare schema/object changes, compare unchanged public fixtures, capture diff and rollback; no live tests needed to prepare the proposal.

## 4. lang_links_list — actual current behavior and compatibility boundary

Exact current function is LANGUAGE SQL SECURITY DEFINER SET search_path='public', default VOLATILE, and only:
    SELECT * FROM public.language_links
    WHERE status='approved'
       OR (p_visitor IS NOT NULL AND p_visitor<>'' AND created_by_visitor=p_visitor)
    ORDER BY (status<>'approved') DESC, created_at DESC LIMIT 500;
No function calls, DML, network or notifications occur in this body, and language_links has no user trigger.
Therefore do not call the current function side-effecting merely because its volatility is VOLATILE or old guards conservatively deny it. No function was executed to test this.

Actual problem: unverified caller-supplied visitor selects pending AND rejected rows. SELECT * also exposes created_by_visitor and reviewed_by on approved rows.
Direct language_links SELECT is already not granted to anon/authenticated and there are no read policies. Keep that boundary.

Existing legitimate callers:
- LanguagesPage.jsx:87 passes getVisitorId() and shows both approved and own pending rows.
- LanguagesPage.jsx:100–106 submits via lang_link_add, then promises “אתה כבר רואה אותו למטה” and reloads.
- langLinksPending and langLinkReview are separate authenticated RPCs whose bodies check canonical users.role='admin'; preserve these.
- getRecentEnglishWords (supabase.js:1031) and getLanguageLinks (supabase.js:4188) pass null and only need approved links.
- public-reading-deploy/transport.js:93 accepts ordinary null-visitor shapes and rejects arbitrary visitor queries; this is useful defense but not direct Data API authorization.

No usable verified visitor capability was found in this existing path:
- visitorId.js creates localStorage sod_vid in the browser; it is not a server signature or ownership proof.
- link_visitor_identity(text) checks auth.uid() exists, but trusts arbitrary p_visitor and overwrites user_id/email on conflict. Joining this table would not prove historical row ownership.
- resolve_visitor_email is a resolver, not ownership proof. Do not use email/name matching for authorization.
- No signed visitor-session verifier appeared among the inspected visitor/session/capability primitives. Do not create a new identity system in this task.

Exact fail-closed recommendation for a separate approved shared change:
A. Retain lang_links_list(text DEFAULT NULL) and SETOF public.language_links for Legacy compatibility. Return only status='approved' to ordinary callers; ignore p_visitor for private-row selection. Keep existing public source/display-name credit and language fields, set created_by_visitor and reviewed_by to NULL in the public composite projection. Use a fixed safe search_path and declare STABLE because this exact new body is a pure read.
B. Preserve lang_link_add behavior and pending storage; keep admin pending/review RPCs and their checks. Do not auto-approve or erase pending/rejected rows.
C. Change LanguagesPage success text truthfully to “נשמר וממתין לאישור; יופיע לציבור לאחר אישור”. The old promise of immediate persistent own-pending listing would no longer be true.
D. If immediate pending-owner retrieval must remain, this is MISSING_INTERFACE_VERIFIED_LANGUAGE_LINK_OWNER. An existing signed capability or verified owner-bound field must be established by the identity owner first; do not fabricate it from visitor strings or use service-role in the browser.

This compatibility change affects the currently live Legacy Languages page and requires an exact shared-server approval, even though approved public Number/Home links remain intact. Root should keep it a precise separate proposal. It is not covered by the held Auth/mail b21 changes.
Synthetic isolated tests: null/absent/empty/arbitrary visitor all return identical approved set; both normal signed-in users cannot fetch another pending/rejected row; public visitor/reviewer IDs are NULL; admin pending/review still work; signature and public credit unchanged; list has no writes; add leaves pending; expired/spoofed JWT gains no private read.

## 5. Rollback and stop conditions

Before any future authorized apply, compare current object hashes/policies/ACLs to this snapshot. If drifted, stop and inspect only drift; do not overwrite.
Capture a real object-specific rollback using the saved CREATE OR REPLACE definitions and existing two USING(true) policy definitions. Preserve function owner/ACL/signature/volatility/search_path; CREATE OR REPLACE does not justify new grants or DROP CASCADE. No row/data rollback or deletion is required.
Restoring the old read policies/body also restores the known authorization exposure; that is a security rollback decision, not a default automatic repair. Prefer retaining the fail-closed filter while correcting a compatibility defect.
No shared changes applied. No S2 pass claim. H1/A3/SW evidence and user-reported account acceptance remain untouched.
