# Raziel Action Contract v1

Status: BRANCH-ONLY / STACKED ON PR #630 / NO PUBLIC CUTOVER

Owners: `research_strategy_layer_law v15` + `raziel_companion_layer_law v3` + `research_workspace_law v4`.

## Purpose

Translate the already-resolved `plan.route_grammar` into one bounded semantic continuation using the existing Research Result Bundle `next_actions` seam.

This is not a new router, action store, UI system, navigation engine, or message engine.

## One-Synthesis invariant

The action contract never writes answer text.

- If a canonical Synthesis exists, message authority is `bundle.synthesis`.
- The Raziel action envelope records only the selected human action and the existing product home that can serve it.
- It must never copy, rewrite or mint a second Synthesis/message.

## Envelope

Canonical action key: `raziel_route`.

It may carry:
- route action: understand / research / connect / continue;
- human label;
- task mode;
- preferred existing product home;
- requested_by: user language or surface default;
- surface + subject type only;
- reason codes from Route Grammar;
- in-place-first delivery intent;
- preserve-context / exact-return handoff requirements;
- Synthesis state/reference authority;
- bounded coverage summary;
- alternate human actions.

It may not:
- navigate;
- execute a capability;
- authorize access;
- rank truth;
- promote governance;
- generate local answer text.

## Spoof boundary

Caller-supplied `next_actions` remain supported, but a caller-provided `action="raziel_route"` is discarded and replaced from the canonical Research Plan.

Other existing continuation actions are preserved.

## Silence Gate

No Raziel route action is projected when there is no meaningful Research Context:
- no question;
- no primary identity;
- no surface subject/target.

This prevents a generic background suggestion from becoming a fake research path.

## Runtime boundary

This slice changes Research composition only.
It does not touch:
- SystemFrame2029 / PR #629;
- public Raziel UI;
- routes;
- DB/schema/RLS;
- provider/model calls;
- release/main/production.

Future public Raziel may consume this action envelope only after the existing Human Visual / live adapter gates.
