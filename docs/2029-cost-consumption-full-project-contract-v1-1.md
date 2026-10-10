# SOD1820 — Full Project Cost & Consumption Contract V1.1

Date: 2026-10-10
Status: APPROVED SCOPE, BRANCH-ONLY IMPLEMENTATION; NOT DEPLOYED
Human Gate: Zuriel
Parent task: SOD1820_2029_COST_CONTROL_V1
Existing owner: /2029/control, ControlPlane2029Page, canonical AI cost owners and aiProviderRouter. Extend, do not fork.

## Non-negotiable
Count all SOD1820 expenses, whether personal subscription or direct site spend. Preserve OpenAI, Anthropic Claude and Google Gemini integrations/routing. No provider removal, key rotation, billing change, model default change, purchase, auto-reload, deployment, main merge, or live schema migration without explicit approval. Claude Pro cancellation is distinct from Anthropic API availability.

## Full coverage
Include ChatGPT Pro/subscription, Work/Codex credits/usage resets if paid, OpenAI API credits and usage, Claude Pro/Max and Anthropic API, Gemini subscriptions and Gemini API, Vercel Pro/Speed Insights/Observability/build/CDN/Sandbox, Supabase Pro/DB/Storage/Egress/PITR/backups, GitHub/CI, domains, email/Workspace/Microsoft 365, WhatsApp/GREEN-API, WordPress/plugins, Zapier/Notion/Dropbox/Canva/Descript, Cardcom/processing fees, media/transcription/social promotion, software, contractor and other project spending. An inventory listing does NOT imply an active paid subscription.

For each expense retain vendor, safe billing-account alias, category (Development/Site Runtime/Media/Distribution/Commerce/Admin), billing period and cadence, actual charge date, next renewal, invoice and currency, amount before/after tax, refund/discount, payment status, source citation, verification time, full paid cash flow and optional owner-controlled allocation percentage for mixed personal work. User-designated expenses default to 100% project cost until owner changes allocation.

## Money truth
Present separately 1) confirmed paid/billed cash outflow, 2) utilization/consumption, 3) estimated forecast, 4) unknown/missing sources. Never double count prepaid top-ups and their later consumption, invoices plus span/token estimates, or partial and renewal charge as two monthly fees. Exchange conversion is a derived dated view; original amounts/currencies preserved.
Certainty: PROVIDER_BILLED_EXACT, PROVIDER_USAGE_EXACT, INTERNAL_MEASURED, ESTIMATED, MANUALLY_VERIFIED, UNKNOWN, STALE. Data that cannot be fetched stays visibly UNKNOWN; no invented global total.

## Verified snapshots (historical not current)
ChatGPT Google Play Oct 8: Plus 73 ILS/mo -> Pro 309.90 ILS/mo; prorated 210.30 ILS at switch; renewal planned Nov 5. OpenAI API $5 prepaid topup Sep 15 (not spend). Vercel invoice paid Oct 4 $46.22, including Pro $20 and prior cycle Build CPU $19.55; Speed Insights Plus +$10/mo notice if retained. Supabase Sep 11 invoice paid $30.33; current cached-egress billing remains UNKNOWN until provider source. Claude Pro cancellation Oct 9 effective expiry Nov 7; preserve historical and API costs. Internal agent_token_costs shows Anthropic/Gemini usage but is NOT provider invoice.

## UX integration
Extend existing private /2029/control: monthly costs/renewals/credits/alerts/provider completeness, per-model and task usage, forecasts and what-if routing. Preserve canonical SystemFrame2029, Design Contract V2, current admin auth, tracing and costs; no second dashboard or accounting engine. Provider connectors run server-side with least privilege; never expose credentials, full private emails, personally identifying payment data or billing API tokens to public clients. Links to source records are admin-only.

## Smart routing
Retain all three providers; recommend cheap/fast model for simple tasks, robust model for complex or critical ones; allow user review, validation and escalation. Do not auto-switch model or remove fallback until A/B quality, latency and true cost are verified. No AI call for deterministic gematria where canonical engine suffices.

## Engineering handoff
Use existing canonical owner index and bounded work_log_current; one active writer per scope. Branch-only implementation with tests, mobile a11y and preview. Server-secured provider adapters, provenance and monthly reconciliation. Show missing provider data honestly. No main push, merge, live production DB changes, paid services or credential rotation.
Acceptance: 100% known provider inventory; evidence-linked actual vs forecast; prepaid de-dup; historical contract consistency; current billing source gaps; cost alerts and routing what-if, with clear UNKNOWN statuses. Human Gate explicitly approves release.

## Remote Codex
Separate task REMOTE_CODEX_EXECUTOR_BRIDGE_V1. Cloud runner not yet authenticated; a saved work_log task is not automatic execution. Continue with isolated authenticated runner and harmless read-only dispatch probe before linking to work_log.
