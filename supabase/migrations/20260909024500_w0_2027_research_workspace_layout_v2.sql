-- W0 2027 canonical owner reconciliation — reproducibility for DB-LIVE rule updates.
-- Human Gate: ZURIEL, 2026-09-09.
-- EXTEND_EXISTING only: research_workspace_law v2 + workspace_layout_standard v2.
-- No schema/engine/store creation. Historical v1 rows remain preserved and inactive.

begin;

update public.nodes
set is_active = false
where type = 'rule'
  and rule_id = 'research_workspace_law'
  and rule_version <> 2
  and is_active = true;

insert into public.nodes (
  id, type, label, description, metadata, is_active, created_at,
  rule_id, rule_version, depends_on, supersedes_version, weight,
  hebrew_date, axis_theme, identity_key
)
select
  gen_random_uuid(),
  'rule',
  'חוק סביבת המחקר v2 — Research OS רציף + Adaptive Research Experience',
  $body$
[v2 · Human-Gate ZURIEL · 9.9.2026 — 2027 ADAPTIVE SUPERSESSION]

OWNER: Research OS / research workspace behavior. EXTEND_EXISTING; this v2 supersedes presentation-specific v1 while preserving its useful capability semantics and history.

CORE INVARIANTS
1. ONE RESEARCH OS. ResearchProvider/Research Context/Research Bus and the existing governed research/personal stores remain the shared substrate. No second Workspace, Context store, graph, saved-items system, Journey store or AI truth store may be created for a new surface.
2. CONTEXT NEVER DISAPPEARS. Subject/root, selection, dimensions/lens, Journey position and exact return references travel across Number/Phrase, Book, ELS, World, Heichal, Post and other projections through the canonical Research Context/Journey owners. Context is navigation/research state, never truth.
3. PAGE DUALITY. First-class products/content may remain directly addressable and SEO/deep-link capable while also participating in the shared Research OS. Heichal is optional deep-research mode, never a mandatory gateway.
4. PERSONAL IS A PROJECTION. My Workspace composes research items, saved state, Journeys, notifications/messages, contributions, profile, credits/access/preferences from their existing owners. It is not a duplicate research system.
5. SEMANTIC ACTIONS, NOT FIXED BUTTONS. Add-to-research, save, share, inspect, compare, run-tool, ask-Raziel, return-exact and related actions keep one semantic capability identity while presentation may be toolbar, dock, palette, rail, sheet, shortcut or contextual control. Reuse canonical components/readers when they exist.
6. LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED. Do not destroy or orphan existing personal research state during shell migration.
7. PROGRESSIVE DISCLOSURE + MOBILE-FIRST remain product requirements: simple first use, deeper capability on demand, keyboard/mobile/accessibility equivalents for graph/drag interactions.
8. TRUTH/HUMAN GATE. Tool/AI output is typed research state with provenance; AI may calculate through governed engines, interpret, rank and recommend but does not independently canonicalize or publish.
9. EVENT/OBSERVABILITY CONTINUITY. Meaningful actions emit/track semantic events through existing event/telemetry owners. UI placement/button IDs are not analytical identity.
10. VISUAL LANGUAGE IS NOT OWNED HERE. Colors, typography, spacing, motion and theme belong to the Design/semantic-theme owners and may be redesigned without changing Research OS semantics.

2027 ADAPTIVE SHELL SUPERSESSION
- v1 wording that mandates a fixed Header + Navigation + Footer, a fixed desktop side column, one permanent Bottom Sheet form, a fixed four-zone screen, or a specific palette is historical presentation guidance and is superseded.
- The shell may project a persistent Orientation Header, a collapsible desktop Global Navigator/Sidebar, adaptive commands, contextual inspector, Raziel companion and My Workspace entry. Capability is stable; placement is responsive/task-specific.
- Full-focus/fullscreen Book/ELS/Heichal/World modes are allowed when orientation, context, return path, accessibility and safe overlay behavior remain recoverable.

NUMBER/PHRASE BRIDGE
Number/Phrase remains directly addressable and connected now; full redesign is deliberately deferred until the wider 2027 system is visible. Preserve current high-value capabilities: vitality/pulse; convergence snapshot/map; real method-switching state with downstream updates; cross-method/hidden intersections where governed; AI number analysis re-presentable through Raziel; Discovery Engine findings; sources/relations/Books/ELS/Posts/Galleries/Events; save/research/return continuity. Presentation may later be rebuilt from first principles without dropping these capability contracts.

IMPLEMENTATION-HONESTY
Historical v1 claims that a canonical <ToolActions> merge already existed were later proven stale. Current implementation must always be verified from origin/main before claiming a component is implemented. Preserve capability intent, not stale implementation claims.
  $body$,
  jsonb_build_object(
    'owner_routing', jsonb_build_object(
      'domain','research_os',
      'canonical_owner','docs/research-studio-v1-contract.md',
      'resolution','EXTEND_EXISTING',
      'normalized_at','2026-09-09'
    ),
    'architecture','adaptive_2027',
    'one_research_os',true,
    'page_duality','direct+SEO and integrated Research OS',
    'context_continuity',true,
    'my_workspace_projection',true,
    'heichal_optional_deep_mode',true,
    'fixed_layout_required',false,
    'fullscreen_allowed_with_context',true,
    'visual_owner','SOD1820_DESIGN_CONTRACT_V1.md',
    'number_phrase_bridge','CONNECT NOW · REDESIGN LATER',
    'supersession_note','v1 preserved as history; v2 supersedes presentation-specific layout/palette/product-naming clauses'
  ),
  true,
  now(),
  'research_workspace_law',
  2,
  array['reality_graph_law','truth_axes_foundation_law']::text[],
  1,
  1,
  null,
  null,
  null
from public.nodes old
where old.type = 'rule'
  and old.rule_id = 'research_workspace_law'
  and old.rule_version = 1
  and not exists (
    select 1 from public.nodes x
    where x.type='rule' and x.rule_id='research_workspace_law' and x.rule_version=2
  )
limit 1;

update public.nodes
set is_active = (rule_version = 2)
where type='rule' and rule_id='research_workspace_law';

update public.nodes
set is_active = false
where type = 'rule'
  and rule_id = 'workspace_layout_standard'
  and rule_version <> 2
  and is_active = true;

insert into public.nodes (
  id, type, label, description, metadata, is_active, created_at,
  rule_id, rule_version, depends_on, supersedes_version, weight,
  hebrew_date, axis_theme, identity_key
)
select
  gen_random_uuid(),
  'rule',
  'תקן סביבת המחקר v2 — Semantic Zones + Adaptive Layout',
  $body$
[v2 · Human-Gate ZURIEL · 9.9.2026 — ADAPTIVE LAYOUT SUPERSESSION]

OWNER: semantic workspace responsibilities and adaptive layout behavior. EXTEND_EXISTING. v1 history is preserved; its fixed three-column geometry and no-fullscreen prohibition are superseded.

SEMANTIC ZONES — PRESERVED
A research surface must still make three responsibilities understandable:
- WORK / PRIMARY TASK — the active reading, exploration or tool canvas is the dominant focus.
- YOU / PERSONAL-CONTEXT — identity, owned research, saved/collected state, Journey/resume and personal attention are reachable through the canonical personal/Research OS owners.
- TOOL / INSPECT — current tool capabilities, live results, provenance/trace, relations and contextual inspection are reachable without becoming a second workspace.

These are semantic responsibilities, NOT mandatory columns.

ADAPTIVE RENDERING
- Desktop may use a collapsible Global Navigator/Sidebar, main workspace, Raziel companion, inspector, floating/contextual command dock or palette.
- Tablet may use one/two-pane adaptations.
- Mobile is task-first: one dominant task with drawers/sheets for navigation, commands, inspector, Raziel and My Workspace.
- Reading Mode may suppress most chrome while preserving recoverable orientation/context.
- Heichal/ELS/Book/World or other deep tools MAY use full-focus/fullscreen presentation. They must preserve a clear exit/return, current Research Context, accessibility, safe-area/overlay behavior and a recoverable global orientation path.

GLOBAL RESPONSIBILITY SPLIT
- TOP/ORIENTATION = where am I / current focus / root/path.
- GLOBAL NAVIGATION = what major product areas can I enter; on desktop it may be a collapsible sidebar, on mobile a drawer/sheet, on keyboard a command/search projection.
- ADAPTIVE COMMANDS = what can I do now; a bottom dock is allowed and useful where appropriate but is not mandatory on every desktop/surface.
- RAZIEL = one global companion capability using the same authorized context.

LAYOUT MUST NOT OWN SEMANTICS
No rail, column, sidebar, bottom dock, drawer or panel becomes the owner of saved research, notifications, truth, access, AI, graph or tools. Moving a capability between surfaces does not fork it.

ACCESSIBILITY / RESPONSIVE
All essential graph/drag/gesture actions need list/keyboard/mobile alternatives; visible focus, semantic labels and status not conveyed by color alone. Avoid viewport traps, hidden fixed layers and horizontal overflow; mobile safe-area applies.

NUMBER/PHRASE
Do not force the Number/Phrase core into a new column layout now. Connect it to the new Shell/Context/World/Journeys/Raziel/Books/ELS/My Workspace first; final page composition comes later. Existing signature modules may remain recognizably structured while the surrounding shell evolves.
  $body$,
  jsonb_build_object(
    'semantic_zones', jsonb_build_array('work','you/personal-context','tool/inspect'),
    'fixed_column_count',null,
    'three_column_required',false,
    'fullscreen_allowed',true,
    'desktop','adaptive sidebar/workspace/companion/inspector/commands',
    'mobile','task-first + drawers/sheets',
    'orientation','persistent/recoverable',
    'global_navigation','sidebar|drawer|command projection',
    'commands','adaptive; bottom dock optional by surface',
    'approved_by','ZURIEL',
    'approved_on','2026-09-09',
    'supersession_note','v1 fixed 3-column geometry and no-fullscreen rule are historical; semantic responsibilities preserved'
  ),
  true,
  now(),
  'workspace_layout_standard',
  2,
  array['research_workspace_law']::text[],
  1,
  1,
  null,
  null,
  null
from public.nodes old
where old.type = 'rule'
  and old.rule_id = 'workspace_layout_standard'
  and old.rule_version = 1
  and not exists (
    select 1 from public.nodes x
    where x.type='rule' and x.rule_id='workspace_layout_standard' and x.rule_version=2
  )
limit 1;

update public.nodes
set is_active = (rule_version = 2)
where type='rule' and rule_id='workspace_layout_standard';

commit;
