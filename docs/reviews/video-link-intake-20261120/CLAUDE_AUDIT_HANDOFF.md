# SOD1820 #1448 / PR #1452 — Claude independent audit handoff
Date: 2026-11-20. Owner approval scope: isolated code and tests only; no merge, SQL, Edge deployment, Vercel aliases, or Production mutations.

## Goal
Automatic meaningful public video-link recognition and canonical title ingestion for "Now" and "World"; YouTube regular/Shorts/Live, TikTok canonical/short and Vimeo. Video links are text sources, not binary video files. Never show bare action names ("עדכון", "וידאו", "תמונה") as source titles. General websites and article metadata are a following contract extension and are not claimed complete here.

## Exact review target
GitHub PR https://github.com/zuriel337/sod1820/pull/1452, branch gpt/issue-1448-video-links-rebased-20261120. Review the **current PR HEAD SHA**, not previous intermediate SHAs. A previous PR #1449 was intentionally closed to avoid rebase overwrite.

## Confirmed read-only observations
- Existing public.channel_updates schema contains seo_title, thumb_url, enrichment_source, enrichment_status (NOT NULL, DEFAULT 'pending'). Do not add explicit nullable insert values. Existing wa-channel-ingest has been restored to main (no modified ingest file in final PR).
- 14-day search as of 20 Nov showed 8 channel messages with provider links, 4 live and 4 private; none had seo_title. Four of these are Or-Geula YouTube/live Torat-Haremez playlist; remaining rows include private TikTok and group YouTube.
- Existing cron job 132, video-map-enrich, active every 30 min. Deployed wa-video-enrich previously processed only media whose image_url was MP4. This PR extends its code, but has NOT deployed it.
- Public group RPC world_group_source_arrivals_v2 is SECURITY DEFINER; source text sanitizer preserves certain canonical YouTube URLs but strips TikTok to '[קישור]'; v2 does not return seo_title. Its live definition MD5 at audit: 3e736b69cde787e8cce20f19eb08753a (verify again before DB proposal). This remains an open World upstream gap — no unsafe SQL changes included.

## Changes to review
- supabase/functions/wa-video-enrich/index.ts: strict provider-link detector, fixed oEmbed endpoints, timeout, size bound, fails to retry_metadata, server-side persistence of exact source title and optional thumbnail; must verify provider HTTP and security, especially TikTok short-share URL and Vimeo.
- src/lib/research/systemFeedPublicSources2029.js: authoritative title choice from seo_title; preview poster only from trusted CDN with known enrichment provenance; existing source identity and public state unchanged.
- src/lib/nowPublications2029.js: never treat generic media/activity labels as a proper title.
- src/components/experience2029/NowPublications2029.jsx: TikTok outbound link; text-only Or Geula preserves link without image/player, including YouTube.
- src/lib/community/messageLinks.js: validated TikTok links; no arbitrary iframe.
- src/lib/research/worldGroupSource.js and World public components: canonical YouTube/TikTok sources and title-needs-enrichment; not a DB gate bypass.
- tests in test/group-sources-now-2029.test.mjs, test/group-source-media-2029.test.mjs, test/system-feed-public-sources-2029.test.mjs, test/now-publications-2029.test.mjs and messageLinks.test.js.

## Required audit checks (fail closed)
1. Examine every security-changing regex for exact host matching, malformed URL, username/password, query token, fragments, ports, redirects, SSRF, and PII. Ensure no private group row is exposed; v2 controls may not be weakened.
2. Validate the oEmbed request with bounded stream reads (not only Content-Length) and provider content-type/JSON. Prevent infinite retries or third-party calls per card/view. Confirm provider short-link title behavior; mark Unknown when unavailable.
3. Confirm public channel rows and already-authorized group rows use separate admission paths, preserve sourceRef and writer proof, pins, chronology and content.
4. Test 8 types: YouTube watch, Shorts, Live, playlist, TikTok full/short, Vimeo, private source, malformed URL; plus screenshots of World and Now, including mobile and Or Geula text-only.
5. Verify CI on the exact HEAD, including hard-isolation, release-contracts, mobile/visual, G4, SEO and performance budget without raising thresholds.
6. Propose a separate guarded SQL/reader change for source video links and seo_title in World. Do not execute SQL without explicit approval. Must preserve the exact v2 proof/held/public-media checks, server-side redaction and source identity. Existing private group content cannot be automatically made live.
7. Validate review-before-release plan: one explicit merge approval for SHA, separate Edge deployment, and separate website deploy/canary/alias approval. No automatic deployment.

## Known non-closure
This draft is not a production fix until the Edge worker is deployed, historical pending rows are run/verified, the World RPC title/link gap is closed safely, and all release tests and frontend acceptance pass. A YouTube playlist is not identical to a single-video watch link; do not label it verified video metadata without explicit playlist support. Do not call a status of 'pending' a successful title extraction.

## Handoff format
Return PASS / FAIL / UNKNOWN for each check with code path + evidence; identify blockers versus suggestions. Do not modify main/DB/Production. If proposing corrections, submit a small separate PR or annotate #1452; avoid concurrent writes to files owned by another active session.

## Subsequent review additions
- Optional, **not deployed** SQL draft at `supabase/proposed/world_group_source_video_titles_v3_REVIEW_ONLY.sql`. It wraps the existing authorized v2 result, returns only narrow canonical TikTok link and known provider `seo_title`, and intentionally revokes all new EXECUTE permissions. Claude must audit SQL syntax, private metadata containment, role ownership and test coverage before any approval. No frontend switch to v3 occurs here.
- The metadata worker now enforces a 32 kB **streaming** byte cap, 4.5-second timeout and JSON content-type. Verify edge compilation and oEmbed provider behavior rather than assuming success.
- The Now reader admits poster URLs only from a strict provider CDN and only with trusted `*_oembed` provenance and title; no arbitrary external image hosts.
- Release requires re-checking main divergence and all CI on the exact final SHA, which changes with any of these edits.
