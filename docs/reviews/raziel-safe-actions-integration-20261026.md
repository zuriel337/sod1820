# Raziel shared voice and safe actions — central acceptance

Status: branch-only integration; Frontend-only mocked Preview authorized. No main,
Production, product DB/RLS or Edge Function deployment is authorized by this slice.

## Exact inputs and inclusion

- Central base: `20bdd98be93f8c7cd6e8dcca628100bded16f460`.
- Source: `gpt/raziel-safe-suggested-actions-v1-20261026` at
  `6fc0704a79c33d6ed1b16e9705db7f1c5be36bbf`.
- Source commits, in order: `b75ae4cc`, `621a4b26`, `6fc0704a`.
- Isolated integration: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
- True merge: `b6c2bc1fa57c13b65de0fd22e21f0a5545008b82`, with central and
  source as its two parents. No conflicts, cherry-picks or duplicate application.
- Coordination BEFORE: `096dc697-1c8d-4a5b-97bb-0ed25449d607`.

The complete source contains the site's and WhatsApp's shared warm, quietly
accurate wording, the server-owned suggestion registry, its consumer and tests.
"Voice" here means conversational wording, not speech synthesis. Server changes
are included in Git only; this acceptance does not release them to live channels.

## Acceptance correction

The source's safe number action used `location.assign`. The actual compiled app
reproduced a full reload that discarded an unsaved conversation. The integration
uses the existing React router's `useNavigate` instead, preserving the same
allowlisted number URL, shared provider and unsaved turns. No SystemFrame,
ResearchProvider, session provider, ELS/Journey runtime or research-run change.

The server-seam test also supplies malicious actions with valid action IDs but
wrong subjects/number URLs. The server replaces them with canonical suggestions;
model-supplied URLs are not promoted into executable actions.

## Verification

- Source-focused tests: 98/98; strengthened server seam: 68/68.
- Router/fixture regression: 15/15; existing/new Preview guards: 8/8.
- Workspace/sync contracts: 45/45; quality matrix: 39/39.
- Broad independently selected Raziel/ELS regression before the four new mock
  tests: 587/591. The same four failures reproduce on the unchanged base
  (585/589); they are not counted as passing or suppressed.
- Normal `build:2029`, lazy/eager/built-graph, hard isolation, cheap hardening,
  My Workspace, SystemFrame, Legacy Production Lock and diff checks pass.
- Normal build: eager gzip 385,802 bytes, recovered 72,940 bytes (minimum 12,288).
- Mocked static Preview build: eager gzip 383,297, recovered 75,445 bytes.
- Chromium: 320/390/1440 × light/parchment/dark. No horizontal overflow or page
  errors; action targets at least 44px; save requires a click; repeat save stays
  one saved conversation. An additional unsaved question survives number-page
  navigation in the same document. Opening and management use zero model calls.

The four base failures are two public Post/Topic reads in phase J, a Post source
expectation in phase M, and a static ELS assertion expecting `askRaziel` inside
SystemFrame rather than its existing shared session provider. Their evidence is
retained; no public reader or provider boundary was widened to satisfy them.

## Frontend-only Preview contract

The opt-in `SOD_RAZIEL_SAFE_ACTIONS_PREVIEW=true` variant, also selected by Vercel
Preview on this exact isolated Git branch, rejects Vercel Production. Vercel's
repository buildCommand overrides the deployment-level command, so exact Preview
branch selection is necessary; an ordinary/default build is not mock acceptance.
It builds only `preview-deploy`
static assets, without root API handlers or Edge deployment. Production routing
and domain aliases are untouched.

The actual existing Preview worker intercepts Raziel requests with explicit
synthetic responses. Suggestions are generated using the actual server registry,
not a duplicate runtime registry. A visible notice and every answer label the
responses as test data. No actual model call occurs, and this is not a live
language-quality or WhatsApp acceptance. A receipt at `/preview-identity.json`
identifies the exact Git SHA and `mock-only` transport.

The worker blocks product writes, including the existing get-or-create Person
RPC. Guest saving remains local to the browser. This does not approve a live
private-sync write. Existing-account authentication is not a product-data write.
Browser acceptance intercepts public backend reads as fixtures too; no real
personal information is used or forwarded. Vercel protection stays enabled.

Reproducible browser test:

```sh
python3 test/raziel-safe-actions-integration-2029.browser.py
```

For hosted acceptance, set `RAZIEL_SAFE_PREVIEW_ORIGIN` and
`RAZIEL_SAFE_EXPECTED_SHA`. Set `RAZIEL_SAFE_PROMPT_ACCESS_URL=true` to enter the
temporary protected-access URL into a hidden prompt. It is not recorded in
artifacts, arguments or Git. The test does not persist authentication state.

Deployment identity and post-deployment evidence belong in the passive AFTER
record; do not mistake a local screenshot or source-head Preview for final-SHA
hosted acceptance.

## Instructions for active consumer sessions

Life Journey and all ELS sessions can continue their independently owned work.
At their next checkpoint they must use the final integrated SHA and fresh
ownership checks, not restore files from old Raziel branches or start from main.
Keep one RazielSessionProvider2029, ResearchProvider, session and transport.

- Life Journey passes only authorized existing Person/Research Context and opaque
  references. No personal URLs/logs, automatic family research or automatic save.
- ELS passes bounded canonical match/exact-replay context, not private raw text;
  it does not change engine evidence, truth status or score through Raziel.
- Executable suggestions come only from the closed server registry. No local
  alternative registry, model-generated URL or automatic action/save.
- Internal navigation uses the existing router so an unsaved conversation lives
  through page changes. Do not restore the source's full-document number action.
- Do not fix the old ELS SystemFrame call-count test by introducing a second
  transport. Its owner should adapt the assertion to the current shared provider.
- Do not deploy ai-analyze, research-run or WhatsApp functions, or alter quotas,
  credits, DB/RLS or publication as part of this integration.

Stop after the final-SHA Frontend Preview and passive ownership release.
