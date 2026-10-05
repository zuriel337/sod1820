# Raziel × Number AI analysis — cost policy (RAZIEL_NUMBER_ANALYSIS_COST_ROUTE_V1)

> Branch-proof documentation only. Not an owner, store or router; the governing owners are the live
> `raziel_companion_layer_law`, `raziel_routing_law`, `ai_analyze_contract`. Encoded by `test/number-ai-analysis-2029.test.mjs`.

1. **Deterministic / no-LLM first.** Number page renders facts from existing projections; initial render makes zero provider calls.
2. **Number quick interpretation = `L2_FAST`**: `aiAnalysis.analyze({kind:"number", fast:true})` → `ai-analyze` (Claude fast path). Only on explicit click.
3. **Deep Sonnet** only on explicit / decision-relevant depth (not triggered from this surface).
4. **Gemini = explicit compare** over the *same* subject/facts as the Claude call, until quality evidence exists. No automatic Gemini-primary promotion on price alone.
5. `raziel_config.shared.model_policy.routing_enabled` stays **false**; this work does not enable it.
6. No new prompt, provider router, cost store or cache store: the prompt/`KIND_HINT.number` lives only in `ai-analyze`; session memo is module-local.

## Routing DRIFT fixed in migration `20261005050000_raziel_route_token_boundary_match_v1.sql` (NOT applied live)
`fn_raziel_route` matched keywords by substring, so `ספר` matched inside `מספר` (Number sentence → Sandalphon). Now keywords and question
are normalized (`fn_raziel_norm`) and matched on token/phrase boundaries. Consequence: attached Hebrew prefixes (e.g. `בתנ"ך`) are no longer
implicit matches; add explicit keyword forms if needed. Regression: `scripts/run-raziel-route-boundary-sql-test.sh`.
