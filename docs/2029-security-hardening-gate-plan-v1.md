# SOD1820 — 2029 SECURITY HARDENING GATE PLAN v1

**Date:** 2026-10-06  
**Status:** PROGRAM / SECURITY TIMING MAP · HUMAN-GATE CONTROLLED  
**Scope:** security sequencing for G4 → Public Cutover → G5 → G6. This document is navigation/execution guidance; active domain owners and Human-Gate rules remain authoritative.

## Purpose

Avoid both failure modes:

1. hardening too early, before the real 2029 journeys reveal which public/authenticated/server paths are actually required; and
2. hardening too late, after broad Public Cutover or paid entitlements make permission changes risky.

Security is therefore a staged lane, not a single cleanup at the end.

## Current read-only baseline · 2026-10-06

The current system already has meaningful layered protection: Edge bot classification, Smart Quarantine / Adaptive Strict for CN/SG, SG targeted post-proof rate limiting, honeypot routes, transport/browser security headers, protected Vercel previews, secret-scoped production environment variables, multiple release/compatibility gates, post-deploy canary and repository snapshots.

The current hardening debt is concentrated in authorization surface area rather than absence of perimeter protection.

Read-only Supabase Advisor / catalog triage at this checkpoint shows:

- 284 public-schema `SECURITY DEFINER` functions executable by `anon`;
- 124 contain an obvious inline auth/admin/JWT guard by static inspection;
- 160 do not contain an obvious inline guard by that simple inspection;
- of those 160, 54 contain DML/dynamic-execution keywords and therefore require explicit classification before broad exposure;
- this does **not** mean 160 or 54 confirmed vulnerabilities: some are intentionally public read/write contracts, some use secret parameters or delegated guards, and some are read-only. They are a triage set, not a breach count;
- 2 externally visible Security Definer views need explicit review;
- mutable `search_path` warnings exist across a broad legacy function surface and should be prioritized for externally reachable privileged functions;
- release workflows are numerous, but branch-level required-status enforcement must be verified as part of the cutover gate rather than assumed from workflow existence.

This baseline is evidence for prioritization only. It is not a permanent score or a new security truth store.

## Stage S0 — NOW / during G4: critical-only remediation + inventory

**Goal:** do not stop G4 for broad permission cleanup, but do not knowingly carry a critical exposure forward.

Do now:

- keep all security work read-only by default;
- maintain a classified inventory of externally reachable RPCs/views/functions used by active 2029 journeys;
- record for each reachable capability: principal, route/surface, read/write side effect, expected caller, required auth class, abuse/rate sensitivity and owner;
- keep CN/SG policy regression checks, goodbot/AI public behavior and bad-bot blocking under their current Human Gate;
- preserve secrets server-side and production-scoped;
- capture actual Golden-journey RPC/function usage so later revocations are evidence-based.

Immediate stop-and-fix conditions, regardless of G4 status:

- unauthenticated high-impact mutation with no intentional public contract and no effective guard;
- admin/payment/credit/publishing action callable without the intended authorization boundary;
- service-role or other privileged secret exposed to a client/public artifact;
- webhook/payment path that can be replayed or forged without an effective server boundary;
- security control regression such as unintended country hard-block, quarantine bypass, bad-bot allow, or private/admin route becoming public;
- destructive or irreversible write path with no Human-Gate boundary.

Everything else may stay in the triage queue until the Pre-Cutover Gate if changing it now would risk breaking active G4 discovery.

**Exit:** no known critical exposure remains open; G4 can continue while the permission map gains real evidence.

## Stage S1 — G4 evidence collection

**Goal:** turn live/replayable Golden journeys into an authorization map.

For every representative G4 Golden and Cross-Surface Skeleton journey, collect:

- route/surface → RPC/function/view/storage/API dependency;
- caller class: public anonymous, authenticated user, owner-bound user, admin, server-only, background worker, provider webhook;
- read vs mutation vs privileged mutation;
- whether the operation can create cost, publish content, change canonical state, grant credits/entitlements, send communications or expose personal/private data;
- real negative tests: wrong user, anonymous caller, stale/invalid session, crawler/bot, replay, malformed input and unavailable capability;
- rate/abuse evidence only where traffic exists; do not invent ASN/Turnstile/country controls before evidence.

Classification target for every externally reachable privileged RPC:

- **PUBLIC_READ** — intentionally public, side-effect free;
- **PUBLIC_BOUNDED_WRITE** — intentionally anonymous write with strict validation/rate/abuse contract;
- **AUTH_OWNER** — authenticated and object/user ownership enforced;
- **AUTH_ROLE** — authenticated role/entitlement explicitly enforced;
- **ADMIN_ONLY** — explicit admin check and no anonymous authority;
- **SERVER_ONLY** — client EXECUTE revoked; only trusted server/service path;
- **INTERNAL_ONLY / RETIRE** — no active public consumer; remove/revoke only after consumer proof.

Passing JS/quarantine proof is never authorization or Human proof.

**Exit:** the active public 2029 slice has an evidence-backed permission graph; remaining unclassified legacy functions are not assumed safe but are separated from active cutover dependencies.

## Stage S2 — BLOCKING Pre-Public-Cutover Security Gate

**Timing:** after the minimum public Goldens/Skeleton provide enough real dependency evidence and **before the major 2029 Public Cutover Human Gate**. G4 may continue after cutover; this gate does not require every later G4 visual Golden to be finished.

This is the main hardening pass intended to move the system from the low-80s security posture toward a materially tighter 90+ posture. The score is heuristic only; acceptance is evidence-based.

Required acceptance:

### Database / API authorization

- every externally reachable privileged RPC/view used by the public slice is classified;
- anonymous/authenticated EXECUTE is removed from admin/server-only mutations;
- intended public writes have explicit validation, bounded side effects and abuse/rate controls;
- owner-bound writes prove ownership with negative tests;
- admin actions prove an explicit admin boundary;
- Security Definer functions reachable from public roles have fixed/intentional `search_path` and least-privilege behavior where applicable;
- Security Definer views are converted to an intentional security model or explicitly justified/tested;
- RLS + grants + function privileges are tested together; RLS alone is not treated as sufficient;
- no service-role/privileged secret is shipped to the browser.

### Edge / public routes

- CN/SG Smart Quarantine / Adaptive Strict contract regression passes;
- no accidental country hard-block;
- goodbot/AI public read behavior remains intact;
- bad bots remain blocked;
- browser remains Unknown after JS/quarantine proof;
- SG post-proof limiter path is testable/observable without promoting proof to Human;
- expensive/private routes do not become crawler side-effect paths.

### Browser / transport

- baseline security headers remain present;
- define and test a CSP rollout. Use report-only first if third-party integrations require discovery; move to enforcement when violations are understood;
- framing/referrer/permissions policies remain intentional rather than accidental defaults.

### Release / recovery / ownership

- the required release/security gates for cutover are demonstrably non-bypassable by the normal release path, or the exact enforcement owner and Human-Gate stop point is documented and tested;
- post-deploy canary passes on the exact deployed SHA;
- rollback target exists and is tested for the cutover;
- critical backup/restore path has current evidence, not only backup creation;
- production secrets/config are scoped to the minimum required environments and owners;
- no security decision is inferred from a commit existing; MERGED / DEPLOYED / LIVE / VERIFIED remain distinct.

**Cutover rule:** a confirmed high-impact authorization gap blocks Public Cutover. Low-risk legacy debt outside the active public dependency graph may remain scheduled with an owner and explicit non-blocking rationale.

## Stage S3 — G4 closure reconciliation

After the representative G4 Goldens finish:

- rerun the privileged RPC/view inventory against the final Golden surface set;
- diff new functions/tables/jobs/routes against the Pre-Cutover inventory;
- replay negative auth/ownership/side-effect tests;
- verify no page-local or temporary workaround reintroduced a bypass;
- close or explicitly route any G4-created security debt before broad G5 scaling.

This is reconciliation, not a second security architecture.

## Stage S4 — BLOCKING G5 Money / Entitlement Security Gate

**Timing:** before the first real paid purchase, premium entitlement activation, credit grant/spend or other money-equivalent production action. Do not wait until G5 is “finished.”

Required acceptance:

- package/price/amount/credit quantity/entitlement truth is server-owned;
- client input cannot self-assign price, credits, tier or approval;
- payment provider callbacks/webhooks are authenticated by the intended server boundary;
- idempotency prevents duplicate finalize/grant;
- replay/out-of-order webhook behavior is safe;
- purchase state machine has explicit pending/succeeded/failed/rejected/refunded/cancelled semantics as applicable;
- credits/entitlements have auditable ledger/provenance and double-spend resistance;
- admin override/decision paths are explicit and Human-Gated where required;
- per-user/provider/IP rate and abuse controls are evidence-based;
- secrets are production-scoped and rotatable;
- failure/retry/reconciliation tests prove money state cannot silently diverge between provider, payment request, ledger and entitlement;
- observability can answer “why did this user receive/lose this entitlement?” without exposing payment secrets.

**G5 rule:** product pricing decisions remain a separate Human Gate; security acceptance does not decide pricing.

## Stage S5 — BLOCKING G6 Global Exposure Gate

**Timing:** before broad English/multilingual rollout materially expands international reach.

Required acceptance:

- locale projection reuses the same authorization/ownership/entitlement boundaries; no locale-specific bypass;
- translated/public routes cannot turn crawler reads into writes or expensive side effects;
- canonical/hreflang/indexability rules do not expose private/deep research state;
- goodbot/AI vs browser/Unknown behavior is rechecked under broader international traffic;
- rate-limit thresholds are reviewed using actual post-cutover/global evidence;
- ASN/datacenter filtering, Turnstile/step-up or country-specific escalation is added only where cheaper controls fail and evidence supports it;
- upload/search/AI/ELS endpoints have bounded international abuse/cost controls;
- logs/alerts distinguish traffic growth from abuse without treating nationality as proof of maliciousness.

**G6 rule:** no country hard-block is introduced merely because international traffic increases.

## Stage S6 — later major gates / maintenance

At G7/G8 and after material new capability classes:

- rerun Supabase security advisors and the active-RPC inventory;
- review dependency/supply-chain scanning and pinned lockfiles;
- retest recovery and rollback;
- review new secrets/providers/webhooks;
- re-run Redesign-Risk / independent skeptic security lens;
- retire unused privileged entrypoints only after consumer proof.

Do not create a permanent parallel security truth system. Findings route to existing owners, work_log/audits and release evidence.

## Decision table

| Moment | What we do | What we deliberately do not do |
|---|---|---|
| NOW / G4 | inventory, negative tests, critical fixes only | broad blind revocation / country blocking |
| Before Public Cutover | main authorization + Edge + release + recovery hardening gate | defer active high-impact gaps |
| G4 closure | reconcile final Golden dependency graph | reopen all G3/G4 architecture |
| Before first live G5 money/credits | payment/entitlement-specific hardening | launch billing and “secure later” |
| Before broad G6 international rollout | global abuse/crawler/locale security gate | assume foreign traffic = bad traffic |
| G7/G8 / major additions | incremental re-audit | rebuild a second security platform |

## Target posture

Heuristic target only:

- before Public Cutover: move the current overall posture toward **90–93/100** by reducing unintended privilege and proving release/recovery boundaries;
- before/through G5 paid activation: target **94–96/100** by proving financial/entitlement integrity;
- G6 should preserve or improve that posture under broader exposure.

There is no meaningful permanent 100/100. The durable target is: least privilege, observable side effects, tested negative paths, bounded blast radius, recoverability and no silent security weakening.

## Change authority

This plan itself authorizes no DB, grant, RLS, Edge policy, firewall, rate-limit, Turnstile, ASN, payment or production-security mutation.

- read-only audit/measurement may proceed under existing owners;
- critical exposure may be proposed immediately;
- DB/policy/grant/security-control changes require the applicable Human Gate;
- weakening security always requires explicit Human Gate;
- destructive/irreversible cleanup requires replacement + consumer + recovery evidence.
