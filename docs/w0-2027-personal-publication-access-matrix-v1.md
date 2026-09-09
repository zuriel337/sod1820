# SOD1820 — W0 2027 PERSONAL / PUBLICATION / CROSS-CUTTING / ACCESS MATRIX V1

**Status:** W0 SPECIFICATION · DOCS ONLY · BRANCH ONLY · NOT IMPLEMENTED  
**Owner check:** `EXTEND_EXISTING`  
**Primary existing owners:** Personal Command Center intent · Research Studio/Research Context · Person Foundation/Auth · Subscription Funnel · Content Foundation · Research Intake · Truth Axes · site_flags · Content Translation · canonical Share/UI owners.

## 0. Principle

The 2027 experience composes existing domains without turning them into one database, one inbox or one lifecycle.

**One Tree != One Table != One Pipeline != One Inbox.**

My Workspace is one personal **experience projection**. Content publishing and Research promotion are different flows. Access, truth and authority remain orthogonal.

---

## 1. Personal capability owner matrix

The current `UserCenter` proves that profile, notifications, DMs, WhatsApp linking, credits/progress, contributions and personal research capabilities already exist in real code. Its drawer/layout is not protected.

| Personal capability | Canonical semantic owner / substrate | 2027 home | W0 rule |
|---|---|---|---|
| “What should I do next?” / resume direction | `personal_command_center_law` experience intent + Research OS signals | My Workspace home | **PRESERVE INTENT**: user enters to know the next useful step, not to inspect a dashboard |
| Saved research / active research / collection | Research Studio / `ResearchProvider` / `research_items` existing path | My Workspace → Research | view over existing owned research state; no `my_research_v2` store |
| Journeys / resume / exact reopen | Research Path/Journey foundation + Research Context | My Workspace → Journeys/Resume | same Journey identities; exact reopen revalidates access/existence |
| Personal notifications | `subscription_funnel_law` / canonical notification infrastructure | My Workspace → Personal Attention | not Global Now and not Research Source Inbox |
| Follow/subscriptions | `subscription_funnel_law` / canonical `WatchButton` semantics | contextual content actions + My Workspace → Following | Follow != Share != Save; one follow engine |
| DMs / replies / mentions | existing communication implementation, composed by Personal Command Center | My Workspace → Personal Attention | communication state is not research truth and does not auto-enter Research Intake |
| WhatsApp account linking / connected channels | existing verified identity/channel path + Person/Raziel owners | My Workspace → Connected Channels | one verified identity; group/DM privacy rules remain; no second Raziel memory |
| My contributions / created content | Content Foundation / content owners; Research Intake only when explicitly submitted as research | My Workspace → Contributions/Creation | reference canonical content/contribution identities, do not copy them into personal tables for UI |
| Submitted research findings / pending review | Research Intake + Truth/Human Gate | My Workspace → Research submissions where authorized | candidate/review state remains research-governed, distinct from ordinary creation |
| Profile / account identity | Person Foundation/Auth | My Workspace → Account | account identity != public Person node; profile does not auto-promote Person to graph |
| Researcher level / progress | existing Personal Command Center/progression implementation | My Workspace → Progress | motivational/personal state, never a truth rank |
| Credits / ledger | `unified_credit_system` + existing credit/profile infrastructure | My Workspace → Credits | one credit currency across tools; product pricing comes later and is not invented by W0 |
| Premium / entitlement display | existing account/subscription/access owners when implemented | My Workspace → Access | entitlement controls authorized depth, never truth quality |
| Privacy/preferences/security | Person/Auth/privacy owners | My Workspace → Settings | personal/account state, not World truth |
| Language preference / switch | `content_translation_law` + Global Shell action | Global action + My Workspace → Language | one identity/context across locale; RTL/LTR projection |
| Raziel personal companion/history | `raziel_companion_layer_law` + authorized Research Context | Global Raziel + My Workspace entry/history | one Raziel; personal context never leaks to group/public surfaces |

### Multiple launchers, one personal workspace

These may all invoke the same semantic capability `open_my_workspace`:

- desktop Sidebar personal block;
- top-header avatar/account control;
- mobile account control;
- Command Palette;
- Raziel action.

Multiple launchers do **not** create multiple personal centers.

### Personal Attention vs Global Now

- **Global Now** = what is new in SOD1820 / discovery stream.
- **Personal Attention** = notifications, replies, DMs, account alerts relevant to this user.
- **Research Source Inbox** = authorized raw/source material for research/admin processing.

One item may create a badge in more than one surface only when the underlying event semantics justify it; presentation does not change owner/state.

---

## 2. Publication vs Research Intake matrix

The Product Map’s old simplified `Create → Intake → World` diagram must be read as an optional research path, not a physical universal pipeline.

| Input/action | Default domain path | When it enters Research Intake | Truth / publication consequence |
|---|---|---|---|
| Post authoring/editing | **Content creation → content publication owner** | only if a claim/finding/source is explicitly submitted/extracted for research | published post != canonical research truth |
| Gallery/image upload | **Content/representation → gallery/media publication/curation** | when designated as evidence/source material or submitted for research | image/representation != semantic fact |
| Beit Midrash chiddush / discussion | **content/community contribution** | explicit “submit to research” or governed extraction path | public discussion != approved/canonical research |
| Forum legacy contribution | same communication/content semantics while legacy surface exists | explicit research submission only | Forum retirement/absorption does not change truth status |
| Comment / DM / reply | **communication** | only explicit user/admin research submission, never automatically | message existence != research claim acceptance |
| WhatsApp message | **communication/source channel** | when source-intake policy selects/submits it into Research Source Inbox | raw message may remain private; source != canonical truth |
| ELS deterministic result | **Heichal/tool result** | personal save may remain owned research; explicit research submission can create governed candidate/evidence | deterministic occurrence/result != interpretation != canonical |
| Gematria/method calculation | **canonical engine result / calculation fact** | may be attached to research/candidate when user submits/uses it | calculation result does not auto-promote interpretation |
| AI/Raziel number analysis | **interpretation/suggestion response** | only explicit proposed candidate/research action through existing intake | AI output never self-canonicalizes/publishes |
| Book/source scan/extraction | **source ingestion/research orchestration** | structured extracted claims/evidence enter Research Intake under source provenance | public readable Book != every extracted claim canonical |
| Admin “propose relation/candidate” | **Research Intake / Workbench** | immediately as candidate/proposal under authorized writer | Candidate → Review → Human Gate; no direct canonical shortcut |
| Publish approved/canonical research as content | **publication projection** after separate authorization | research state already exists; publication is its own surface decision | canonical != published; published != canonical |

### Explicit action split

W0 semantic actions distinguish:

- `create_content`
- `publish_content`
- `submit_intake`
- `propose_candidate`
- `review`
- `approve`
- `canonicalize` / governed promotion only where existing owner exposes an authorized transition
- `publish_projection`

The UI may present simpler Hebrew wording, but implementation must not collapse these meanings.

---

## 3. Cross-cutting capability placement

These capabilities must survive the redesign without becoming top-level duplicate “worlds”.

| Capability | Existing owner / implementation family | 2027 placement | Rule |
|---|---|---|---|
| Follow / subscription | `subscription_funnel_law` | contextual content action + My Workspace → Following/Attention | one Watch/Follow engine; value-first placement; Follow != Share/Save |
| Share | canonical `ShareActions` / share placement owner | contextual action / Inspector / content footer depending renderer | one Share family; canonical URL/OG preserved; no duplicate share bars |
| Language switching | `content_translation_law` | global `change_language` action; compact Header/Sidebar/Settings projection | same identity/context/access state across locale; RTL/LTR safe |
| Onboarding | existing `/enter`, `/start`, account/profile nudges as evidence | adaptive first-run guidance + direct `/start` address if useful | onboarding must never become mandatory gateway to direct SEO content; progress is personal state |
| Legal / Privacy / Contact | existing `/privacy`, `/contact`, unsubscribe/account actions | globally reachable footer/More/account settings | cannot disappear in immersive/AI redesign; accessibility and legal reachability are shell obligations |
| Install / PWA | existing install tracking + `InstallPrompt` capability | contextual/global install suggestion; Settings where useful | not a permanent primary-nav destination; same product identity/state |
| Push notification channel | Subscription Funnel / `push.js` path | My Workspace → Notification channels; value-first escalation after Follow | channel != subscription; no push before user choice/policy |
| Global Now / updates | existing site updates/live-feed capabilities | global one-click entry from Header/Sidebar/Command Surface | site-wide discovery, not personal inbox |
| Search / Command | existing Search/Explorer substrate + Adaptive Shell | global omnibox/palette | routes to identities **and** semantic actions; manual navigation works without AI |

### Sidebar projection

A Vercel-like collapsible desktop Sidebar is a **valid preferred projection** of Global Navigation, but W0 does not create a separate Sidebar owner. Visual Foundation/W1 determine exact placement, density and responsive behavior.

Semantic split remains:

- **Top Orientation:** where am I?
- **Global Navigation / Sidebar:** where can I go?
- **Adaptive Commands:** what can I do now?

---

## 4. Access / privacy / ownership / authority matrix

No single “tier” field may answer every access question.

| Axis | Question | Canonical responsibility | It may NOT imply |
|---|---|---|---|
| Capability availability | is this product capability open at all? | `site_flags_lock_law` | user entitlement, truth, publication |
| Authentication | who is the caller? signed out/signed in | Auth/Person root | admin authority, paid entitlement, truth |
| Ownership | does this private item belong to caller? | domain owner/RLS/Person privacy | publication/canonical status |
| Entitlement | Free/registered/Premium/Deep/etc. | subscription/access owner when implemented | admin role, Human-Gate authority, “truer” answer |
| Publication/access state | who may see this semantic object on this surface? | Truth Axes per-surface authority field | canonical truth or engine verification |
| Operational role | researcher/editor/admin/system operator | verified immutable-to-client authorization source | canonicalization unless transition explicitly grants it |
| Governance authority | may caller approve/canonicalize/publish governed truth? | Truth/Human-Gate transition boundary | paid tier, popularity, ownership alone |
| Epistemic type | what kind of object/claim is it? | Truth Axes | verification/governance/access |
| Verification | did an engine test a claim/result? | canonical engine detail | Human acceptance/publication |
| Heat/ranking | is it active/relevant/popular? | demand/traffic/domain ranking owners | truth/canonical status (`HOT != TRUE`) |

### Request resolution order

For any protected route/query/action:

1. resolve identity/target without leaking private details;
2. resolve capability availability;
3. authenticate/resolve caller where required;
4. verify ownership/operational role where relevant;
5. resolve entitlement;
6. resolve object/surface publication-access;
7. bound server payload;
8. render UI state;
9. for governed writes, independently verify Human-Gate/admin transition authority at server boundary.

`ResearchContext.access` is display/navigation context, **not authorization proof**.

### Access-ready terminal behavior

Known target + insufficient entitlement → `ACCESS_GATED` projection.  
Known private target + unauthorized caller → privacy-safe `NO_PERMISSION`/not-disclosive response according to owner.  
Closed capability → `CAPABILITY_CLOSED`.  
Missing identity → `NOT_FOUND`.

Do not turn all four into Home redirect or client-side hidden content.

---

## 5. Premium structural readiness

W0 closes only structural readiness:

- same Number/Book/Post/World identity across access depths;
- no `premium_number`, `premium_book`, duplicate graph or duplicate Search;
- authorized depth is selected server-side;
- Premium/Deep may expose richer approved data/tools, not private Admin raw by default;
- account can display current entitlement in My Workspace;
- Raziel receives only caller-authorized context;
- entitlement change/logout/account-switch triggers fresh authorization on future protected reads/actions.

**Non-claim:** pricing, billing provider integration, recurring subscription state, entitlement issuance/revocation and commercial packaging are later owner work.

---

## 6. W0 closure verdict for this matrix

**PERSONAL OWNER MATRIX:** CLOSED AT SPECIFICATION LEVEL.  
**PUBLICATION-vs-INTAKE:** CLOSED AT SPECIFICATION LEVEL.  
**CROSS-CUTTING PLACEMENT:** CLOSED AT SPECIFICATION LEVEL.  
**ACCESS/PRIVACY/AUTHORITY:** CLOSED AT SPECIFICATION LEVEL.

Implementation and negative security tests belong to the relevant W1/W5/W8 release gates.
