# Media + YouTube — review evidence (11.11.2026)

Branch `media-intake-youtube-world-2029`, PR #1303. Read-only checks against the live project `linswmnnkjxvweumprav`.
This is evidence and a proposal for existing owners, not a new contract. No DB, Edge Function or Production change.

## 1. World post cards and YouTube — bounded extension of an existing reader? (decision item 5)

The World reader (`src/lib/research/worldDiscoveryStream.js`, `fetchWorldDiscoveryStream`) reads 32–80 posts per open with
`id,slug,title,excerpt,author,source,link,wp_id,categories,tags,image_url,thumb_url,home_hidden,date,modified,created_at`.
A post's YouTube link lives only in `posts.content`.

| Measured 11.11.2026 | Value |
|---|---|
| average `posts.content` length, all posts | 16,909 chars |
| average, the 24 most recent posts | 10,700 chars |
| largest post | 481,702 chars |
| recent 24 posts that contain a YouTube link | 1 |

Adding `content` to that read would add roughly 0.3–1 MB to every World open for one card in 24, against the media
performance map (no heavy payload before intent). **No bounded extension of an existing public reader is justified.**
What exists today without new data: the post page itself renders its authored video, and the Golden projector shows the
post's own videos through the shared click-to-load card (post reader + `isPublicPostReadingSource`). A card-level YouTube
preview in World needs a light server projection of the post's video id (for example the already-proposed
`supabase/proposed/20261106140000_def003_video_assets_materialized.sql`) — a separate DB decision, not taken here.

## 2. Permission audit — which WhatsApp group messages can reach World (decision item 6)

Live definition of `public.world_group_source_arrivals_v2` (md5 `473ea5b4613fcf45b7dee3e2d8984715`, SECURITY DEFINER,
`anon`/`authenticated` EXECUTE). A row is returned only when ALL of these hold:

| Gate | Clause (live) |
|---|---|
| approved public group source | join `channel_ingest_sources s` with `s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria','blaze-888')`, `s.enabled`, `intake_mode <> 'off'`, `s.chat_id = g.group_chat_id`, `s.chat_id like '%@g.us'`, `<> '__ALL__'` |
| per-message proof of origin | join `channel_update_group_proof g` (`g.update_id = cu.id`, `cu.ext_msg_id = g.ext_msg_id`, `g.held_at is null`) |
| proven writer identity | `g.identity_basis = 'verified_phone_unique'`, `c.id = g.identity_contributor_id = cu.contributor_id` |
| authorised writer | `c.active`, `c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')`, `dossier_settings.general_feed_enabled = 'true'` |
| intake flag + lifecycle | `cu.group_source_intake_public is true`, `cu.source = 'auto'`, `status in ('live','private')`, not expired, not `mail_` |
| text only, no media, no contact cards | `image_url is null and thumb_url is null`, non-empty text, no vcard / wa.me / chat.whatsapp.com |
| redaction | every address → `[קישור]`, e-mail → `[דוא״ל]`, phone-like runs → `[מספר]`, 1,200 chars |

Direct table access (live): `channel_update_group_proof`, `channel_ingest_sources`, `contributors` — RLS on, no `anon` /
`authenticated` SELECT. `channel_updates` — RLS on; public read only `status = 'live'` and not expired (`cu_public_read`);
World group channels ingest as `private`, so their rows are not readable directly. `record_channel_update_group_proof_v1`
— SECURITY DEFINER, no `anon`/`authenticated` EXECUTE (service role from the ingest only). The ingest sets the public flag only
for World group channels, incoming (not outgoing), media-free, `@g.us` chats; any proof failure leaves the row without proof.
Client side, `groupRowToWorldUpdate` again requires `group_proof === true`, `proof_basis === 'verified_phone_unique'` and the
approved writer list.

**Finding — the repo migration is stale.** The live function is stricter than `supabase/migrations/20261008190000_*` (the
ingest-source join, `held_at`, the writer allowlist, `general_feed_enabled`, the contact-card filter and the `group_channel`
column were added live). The first version of the YouTube proposal was built from that stale migration and would have dropped
those gates; it has been rebuilt from the live definition and a test now fails if any live gate is missing from it.

**Proposal (not applied):** `supabase/proposed/world_group_source_youtube_links_v1_PROPOSAL.sql` changes only the address
redaction so a canonical YouTube address survives; every gate above is byte-for-byte the live one.

## 3. Audio in series — extension of the existing series approval (decision item 7)

Today a series source is admitted only through an explicit approval entry in
`src/lib/research/contentSeries2029Identity.js` (`approvedSources: { sourceRef, channel, publicAssetId, decisionRef }`), and
`contentSeries2029Projection.js` requires the row to be live, the media to pass `publicNowMediaHref` and the asset
(`video_media_assets_v1.public_id`) to match — i.e. video only.

Proposed extension (same owner, same approval, no automatic publication):
- an approval entry may carry `mediaKind: "audio"` with `publicMediaRef` = the canonical object address of the approved file
  (`publicStorageMedia(...).canonical`, which for 2029 paths also carries the asset id) instead of `publicAssetId`;
- the projection admits it only when the row is the exact `sourceRef`, live, not page-only, not expired, and
  `publicStorageMedia(row.image_url)` has `kind === "audio"` and the same `canonical` (a version key never changes identity);
- the item renders the shared audio element (as Now / Or HaGeula); nothing is added to a series without a new
  `decisionRef` from ZURIEL. No code is merged for this until the extension is approved.

## 4. Correction in the ingress convention (decision item 8)

`docs/sod1820-media-ingress-storage-convention-v1.md` said the package does not "fetch WhatsApp attachments". The channel
ingest does fetch channel attachments; the section now states exactly where they land (public 2029 path only for the
`or-geula` live channel, `submission-inbox` otherwise) and that nothing is promoted automatically.

## 5. Projector browser check (decision item 9)

The real `ProjectorMediaCards2029` (the component `GoldenProjectorModeLayer2029` renders in both מנהל and ציבור modes; it holds no mode branch and no admin payload) was bundled with a stand-in post reader that returns three posts: a published post embedding `ttF4-G5OCJU` as an iframe, a published post linking `aaaaaaaaaaa` (YouTube refuses to embed it), and a private-stage post. It ran in Playwright Chromium and in Google Chrome (headless) against the real youtube-nocookie player.

| Check | Result |
|---|---|
| No iframe before a click | 0 iframes; both cards show the thumbnail cover |
| Source shown on the card | the post title + "סרטון שמוטמע בפוסט המקורי" |
| After a click | iframe `https://www.youtube-nocookie.com/embed/<id>?rel=0&autoplay=1&playsinline=1&enablejsapi=1&origin=…` |
| Embeddable video | player `onReady`; stream requests to googlevideo.com answered 200; player state stays 3 (buffering) in both browsers. **Actual playback (state 1) was not reached from this sandbox** — not verified; it needs a check on a real device |
| Refused video | player `onError:150` → the card switches to "בעל הסרטון לא מאפשר לנגן אותו כאן…" with the way-out link |
| Private-stage post | nothing rendered |

Defect found and fixed: the way-out link used the address found in the post, so a post that embedded an iframe sent people to `youtube.com/embed/<id>`, which refuses again. Video links now carry the provider's own watch page (`watch`: `https://www.youtube.com/watch?v=<id>` / `https://vimeo.com/<id>`), and the card uses it; covered in `src/lib/community/messageLinks.test.js`.

Not done: a signed-in admin session in the real site (no admin credentials in this session). The component is identical in both modes, so what remains is the projector layer around it.
