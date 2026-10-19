# Coordination reader gateway v1 (addendum — not a new system)

Extends the existing `public.work_log_current` projection under `inter_agent_coordination_law` v17. No new log, queue, table, role or contract. Status: **BRANCH-ONLY / NOT APPLIED / NOT DEPLOYED**.

## Components
| Piece | File | State |
|---|---|---|
| Read RPC `coordination_read_current` (SECURITY DEFINER, 12 columns, ≤50 rows, fails closed `42501`) | `supabase/migrations/20261019180000_work_log_coordination_reader_v1.sql` | committed on branch, not applied |
| MCP façade (one read-only tool `coordination_check`, no service key, forwards caller JWT) | `supabase/functions/coordination-mcp/` | not deployed |
| Gateway tests (Node) | `scripts/test-coordination-reader-gateway.mjs` | 9/9 pass locally |
| DB permission tests | `tests/sql/coordination_reader_v1.sql` | **not yet run** (needs isolated branch DB) |

## Identity and revocation
Each agent family signs in via Supabase Auth OAuth 2.1 (MCP flow) as its own Auth user. An admin sets `app_metadata.sod1820_coordination_reader=true` (server-side only). Revoke = remove flag or ban user; tokens expire on their own. No shared secret, no `service_role`, no secret copied between sessions.

## Owner actions required (Human Gate)
1. Approve + apply the migration (Supabase branch first, then production); run `tests/sql/coordination_reader_v1.sql` on the branch.
2. Enable Auth **OAuth 2.1 server** + build/enable the consent screen (Supabase docs: MCP Authentication); decide on dynamic client registration.
3. Create one Auth user per agent family (GPT/ChatGPT, Codex, Work, Claude Code) and set the flag.
4. Deploy `coordination-mcp` (`supabase functions deploy --no-verify-jwt coordination-mcp`; verification is enforced inside Postgres).
5. Register the connector URL `https://linswmnnkjxvweumprav.supabase.co/functions/v1/coordination-mcp` in each platform.

## Platform support (verify per platform; nothing is assumed to carry over)
- **Claude Code:** remote HTTP MCP with OAuth — expected to work; project `.mcp.json` entry makes it automatic. Unverified until step 5.
- **ChatGPT:** custom MCP connector is per-workspace/per-user setting; cannot be provisioned from the repo. One-time owner setup, then persistent for that workspace.
- **Codex Cloud:** plugin attachment is per task interface (see AGENTS.md); not provable from repo config.
- **Work:** unverified.
Where a platform cannot hold a persistent authenticated connector, the supported fallback is `COORDINATION_UNVERIFIED` + READ_ONLY work, or ZURIEL-supplied output of `coordination_check`. No bypass.

## Known limitation
Supabase's own docs state Auth-protected MCP on Edge Functions is not yet a first-class pattern; this design validates the JWT in Postgres instead. Treat as unproven until acceptance below passes.

## Acceptance (not yet done)
Fresh separate sessions per platform: connector auto-listed → `coordination_check` returns rows → write/`what_we_did` attempt fails → expired token = `COORDINATION_UNVERIFIED` → flag removed = denied → re-grant restores. Record in `work_log` as passive AFTER to ZURIEL.
