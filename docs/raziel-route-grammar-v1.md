# Raziel Route Grammar v1

Status: BRANCH-ONLY / STACKED ON PR #627 / NO PUBLIC CUTOVER

Owners: `research_strategy_layer_law v15` + `experience_governance_foundation_v1_law v7` + `research_workspace_law v4` + `raziel_companion_layer_law v3`.

## Purpose

Raziel should not expose the site's architecture as a menu of internal products. He should understand the human job in the current context and translate it into the existing Research OS.

The stable public action grammar is:

1. **להבין** — מה אני רואה כאן?
2. **לחקור** — איך בודקים את זה לעומק?
3. **לחבר** — מה מתחבר לזה?
4. **להתקדם** — לאן זה מוביל מכאן?

These are semantic actions, not routes, tools, engines or truth states.

## Existing surface roles

- Current surface / Number / Post: explanation can stay in place when possible.
- Heichal: deep research / verification / execution.
- World: typed connections and context.
- Journey: path continuity / why-transition / next meaningful branch.
- Raziel: chooses and explains the next useful action over the same Research Context.

No second router, memory, engine, capability registry or persona is created.

## Data-informed calibration · 2026-09-23

Live traffic was used to choose the first route grammar, not to create permanent ranking truth.

Observed 90-day patterns included:
- Number as a dominant entry/use surface.
- Large direct entry into Posts/content.
- repeated AI ↔ Research transitions.
- meaningful ELS / Gematria usage by a smaller deep-research cohort.
- Journey interest with materially weaker completion than starts.
- concierge queries spanning names, numbers, learning, explanation and navigation.

Interpretation for product design:
- Raziel is primarily a contextual guide over the site, not a standalone chat destination.
- The next action should be contextual and bounded.
- User language overrides the default surface action.
- When the user does not state a goal, the existing Experience surface role provides the default.

Analytics are **calibration evidence only**. They do not:
- determine truth;
- permanently rank capabilities;
- remove low-volume capabilities;
- change access/entitlement;
- replace Human Gate decisions.

## Deterministic inference

Examples:
- "מה זה 1820?" → UNDERSTAND
- "תחקור לי את השם שלי" → RESEARCH
- "מה הקשר בין 455 ל-424?" → CONNECT
- "תמשיך מהמסע" → CONTINUE

When language is not explicit:
- World → CONNECT
- Journey → CONTINUE
- Heichal / ELS / Books / Inspect / Trace → RESEARCH
- Number / Expression / Post / Home → UNDERSTAND

This inference is a planning hint only. Canonical owners still decide which capabilities may execute.

## Research Plan integration

`buildResearchPlanV2()` now carries `route_grammar` additively.

It does not replace:
- `strategy`;
- `requested_capabilities`;
- `check_order`;
- access/privacy resolution;
- Result Bundle;
- Synthesis;
- Contextual Prominence;
- Presentation Focus / Silence Gate.

Expected future chain:

`user/context → Route Grammar hint → Research Plan → canonical capabilities → Result Bundle → Synthesis → Contextual Prominence → Raziel/Experience projection`

## Release boundary

This slice does not modify SystemFrame/Raziel UI and does not touch PR #629.
Human Visual Gate for #629 remains independent.
Official public Raziel conversation integration remains a later adapter/cutover step.
