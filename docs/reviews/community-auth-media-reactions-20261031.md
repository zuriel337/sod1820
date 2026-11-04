# Community shared Auth, publishing and media — 2026-10-31

Branch `gpt/community-auth-publish-media-20261031` extends verified base `996ca1f3cddbaf0591615ac2d7726ccb1922019e`. This is a stacked branch/Preview change; Production remains Legacy and main is unchanged.

## Result

`AccountEntry2029` is the shared entry for the 2029 login page, Community sign-in and existing Frame account panel. Public Supabase Auth settings supply enabled methods, including future federated providers; variants affect presentation only. The existing Auth/Person/Workspace remain authoritative. Canonical `canonical_ui_components_law` v12 (`c245a170-7fa3-469a-8ae2-17ea4ca3c928`) supersedes v11 additively, preserving its full description, dependencies and metadata.

Google, Facebook and email are enabled in live public Auth settings. Preview social login remains unavailable until the Auth owner verifies both the exact redirect origin and existing-account-only behavior. There is no Auth configuration update tool in this session. Configure the verified redirect in Supabase Auth URL Configuration and, only after verification, set central non-secret `VITE_AUTH_VERIFIED_PREVIEW_ORIGINS` to a JSON list of exact HTTPS origins. Do not use wildcard origins or a Production fallback. No page-specific provider list is needed. Email/password and existing-account OTP use the existing Preview contract.

The explicitly authorized Preview branch now admits only scoped authenticated Community publish, positive reaction and new-file upload transports. Other product writes, automatic Person creation and model calls remain blocked. The server remains the authorization boundary. Normal likes use the existing RPC; failures roll back and late results from another account are ignored.

Attachments support MP4/WebM/MOV up to 50 MiB, and existing images/documents up to 8 MiB, with at most three files. New uploads use `gallery/community/<verified-auth-uid>/<random-uuid>.<ext>` without overwrite. Native video uses controls, metadata preload, no autoplay and a fallback link. Browser playback depends on the file's codec. A failed publish retains the draft and reuses an already uploaded file when retried.

Live migration `20261031090008_community_authenticated_media_paths_v1.sql` adds only a restrictive INSERT policy for the account-scoped Community paths and native video. It does not widen existing bucket permissions or change global bucket MIME/size settings. Legacy flat image/document paths and non-Community gallery uploads retain their existing contract. MIME/size checks are enforced by the UI and the scoped Preview transport; direct Storage service-wide MIME/size limits were not added.

OpenWeb contains 41,125 imported rows; 32,191 have captured historical dislike counts and 10,830 have nonzero dislikes, totaling 27,618. These remain read-only historical counters. The current reaction RPC supports five positive emoji and no new downvote. No counts or imported content were rewritten.

## Verification

- 105 Node tests, including shared entry delegation, provider discovery, safe returns, attachment validation, reaction preservation, personal navigation and Preview guards.
- Isolated PostgreSQL: 12 new Storage policy assertions and the existing public reaction ancestry/Auth/denial-atomicity suite pass. No live product data was used.
- Built local browsers: 17 Auth cases across 320/360/390/1440 and three themes; 47 message action cases; three publishing/media/reaction scenarios; account panel failure/retry/switch/refresh/logout and integrated login return at 390/1440. External services were intercepted with synthetic fixtures.
- `build:2029`, integrated build, built graph/lazy, isolation, hardening, Workspace and Legacy lock pass. Existing chunk warnings remain.
- Live read-only verification: public Auth settings, restrictive policy/history, contract provenance and security advisors. Advisor categories remain the same six pre-existing categories; unrelated findings were not modified.

The completion receipt records the exact remote commit, draft PR, protected deployment ID/URL/SHA and hosted guest checks. Hosted verification does not authenticate as a real administrator or submit messages/files/reactions. The user performs their own authenticated acceptance. No main merge, Production/Edge deployment, role promotion or identity merge.
