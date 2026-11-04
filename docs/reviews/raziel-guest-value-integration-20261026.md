# Raziel guest value journey — central integration acceptance

Status: integrated on the isolated central branch; protected Frontend-only,
synthetic Preview authorized. No main, Production, product DB/RLS, Edge Function,
research-run, WhatsApp wording or link-request routing release is authorized.

## Inputs and inclusion

- Central branch: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
- Central base: `18848029f3a32cba1a45a3035344ed56eb01415b`.
- Source: `codex/raziel-guest-value-integration-20261026` at
  `4203f9bb970a8a98e5fb9ae16d57a709a6e1d0ca`.
- True central merge: `24225a85722edd23479aa25b6f66a6ae68e8d3ac`.
- Its first parent is the exact central base, its second parent the exact source.
- Source already contains `9bc75b2d37bc68eb577707445c25740fb523d3de`.
  No cherry-pick, replay or duplicate guest implementation was performed.
- BEFORE: `c79a2afa-ae5a-4860-8bf6-5a1d96e7d201`, passive GPT → ZURIEL.

Remote source/central/main, canonical read-only access and current v17 coordination
were verified. The original guest writer and the overlapping personal-area writer
both released their paths. Existing domain/presentation owners are extended;
no new owner, visual design, Provider, session, transport, API or store was added.
The previous shared safe-action registry/router fix and saved conversations remain.

## Product boundaries verified

The existing conversation is available immediately to a guest. The existing
personal-area signup entry is offered after an answer, never before value.
Opening it does not invoke a model. Only an existing `sod:ai-quota` event with
`tier: anon` during an explicit chat action closes the guest composer. An unrelated
event outside that action, and an in-flight non-anonymous quota event, do not.
There is no local answer counter, inferred limit, quota storage, credit charge
or second quota owner. Principal changes reset the presentation through the
existing Auth/Research/session boundaries. Local saving still works after denial.

The source's test updates replace obsolete blanket “no useEffect” assertions with
an exact identity-reset effect assertion and continued prohibitions against I/O
inside it. They do not remove engine, privacy or explicit-submit checks.

## Acceptance evidence

- Broad suite on unchanged central base: **598/602**.
- Same selection after merge: **598/602**, identical four failures.
- Final broad suite with one additional mock-denial test: **599/603**.
- Focused session/saved-session/frame/Workspace/server-seam/private-sync tests:
  **156/156**.
- Preview mock transport: **5/5**; existing Preview Auth Guard: **4/4**.
- System Frame, My Workspace, hard isolation, cheap hardening, public language
  (**3/3**), Legacy research containment and Legacy Production Lock: PASS.
- `npm run build:2029`: PASS, existing chunk/dynamic-import warnings only.
- Normal built graph: eager gzip **384,353 bytes**, recovered **74,389**
  (required minimum **12,288**); request builder/Research Plan remain lazy.
- Mock Preview graph: eager gzip **381,907**, recovered **76,835**.
- `git diff --check`: PASS.

Known failures, independently reproduced on the exact base and not suppressed:
two phase-J public Post/Topic readers, phase-M Post-source Golden, and the old ELS
static expectation of an `askRaziel` call inside SystemFrame rather than the one
shared provider. None is a new guest-journey failure; none is reported as passing.

Chromium against the actual normal build passes at **320/1440**: immediate entry,
post-answer signup, zero-call account entry, unrelated/non-anon quota negatives,
server-owned guest denial, local save after denial and synthetic account/sign-out
reset. Auth changes use the existing client's cross-tab notification with invalid
synthetic credentials. All external traffic is intercepted; no real account,
private data, model call or product write is used.

The saved-conversation browser regression passes center-first entry, continue,
rename, id-preserving repeated save, confirmed deletion and empty/mobile states
with zero model requests.

The actual Preview worker and compiled app pass **320/390/1440 ×
light/parchment/dark**: safe suggestions, explicit idempotent save, signup after
value, zero-call personal-area entry, same-document number navigation preserving
an unsaved turn, explicit synthetic quota denial and local save afterwards.
No page errors, horizontal overflow or real backend/model requests. The browser
waits for the destination Frame and its route-close effect, not just the early
URL mutation. Number payloads remain empty fixtures; this is not live dossier
or language-quality acceptance.

## Hosted Preview and release boundary

Use the existing branch-exact `preview-deploy` build only. The unchanged builder
selects the mock-only variant for this exact Git branch, rejects Production and
stamps `/preview-identity.json` with the final Git SHA. The acceptance-only worker
adds an explicit `בדיקת מכסת אורח` fixture; it does not count requests or invent
limits, and normal questions remain unaffected. All replies visibly say test data.
The actual backend is never invoked by the demo; new Person and product writes
remain blocked. Existing deployment protection must remain enabled.

The exact final SHA/deployment ID/URL and hosted verification belong in the passive
AFTER record and user handoff after committing/pushing. Do not label local browser
evidence as hosted acceptance. No live signup, private sync, quota entitlement or
real-model quality acceptance is claimed by this synthetic Frontend test.

Stop after the protected exact-SHA Preview and release all ownership. No next
slice, WhatsApp change, Edge deployment, main merge or Production action follows
automatically. The separate SG runtime-OIDC candidate remains outside this batch.
