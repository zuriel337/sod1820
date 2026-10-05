# SOD1820 — 2029 CONTROL PLANE / ATTENTION / OBSERVABILITY PLAN v1

**Date:** 2026-10-06  
**Status:** PROGRAM / ADMIN + OBSERVABILITY MAP · HUMAN-GATE CONTROLLED  
**Scope:** one internal Control Plane for current and future 2029 surfaces, owner-native attention, product evidence, Google/discovery analytics, release/security/infra health and later business/global lenses.  
**Principle:** build contracts and owner projections first; build polished dashboard presentation only when the evidence is real.

---

## 1. North Star

The 2029 Control Plane should answer, from one internal place:

1. **What needs my attention now?**
2. **What changed, compared with what?**
3. **Which users/traffic class/surface/capability does it affect?**
4. **Is this product friction, bot pressure, release regression, cost, security, SEO/discovery, content, provider or data quality?**
5. **What evidence supports the recommendation?**
6. **Who owns the underlying truth/state?**
7. **Does action require a Human Gate?**
8. **If I approve a change, did the metric improve afterward?**

The Control Plane is never a new source of research truth, traffic truth, security truth, payment truth, media identity or release truth. It composes bounded projections from existing owners and links back to evidence.

---

## 2. Build timing — when to build what

### CP0 — NOW / G4 foundation

**Build now:** contracts, adapters, surface registration, metric identity, Attention routing requirements and coverage tests.

Do **not** spend G4 building a polished analytics UI.

Required G4 outputs:

- Surface Registration / Launch Contract;
- common evidence envelope;
- Attention item contract;
- source-availability contract;
- current/future surface inventory;
- instrumentation coverage checker;
- Search/Discovery source taxonomy;
- one owner map for each Control Plane lens;
- negative rules preventing page-local analytics/alert systems.

### CP1 — BLOCKING before Public Beta Cutover

Ship a **minimum operational Control Plane V1** before the 2029 Public Beta.

It must be good enough to operate the live system, not visually final.

Minimum V1 lenses:

1. **Attention Inbox**
2. **Release / Deploy**
3. **Security**
4. **Infra / DB / Edge / Egress**
5. **Traffic / Human-like / Unknown / bots / AI**
6. **2029 Product Analytics / Engagement**
7. **Google / Search / Discovery / SEO**
8. **Performance / Web Vitals / Errors**
9. **Cost / Media / Provider**
10. **System Recommendations**

Blocking rule:

> Public Beta may not depend on Legacy Admin to answer a critical 2029 operational question.

The old admin can remain as compatibility during migration, but critical monitoring must be reachable from the 2029 Control Plane.

### CP2 — first Public Beta evidence window

After roughly **two full weekly cycles (~14 days)** of real Public Beta traffic, expand to Control Plane V2.

Build from observed questions rather than imagined dashboards:

- day/week/month/year/custom comparisons;
- rolling 7/30/90;
- release SHA before/after;
- per-surface and per-capability trends;
- cohorts and return/retention;
- funnels and abandonment;
- acquisition quality;
- Human-like vs automation composition;
- cost per useful outcome;
- anomaly/trend detection;
- recommendation cards with evidence and confidence;
- qualitative Clarity drill-out;
- experiment keep/revert evidence.

### CP3 — G5 Money / Entitlement lens

**Before first real paid/credit/premium activation**, add:

- payment provider health;
- request → payment → webhook → entitlement/credits state;
- idempotency/replay failures;
- ledger/reconciliation;
- entitlement denials;
- credit grant/spend/refund;
- cost per capability;
- cost per active/paying user;
- gross margin by plan/capability;
- conversion by source/surface/capability;
- failed/abandoned purchases;
- Human-Gate admin decisions.

### CP4 — G6 Global / Locale / Discovery lens

Before broad multilingual rollout, add:

- locale split;
- country/region split;
- Google Search type split;
- query language;
- international acquisition;
- crawler/bot/AI composition by country/locale;
- route/locale SEO coverage;
- hreflang/canonical issues;
- localization fallback/error;
- international abuse/rate evidence;
- translated surface parity.

### CP5 — G7/G8+ future capabilities

Voice/Audio/Private Corpus/Spatial/3D/XR inherit the same framework.

Add only capability-specific metrics such as:

- STT/TTS seconds and cost;
- voice fallback/error;
- media generation cost/cache;
- private-corpus indexing/storage;
- GPU/asset/network load;
- spatial replay/share;
- XR fallback/performance.

No new Control Plane architecture is required for each future capability.

---

## 3. Current readiness baseline · read-only audit · 2026-10-06

### Already present

The system already has substantial backend/admin capability:

- `admin_system_health()`;
- `admin_command_center()`;
- `admin_growth_center(days)`;
- `admin_traffic_insights(days)`;
- `admin_2029_analytics(hours,path_prefix)`;
- `admin_op_trace_list_v1` + trace drill-down;
- media/video health projection;
- Traffic Intelligence;
- `system_suggestions`;
- canonical `notify_admin()`;
- health/reliability watches;
- security spike watch;
- daily Traffic Intelligence refresh;
- daily Search Console sync;
- GA4 server-side read path;
- Search Console server-side read path;
- Vercel Web Analytics adapter;
- 2029 RUM/Web Vitals;
- first-party events/session/engagement/identity;
- Edge traffic classification.

### Current 2029 runtime-wide telemetry

`App2029` already initializes shared owners for public routes:

- GA4;
- marketing attribution;
- first-party `trackVisit`;
- engagement;
- identity;
- Web Vitals 2029.

`/2029/control` is deliberately excluded from public product analytics.

This means route-level coverage is already strong across the current App2029 route tree, but **meaningful-action coverage still needs a surface-by-surface Launch Contract test**.

### Current Control Plane UI

`/2029/control` currently exposes:

- system health;
- DB connection health;
- media/storage/egress;
- video projection;
- root traces;
- span/cost drill-down.

This is a strong operational base, but it is not yet the complete future admin home.

### Current Attention plumbing

- Health Watch runs every 15 minutes.
- Security spike watch runs hourly.
- System Watchman runs weekly.
- Traffic daily refresh runs hourly.
- GSC sync runs daily.
- `system_suggestions` currently has live pending items.
- `admin_notify` has configured WhatsApp + email destinations.
- `notify_admin()` currently queues WhatsApp through the canonical outbox.
- Generic email delivery is **not yet implemented in `notify_admin()`**; current function explicitly reports `no_generic_email_edge_yet`.
- Security alerts exist in owner-native storage but are not yet projected into the 2029 Attention Inbox.

Therefore the **alert engine exists**, but unified projection/delivery completeness is not finished.

### Current analytics/discovery plumbing

- GA4 configuration exists for the 2029 runtime.
- Search Console data is syncing into `gsc_metrics`.
- Current stored GSC dimensions include total/query/page/country/device.
- Current GSC sync uses the default Search Analytics type, therefore today it represents **Web search unless explicitly extended**.
- Discover / Image / Video / News / Google News are not yet stored as separate Search-type identities.
- Microsoft Clarity exists and is initialized in the Legacy/current runtime, but **is not initialized in `App2029` today**.
- Vercel Web Analytics adapter exists; it requires a server-only token and must show NOT_CONFIGURED rather than zero when unavailable.
- `admin_2029_analytics` and its client adapter exist, but are **not yet projected in the current Control Plane page**.

These are wiring gaps, not reasons to create new analytics stores.

---

## 4. Surface Registration / Launch Contract

Every 2029 surface — present or future — must register once into shared rails.

### Required registration fields

At minimum:

- `surface_id`;
- route family / route owner;
- canonical entity/subject type;
- semantic owner reference;
- availability state: OPEN / BUILDING / LATER / GATED;
- public/private/internal class;
- locale behavior;
- access/entitlement class;
- indexability decision;
- canonical/OG/share owner;
- crawler behavior;
- meaningful actions;
- expensive actions;
- Research Context participation;
- trace/cost participation;
- privacy/PII class;
- Attention owner;
- launch/acceptance fixtures.

### Baseline telemetry required before OPEN

Every public surface must support:

- page/view;
- entry/landing;
- acquisition/referrer/campaign;
- country;
- device/browser;
- locale;
- anonymous/authenticated/access tier;
- traffic class;
- engagement/dwell/scroll where meaningful;
- error/fallback/unavailable;
- release SHA attribution;
- before/after comparison.

### Meaningful actions

Each surface declares semantic actions from the existing action vocabulary rather than inventing local analytics taxonomies.

Examples:

- search;
- compute;
- select;
- open;
- inspect;
- run;
- ask;
- explain;
- deepen;
- save;
- add_to_research;
- follow;
- share;
- subscribe;
- sign_up;
- login;
- upload;
- publish;
- purchase;
- spend_credit;
- play/listen;
- resume;
- exact_return.

The surface may add an owner-approved action when genuinely necessary, but must not encode UI button names as permanent analytics semantics.

### Launch law

A surface is not OPEN/Golden/Public merely because it renders.

It must prove:

1. route/identity;
2. availability truth;
3. SEO/indexability decision;
4. telemetry;
5. meaningful actions;
6. bot/crawler safety;
7. error/performance;
8. privacy/access;
9. Attention/owner mapping;
10. release evidence;
11. exact before/after measurement ability.

Failure means BUILDING/GATED, not silent partial launch.

---

## 5. Full current + future surface inventory

The contract applies to these known homes/projections and to any future surface added later.

### Discovery / publication

- Home / Global Now;
- World;
- Posts Index;
- Post;
- Topic / Convergence;
- Archive / history;
- Updates / freshness projections.

### Number / calculation / cipher

- Number / Expression;
- Gematria / Calculator;
- Number quick-inspect/drawer projection;
- ELS / Cipher;
- Cipher Library;
- Cipher detail;
- future Codes / research collection projections;
- numeric sequence/research projections.

### Sources / research

- Books;
- Book / Source;
- Heichal;
- Researcher;
- Research Room;
- Research Dossier;
- Research-to-Media;
- Universal Search / Resolve / Command.

### Personal / community

- Workspace / Personal Area;
- account/profile;
- public Person/User/Contributor page;
- user research/saves/history;
- user's codes/ciphers;
- Journey;
- Community;
- Follow / Attention;
- Notifications;
- Auth / Onboarding / recovery.

### AI / capability

- Raziel;
- Raziel tool execution;
- contextual inspect;
- explain-why/trace;
- save/add-to-research;
- share;
- later Listen / Voice / Audio;
- later Private Corpus;
- later Spatial / 3D;
- later XR.

### Media / commerce

- Video / Media asset;
- uploads/admission where user-facing;
- Credits;
- Premium;
- Entitlements;
- Payment/checkout;
- usage/budget states.

A route need not exist today to be listed here. BUILDING entries carry no invented usage metrics.

---

## 6. One Attention model

### Attention classes

**CRITICAL**
- live outage;
- confirmed security exposure;
- payment/credit/data-integrity failure;
- destructive drift;
- release rollback condition.

**ACTION**
- requires Human Gate / owner decision;
- high-confidence product/release/security recommendation;
- unresolved capability gap blocking launch.

**WATCH**
- meaningful anomaly/trend;
- needs more evidence;
- not urgent.

**INFO**
- context only;
- no interruption.

### Canonical Attention item

Each item should include:

- stable item/dedupe key;
- category;
- severity;
- owner;
- affected surface/capability;
- observed window;
- comparison/baseline window;
- metric + denominator identity;
- observed value/delta;
- evidence/trace/source links;
- confidence;
- sample size;
- likely impact;
- proposed next step;
- Human-Gate requirement;
- cooldown;
- status;
- created/last-seen/resolved timestamps.

### Categories

- release/deploy;
- security;
- infra/DB;
- traffic/bots/AI;
- product/UX;
- analytics/instrumentation;
- Google/SEO/discovery;
- performance;
- media/storage/egress;
- AI/provider/cost;
- research/data quality;
- content/publication;
- people/identity/privacy;
- communications;
- payments/entitlements;
- localization/global.

### Delivery

One item may project to:

- Control Plane inbox;
- in-app admin notification;
- WhatsApp;
- email;
- future push/other owner-approved channel.

No channel creates a second alert identity.

---

## 7. Control Plane information architecture

The final UI is allowed to change. The semantic lenses are stable.

### A. Today / Attention

Default landing.

Show:

- critical;
- action needed;
- watch;
- recently resolved;
- “nothing important changed” state.

Each card must answer:

- what;
- why;
- evidence;
- impact;
- owner;
- next step;
- Human Gate yes/no.

### B. System / Release

- current main;
- production SHA;
- MERGED / DEPLOYED / LIVE / VERIFIED;
- gate status;
- preview;
- rollback candidate;
- deployment drift;
- release incidents;
- before/after comparison.

### C. Security

- Edge policy state;
- country policy;
- Human/Bot/Unknown;
- quarantine/rate limiting;
- 403/429/error patterns;
- security alerts;
- auth/access anomalies;
- advisor findings;
- privileged-surface hardening progress;
- secret/config availability;
- no automatic blocking controls.

### D. Traffic

- Edge composition;
- first-party composition;
- human-like / unknown / suspected / bot;
- goodbot / AI / bad bot;
- country;
- source;
- device;
- landing;
- day context;
- raw vs clean denominators.

### E. Product / Journeys

- surface usage;
- meaningful actions;
- funnels;
- abandonment;
- save/share/follow/signup;
- return/retention;
- anonymous vs known user;
- BUILDING/unavailable demand;
- search intent;
- Number/Cipher/ELS/Raziel usage.

### F. Google / Discovery / SEO

- Web Search;
- Discover;
- Image;
- Video;
- News;
- Google News;
- query;
- page;
- country;
- device;
- impressions/clicks/CTR/position where applicable;
- indexability/sitemap/canonical health;
- crawler/AI discovery demand;
- missing-report vs zero distinction.

### G. Experience / Performance

- Web Vitals;
- p75 CLS/LCP/INP/FCP/TTFB;
- route/device;
- errors;
- fallback;
- provider latency;
- availability;
- mobile vs desktop;
- Clarity drill-out.

### H. Cost / Infrastructure

- DB/storage;
- egress;
- AI/provider;
- media;
- cache;
- top expensive traces;
- unknown/unpriced cost;
- background jobs;
- queue/outbox;
- storage/index growth.

### I. Recommendations

Unified recommendation queue:

- pending;
- accepted;
- rejected;
- later;
- resolved;
- evidence;
- confidence;
- estimated impact;
- actual post-change outcome when later measurable.

### J. Business — G5+

- payment/credits/entitlements;
- conversion;
- revenue;
- provider fees;
- cost;
- gross margin;
- purchase failures;
- churn/retention;
- plan/capability economics.

### K. Global — G6+

- locale;
- geography;
- query language;
- international SEO;
- crawler/AI/bot;
- abuse;
- translation parity;
- locale-specific performance/fallback.

---

## 8. Time model

Every compatible metric should support the time axis appropriate to its owner.

### Operational

- 5m;
- 1h;
- 6h;
- 24h.

### Product

- day;
- week;
- month;
- year;
- rolling 7/30/90.

### Comparison

- previous equivalent period;
- exact custom A/B windows;
- deployed-SHA before/after;
- experiment/control;
- cohort first-seen/signup;
- locale/country cohort;
- device cohort.

### Context overlays

Where relevant:

- weekday;
- weekend;
- Shabbat/holiday context;
- release;
- instrumentation change;
- policy change;
- major bot wave;
- campaign/promotion.

Context is annotation, not automatic causality.

---

## 9. Google / Search / Discover plan

### Current owner

Reuse:

- `gsc-sync`;
- `gsc_metrics`;
- `/api/search-console`;
- existing SEO/canonical/sitemap owners.

No GSC Store 2.

### Required extension

Add explicit Search-type identity.

Target values where supported/returned by Google:

- Web;
- Discover;
- Image;
- Video;
- News;
- Google News.

Persist/report source type as part of metric identity so values never overwrite one another.

### Important semantics

- a missing Discover report can mean Google has not exposed enough data;
- it is not proof of zero Discover traffic;
- query availability/privacy thresholds may differ by Search type;
- Search Console data is delayed; never compare it as if realtime;
- GSC page identity should resolve to canonical 2029 route/entity when possible.

### Discovery questions the Control Plane should answer

- which 2029 surfaces get impressions but low CTR;
- which posts/topics/videos appear in Discover vs Web;
- which queries map to Number/Topic/Post/Cipher demand;
- which countries/devices see different ranking/CTR;
- which public pages receive crawler demand but weak human continuation;
- which 2029 routes have no expected index/discovery evidence after launch;
- which route family gains/loses visibility after a release.

---

## 10. GA4 / first-party / Vercel / Clarity roles

### First-party SOD1820

Authority for:

- semantic action events;
- Research Context correlation;
- traffic-cleaning/classification;
- user/account links where authorized;
- product funnels;
- exact 2029 surface/capability usage;
- cost/trace joins.

### GA4

External comparative source for:

- acquisition;
- users/sessions/views;
- engagement/bounce;
- countries/cities;
- device/browser/language;
- landing;
- realtime;
- new/returning.

It is not the canonical Research/Action store.

### Vercel Web Analytics

Independent comparison source for:

- visitors/pageviews;
- pages;
- referrers;
- devices;
- countries;
- browsers.

If the required server credential is missing, show NOT_CONFIGURED.

### Microsoft Clarity

Qualitative evidence:

- session recordings;
- heatmaps;
- dead/rage clicks or related behavioral diagnostics where available.

Required before/at Public Beta:

- initialize Clarity in isolated `App2029`;
- keep it outside semantic product truth;
- allow Control Plane deep links to the external dashboard/session evidence rather than copying recordings into SOD1820.

### Rule

Never sum incompatible “users” across first-party, GA4 and Vercel.

Agreement in direction increases confidence; disagreement becomes a measurement-quality Attention item.

---

## 11. Instrumentation coverage monitor

The Control Plane should show a **coverage matrix**, not assume instrumentation is working.

For every registered OPEN/Golden surface:

- route view observed?
- engagement observed?
- meaningful action observed/tested?
- release SHA captured?
- traffic class available?
- locale available?
- access tier available?
- error/fallback available?
- SEO/indexability owner resolved?
- GSC/Google mapping expected?
- Web Vitals sample present when traffic threshold is met?
- trace/cost available for expensive capability?
- Attention owner resolved?

States:

- PASS;
- PARTIAL;
- NOT_APPLICABLE;
- BUILDING;
- NO_TRAFFIC;
- NOT_CONFIGURED;
- BROKEN.

A zero event count is not automatically BROKEN; it may be NO_TRAFFIC.

---

## 12. Recommendation engine — governed learning

Allowed loop:

`observe → aggregate → compare → detect → recommend → Human/owner decide → bounded change/experiment → measure → keep/revert`

Recommendation examples:

- mobile bounce increased after SHA;
- Number/Cipher intent increased;
- users repeatedly hit BUILDING;
- Discover visibility increased for a content cluster;
- Google traffic lands but does not continue;
- Clarity shows repeated dead-click behavior on a high-traffic surface;
- a capability is expensive but rarely produces save/share/return;
- a provider failure rate changed;
- bot pressure moved to another route/country;
- a route is live but telemetry coverage is partial;
- a GSC/GA/Vercel source stopped refreshing.

The system does not autonomously:

- change research truth;
- rank canonical findings;
- publish;
- price;
- grant entitlement/credit;
- alter security policy;
- change quarantine/rate/ASN/country controls;
- mutate grants/RLS;
- retire routes/engines;
- declare browser traffic Human.

---

## 13. Alerts vs dashboards

Do not turn every metric into an alert.

### Alert

Only when:

- action is required;
- threshold materially changes risk;
- detector confidence/sample is adequate;
- sensor/source stopped;
- critical regression exists.

### Dashboard only

Use for:

- normal traffic fluctuation;
- exploratory segmentation;
- vanity metrics;
- low-sample trends;
- expected seasonal/day-context variation.

### Watch state

Use when signal is material but not mature enough for action.

This preserves “silence when nothing meaningful changed.”

---

## 14. Suggested initial detectors

### Operational

- deployment mismatch / production SHA drift;
- failed required release gate;
- elevated runtime error;
- dead telemetry sensor;
- DB connections/long query/idling;
- storage/egress spike;
- queue/outbox stalled;
- provider unavailable.

### Security

- hard-block accidentally enabled;
- CN/SG policy drift;
- bad-bot allow regression;
- public goodbot/AI blocked unexpectedly;
- unexpected 429/403 shift;
- privileged RPC/auth anomaly;
- security-advisor high-impact change.

### Product

- surface bounce/abandonment regression;
- mobile/desktop divergence;
- BUILDING demand spike;
- search-with-no-result;
- repeated unavailable capability;
- save/share/follow/signup conversion shift;
- return/retention shift.

### Google/discovery

- GSC source stale;
- impressions/clicks material drop;
- CTR deterioration on high-impression page;
- unexpected canonical/sitemap/indexability gap;
- Discover spike/drop where report exists;
- query cluster growth;
- Google crawler increase without human/search benefit.

### Measurement quality

- GA4 vs first-party direction divergence;
- Vercel vs first-party divergence;
- surface has traffic but no meaningful action telemetry;
- Web Vitals missing despite enough traffic;
- locale/country/device suddenly becomes UNKNOWN-heavy;
- classifier/instrumentation version changed without timeline annotation.

---

## 15. Privacy / retention

The Control Plane must not become a surveillance dump.

Rules:

- preserve current bounded raw behavioral retention;
- long-term trends use aggregates;
- no raw IP storage merely for dashboard convenience;
- private research/content remains access-gated;
- public user/person analytics must not expose private identity linkage unnecessarily;
- Clarity remains external/qualitative and subject to its privacy configuration;
- exact person-level drill-down only where an owner/admin use case is authorized;
- analytics recommendations use aggregation by default.

---

## 16. Release acceptance for a new surface

Before any new surface goes OPEN:

### Identity
- canonical surface id;
- route/alias policy;
- entity identity.

### SEO
- index/noindex;
- canonical;
- sitemap if eligible;
- OG/share;
- crawler side-effect safety.

### Analytics
- view;
- engagement;
- meaningful actions;
- acquisition;
- traffic class;
- locale/access/device/country;
- release SHA.

### Runtime
- error/fallback;
- performance;
- trace/cost if expensive.

### Attention
- owner;
- detector coverage where applicable;
- operational failure state.

### Replay
- before/after query;
- fixture/test;
- evidence linked to deployed version.

No separate “analytics cleanup later” phase is allowed for a newly OPEN surface.

---

## 17. G4 implementation order

Recommended sequence:

1. finalize Surface Registration / Launch Contract;
2. inventory current App2029 routes + planned future surfaces;
3. map every existing owner/projection;
4. add a static/contract coverage test for future surface registration;
5. wire `admin_2029_analytics` into Control Plane V1;
6. project system suggestions + security/health Attention into one inbox;
7. expose source-health cards: first-party / GA4 / GSC / Clarity / Vercel / RUM;
8. extend GSC taxonomy to explicit Search type;
9. initialize Clarity in App2029;
10. verify meaningful-action coverage per current G4 Golden surface;
11. verify time/release-SHA comparison;
12. only then spend effort on polished Control Plane presentation.

Items 5–11 are runtime work and require their normal implementation/release gates; this document does not authorize them by itself.

---

## 18. Pre-Public-Beta Control Plane V1 acceptance

Must be able to answer:

- What production SHA is live?
- Are required release gates healthy?
- Is there a current security/infra incident?
- What is Human-like vs Unknown vs bot/AI pressure?
- Which 2029 surfaces have real users?
- Which surface has the worst current engagement/performance regression?
- Is GA4 available?
- Is Search Console fresh?
- Is Discover/Image/Video/News source available or unavailable?
- Is Clarity active for 2029?
- Is Vercel analytics configured or not?
- Which recommendations are pending?
- What evidence supports each recommendation?
- Which owner should act?
- Does action require Human Gate?

If these require raw SQL/manual multi-tool investigation every time, V1 is not complete.

---

## 19. Public Beta V2 acceptance

After enough traffic:

- exact day/week/month/year/custom window;
- rolling 7/30/90;
- release before/after;
- per-surface/capability;
- acquisition → action → return funnel;
- cohort retention;
- mobile/desktop;
- locale/country;
- Human-like/Unknown/bot/AI;
- Google Web/Discover/etc;
- cost/useful outcome;
- anomaly/recommendation;
- evidence-linked keep/revert decision.

At least one full improvement loop must be reproducible from evidence.

---

## 20. G5 / G6 acceptance additions

### G5

Before money:

- payment chain observable;
- entitlement/credits observable;
- reconciliation observable;
- failure/replay observable;
- cost/margin observable;
- conversion observable.

### G6

Before multilingual exposure:

- locale parity observable;
- hreflang/canonical observable;
- language/search demand observable;
- international traffic class observable;
- international performance observable;
- global abuse evidence observable.

---

## 21. Current known gaps to schedule, not panic over

These are current wiring gaps, not architectural failures:

1. `admin_2029_analytics` exists but is not shown in current Control Plane.
2. system suggestions are not yet unified into the new Control Plane.
3. security alerts are not yet unified into the new Attention Inbox.
4. generic `notify_admin` email sending is not implemented yet.
5. Clarity is not initialized in `App2029`.
6. Search Console sync does not yet preserve explicit Web/Discover/Image/Video/News/Google-News type.
7. Vercel Web Analytics adapter may be NOT_CONFIGURED until server credential exists.
8. meaningful-action telemetry coverage is not yet mechanically enforced for every 2029 surface.
9. current static SEO gate does not prove all semantic-action instrumentation.
10. future surface registration is not yet a hard launch prerequisite in code/CI.

The G4/Pre-Cutover work above closes these without creating parallel systems.

---

## 22. Do-not-build list

Do not create:

- Analytics Store 2;
- Alert Store 2;
- Security Dashboard truth;
- GSC Store 2;
- page-local tracking taxonomies;
- per-surface notification systems;
- new bot classifier merely for admin;
- a second user identity;
- a second release ledger;
- autonomous “AI operator” that changes production from recommendations;
- a dashboard that hides UNKNOWN/NOT_CONFIGURED.

Extend existing owners and project them.

---

## 23. Human Gate boundaries

This plan authorizes documentation and read-only audit only.

Separate implementation/release authorization remains required for:

- DB schema/grants/RLS;
- security policy;
- rate limits;
- country/ASN/Turnstile controls;
- secrets/environment changes;
- payment/entitlement activation;
- destructive retirement;
- production deploy/merge where required by project law.

Recommendation acceptance is not automatically execution authorization when the affected owner requires a stronger gate.

---

## 24. Final target

By the end of G4 / Public Beta entry:

> One 2029 admin home can tell ZURIEL what changed, what matters, why it matters and where the evidence is — across the whole live system.

By G5:

> The same home can explain product economics, payments and entitlements without weakening truth/security separation.

By G6:

> The same home can explain international discovery, locale performance and abuse without building a second global analytics tree.

For every later surface:

> Register once → inherit analytics/SEO/attention/trace/security/release rails → launch only when coverage is proven.
