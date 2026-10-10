# SOD1820 — Codex and AI Spending Guard V1
Date 2026-10-10. User-approved OPERATING POLICY, not a claim of provider-enforced limits.
Existing owners: 2029 Cost Control V1.1 /2029/control, Codex GPT actor coordination via work_log_current, remote bridge REMOTE_CODEX_EXECUTOR_BRIDGE_V1.

## Approved monthly additional purchases
- User already purchased $50 of ChatGPT/Codex credits; treat as historical purchased amount, verify actual receipt/date before ledger ingestion.
- Additional purchases approved for budget planning ceiling: **up to USD 50 per month beyond that prior USD 50 purchase**, starting October 2026. This is an approval ceiling for planning, not authorization to purchase. **Every new purchase requires fresh explicit user approval, even under the ceiling.**
- This is not the full project expense cap (ChatGPT Pro, Vercel, Supabase, Claude and Gemini remain part of full-cost reports), and does not represent an OpenAI API rate limit.
- No auto-reload; do not turn on automatic top-ups. Do not charge, create an API key, or enable remote runner spending based on this document.
- Monthly reset calendar month in user timezone Asia/Jerusalem unless changed by user; keep actual billing periods separate. Stop planned paid work when no verified remaining credit or when an authorized budget is exhausted. An alert without vendor hard-stop is NOT protection.

## Intelligent execution policy
- Default cheaper/adequate available Codex model and reasoning for bounded tasks; choose based on capability, risk and evidence, not marketing tier names.
- Use higher reasoning only for complex architecture, canonical ELS, privacy/auth/security, production-impacting changes, or failed test/review escalation.
- Max-effort, deep scans, unrestricted multi-agent exploration and high-speed premium modes require a separate explicit per-task user approval **before** execution, including estimated upper-limit and reason.
- Each task has explicit intent, bounded files/scope, quality gates, stop conditions, max iteration/retry/deep-scan budget, owner and chosen model/effort; no silent retries indefinitely.
- Test fidelity and correctness never sacrificed for saving: independently verify security, source truth and canonical ELS.
- Provider model selection must match supported runtime capabilities; do not promise auto-selection for unmanaged Codex Cloud sessions.

## Ledger and reporting
- Log ChatGPT subscription, Codex prepaid *purchase*, balance if independently provider verified, consumption when available, assigned task, provider/model/effort, input/output tokens if available, unknown usage and source freshness.
- No double counting topups and credit consumption as two cash expenses; track cash vs consumed balance separately.
- At task close record task outcome, verified token/credit impact or UNKNOWN, and change rationale.
- Alert at 50%, 80%, 95% of additional USD 50 spending ceiling and when data is stale or absent. Until a supported and tested vendor billing API/limit mechanism exists, alerts are advisory and human monitored, not automatic enforcement.
- Ensure admin-only access, minimal scopes, no billing secrets/client exposure.

## Enforcement truth and release gate
Checked accessible connectors 2026-10-10: GitHub/Supabase can store policy and budget planning; OpenAI Platform connected tool supports API key setup but does NOT expose the ChatGPT/Codex personal credit balance, additional-credit purchase controls or hard-stop. Remote Codex Vercel Sandbox probe stopped, CLI not authenticated via ChatGPT; remote executor remains blocked. No actual ChatGPT spending limit or model-selection router has been installed. Provider settings such as auto-reload must be verified by user in their own billing interface.
Until external credit visibility, remote auth and an enforceable per-task execution wrapper are tested, status is **POLICY_DEFINED_NOT_AUTOMATICALLY_ENFORCED**.
No source/product DB schema change, no key creation, no paid setting changes, no merge/release other than this approved policy document through separately authorized review.
