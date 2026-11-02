# Public-reading account admission

Base: `979c25aa2a91fa96de3a50db8fc93425a183c694`.
Coordination: root BEFORE `5ce04c53-2a9e-46ce-a36d-e6be51e7de71`.
Owner: existing Auth/Person + capability availability, Doc37 ADMIN01–03.

The existing account entry admits password login for an existing account only.
Server Auth settings must enable email. This bounded flow exposes no registration,
OTP/email delivery, OAuth, recovery-mail or new-user creation. Legacy retains its
existing configuration and behavior. This is deliberate: the shared new-user
trigger can still subscribe a newly created account to marketing, independently
of client suppression; no shared trigger was changed here.

Public-reading sessions use per-tab sessionStorage under their own SDK storage
key, with in-memory fallback if storage is unavailable. URL session detection is
closed. Auth.getUser(access_token) must verify a token and return the same UID as
the session before the existing caller-authorized users profile is read. Admin
comes only from that same-id server profile role, never user_metadata. A same-UID
token refresh retains local navigation identity while its admin role is revoked
until revalidation. Different-UID change, logout or failed verification clears
admission; request revisions prevent delayed profiles granting another account's
role. Root runtime lane separately suppresses cloud-sync/autoresume effects.

Login in this profile does not call automatic avatar update, stitchLogin,
claimResearchLead, visitor linkage/activity, founding/daily/WhatsApp credit claims
or referral claims. The existing Legacy conditions are unchanged.

Screen admission is separate from action admission in the existing resolver:
`adminViewAllowed` requires a verified admin and an existing live capability row.
`allowed/blocked` still deny closed operations. Explicit route projections admit
Books/Heichal/ELS screen inspection and show a read-only admin label; inner service
gates can still display unavailable. Life Journey/private workspace/community,
Raziel execution and all unknown admin routes remain unavailable. Missing service
readiness must not be claimed as accepted because the account can authenticate.
The root worker denies writes/models/credits; visual labeling is not security.

Root transport requirements, in the isolated alignment build only:

- GET `/auth/v1/settings` and `/auth/v1/user`.
- POST `/auth/v1/token` with password or refresh_token grant only.
- POST `/auth/v1/logout?scope=local`.
- Caller JWT GET `/rest/v1/users`, exact self ID and existing PROFILE_COLS.
- Public GET `site_flags`, retaining existing bounded pending-read coalescing.
- `/login` document returns account/noindex; OAuth callback stays closed.

No live login, account creation, email, user write, model, deployment or shared
server mutation was performed by this lane. Browser fixtures/negative assertions
are not evidence of a real owner's successful login.

Expanded scoped page controls: Heichal model/run/ordinal/new-research controls and
Book save/add controls are disabled in reading profile, with handler guards before
requests; exact return and public reading links remain usable. ELS shows truthful
readiness without mounting its operational readers/replay/engine hooks. This does
not claim ELS engine acceptance or acceptance of unavailable private services.

Validation: 24 focused/existing tests pass (public-reading admin admission,
shared Auth entry, Auth methods, existing reading release). Includes actual
AuthProvider event handling through a controlled SDK harness, different-account
stale profile, invalid JWT, same-account refresh, missing capability, disabled
controls and direct handler invocation. No live credentials/data are used.
`git diff --check` passes. Combined build/browser/performance are root-owned and
must run after the Home reader exported by the Home lane is integrated.
