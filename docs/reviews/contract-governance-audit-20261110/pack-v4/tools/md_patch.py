"""Apply the focused md contract edits to the work branch (exact replacements, each must occur once)."""
import os, sys, json
REPO = '/home/user/sod1820'

NAMING = """

## Naming / product language law — carried from V1 · 11.11.2026

Carried from `SOD1820_DESIGN_CONTRACT_V1.md` (§ Naming / product language law) so that public naming is owned by the active 2029 contract (Owner Index: «visual language / typography / public naming» → V2). V1 keeps its copy as history; where they differ, this section governs. The bullets are V1's wording; one factual correction is marked inline.

- Public name: `היכל`, not `היכל הגילוי`.
- `דף המספר` remains the public Number/Phrase product name and `/number` remains its entry family.
- `עולם המספרים` and `עולם המספרים והגימטריה` are **not** formal future product/navigation names. They may appear only as ordinary descriptive prose when they are clearly not styled or routed as a named product/surface.
- Active navigation/build-map labels for the numeric family should use neutral descriptive wording such as `מספרים` / `מספרים וגימטריה` unless Human Gate explicitly renames the product later.
- Historical/archived references are preserved as provenance; they never override the current public product vocabulary. Before adding or restoring a public label, search the current Roadmap + this section for superseded names instead of copying text from older maps/contracts.
- The site-wide construction message describes the whole site, not only the Heichal.
- Never hard-code a lens label. The canonical labels are kingdom = `כי לה׳ המלוכה`, reality = `קוד המציאות`. *(Correction 11.11.2026: V1 said «Read it from `STREAMS`»; that constant no longer exists in the 2029 code, and several 2029 components currently repeat the literal labels — one shared source is an open follow-up for the Design/Experience owner.)*
- Before broad UI/copy changes, read `SOD1820_MASTER_ROADMAP.md` and current canonical sources.
"""

EDITS = {
  'SOD1820_DESIGN_CONTRACT_V2.md': [
    ("**Owner:** experience_governance_foundation_v1_law v9 → canonical_colors_law / canonical_ui_components_law / Brand Core",
     "**Owner:** experience_governance_foundation_v1_law (active version; v9 when written) → canonical_colors_law / canonical_ui_components_law / Brand Core"),
    ("Legacy binary consumers may continue to read light/dark. Parchment projects as light to Legacy compatibility. New 2029 UI reads the full preset.",
     "2029 UI reads the full preset. (Historical: until the Legacy removal of 5.11.2026, Legacy binary consumers read light/dark and Parchment projected as light for Legacy compatibility; those consumers no longer exist.)"),
    ("This refinement extends this existing contract and `palette.js`, without a new theme store, page palette or primary plan. Legacy palettes remain intact. Branch/Preview acceptance does not imply a production cutover.",
     "This refinement extends this existing contract and the canonical 2029 palette (`src/lib/paletteTokens2029.js` + `src/lib/palette2029.js`; the former `palette.js` and the Legacy palettes were removed on 5.11.2026), without a new theme store, page palette or primary plan. Branch/Preview acceptance does not imply a Production release; every merge and deployment needs ZURIEL's explicit approval."),
    ("- density changes introduce no horizontal page overflow and do not alter truth, publication, privacy, navigation or Legacy behavior.",
     "- density changes introduce no horizontal page overflow and do not alter truth, publication, privacy or navigation behavior."),
    ("through the existing `src/lib/palette.js`, `themeMode.js` and System Frame consumers.",
     "through the existing 2029 palette (`src/lib/paletteTokens2029.js` / `palette2029.js`), the theme preset store (`src/lib/themePreset2029.js`) and System Frame consumers (`palette.js` and `themeMode.js` were removed on 5.11.2026)."),
    ("replacement Brand artwork specification. `palette.js` owns all runtime values:",
     "replacement Brand artwork specification. `paletteTokens2029.js` (formerly `palette.js`) owns all runtime values:"),
    ("- Legacy remains Legacy until its own redesign pass.",
     "- [Historical] Legacy was retired on 5.11.2026; there is no Legacy redesign pass."),
    ("- `theme.js` is compatibility/Legacy; new 2029 visual semantics come from palette.js + designTokens.js.",
     "- `src/theme.js` is a documented removal residue awaiting ZURIEL's decision (REMOVAL.md); new 2029 visual semantics come from paletteTokens2029.js + designTokens.js."),
    ("- `chromeTheme.js` remains Legacy/global chrome owner until the future chrome architecture pass; do not create a second chrome palette.",
     "- `chromeTheme.js` was removed on 5.11.2026; do not create a second chrome palette."),
    ("6. Legacy routes are not mass-restyled accidentally;",
     "6. historical (WordPress-era) posts are not mass-restyled accidentally (former wording: «Legacy routes are not mass-restyled accidentally» — no Legacy routes remain since 5.11.2026);"),
    ("V2 successText/dangerText live in palette.js; success color requires a successful",
     "V2 successText/dangerText live in paletteTokens2029.js (formerly palette.js); success color requires a successful"),
    ("The original ShareActions and ResearchProvider remain behavior owners. Legacy\nQuickActions/DocActions are not silently replaced by this bounded 2029 projection.",
     "The original ShareActions and ResearchProvider remain behavior owners. The former Legacy\nQuickActions/DocActions were removed on 5.11.2026; this bounded 2029 projection is the active one."),
    ("while preserving these control meanings. Legacy palette values remain unchanged.",
     "while preserving these control meanings. (The Legacy palettes were removed on 5.11.2026.)"),
    ("__APPEND__", NAMING),
  ],
  'docs/sod1820-system-frame-contract-v2-addendum.md': [
    ("**Status:** ADDITIVE SUPERSESSION ADDENDUM · EXTEND_EXISTING · HUMAN-GATE ZURIEL · BRANCH ONLY UNTIL MERGED  ",
     "**Status:** ADDITIVE SUPERSESSION ADDENDUM · EXTEND_EXISTING · HUMAN-GATE ZURIEL · MERGED (in main; the former «BRANCH ONLY UNTIL MERGED» banner is historical)  "),
    ("Public labels used by the System Frame consume the current `SOD1820_DESIGN_CONTRACT_V1.md` Naming / product language owner and current Master Roadmap.",
     "Public labels used by the System Frame consume the Naming / product language law in `SOD1820_DESIGN_CONTRACT_V2.md` (carried from V1 on 11.11.2026; V1 keeps the historical copy) and the current Master Roadmap."),
  ],
  'docs/sod1820-system-frame-contract-v1.md': [
    ("During gated rollout, role/feature gates may temporarily show the new Dock to approved users while preserving legacy launchers for everyone else. Never remove a legacy entry point for users who cannot yet access its replacement.",
     "[Historical — completed: the gated rollout ended with the 2029 Production cutover (4.11.2026) and the Legacy removal (5.11.2026); no Legacy launchers remain.] During gated rollout, role/feature gates may temporarily show the new Dock to approved users while preserving legacy launchers for everyone else. Never remove a legacy entry point for users who cannot yet access its replacement."),
  ],
  'SOD1820_MASTER_ROADMAP.md': [
    ("Current coordination is v17 via AGENTS/Owner Index; the 22.10 Legacy lock and later explicit task restrictions govern this candidate.",
     "Current coordination resolves from the live owners via AGENTS/Owner Index; the 22.10 Legacy lock is historical (CLAUDE.md: «None of this is a current state or restriction»). Since 10.11.2026 (ZURIEL) every merge to main and every Production deployment requires explicit approval for the specific action; there is no standing authorization."),
  ],
  'SOD1820_CONTENT_FOUNDATION_CONTRACT.md': [
    ("קבצי-מסמך (חוזה/CLAUDE.md/Roadmap-anchor) על **ענף-בלבד, לא-מוזג, לא-פרוס**.",
     "קבצי-מסמך (חוזה/CLAUDE.md/Roadmap-anchor) היו ב-26.8.2026 על **ענף-בלבד, לא-מוזג, לא-פרוס**; המסמך נמצא כיום ב-main (עדכון 11.11.2026)."),
    ("(תכנוני בלבד · ענף-בלבד · לא-מוזג · לא-פרוס)",
     "(תכנוני בלבד · נכתב בענף; המסמך מוזג מאז ל-main — ראו PR #1278)"),
    ("[תכנון + מימוש בענף, ללא מיזוג/פריסה · ממתין ל-Human Gate]",
     "[תכנון + מימוש שלבי · נכתב בענף ומוזג ל-main ב-PR #1278 · מצב פריסה ושלבים נוספים: לבדוק מול Vercel ו-Human Gate]"),
  ],
  'docs/research-studio-v1-contract.md': [
    ("- **`convergence_one_per_value`** (locked `nodes type='rule'`):",
     "- **`convergence_one_per_value`** (was a locked `nodes type='rule'`; now inactive, history kept in `nodes`):"),
    ("(3-column standard, `ResearchProvider.jsx` + `ResearchCenter.jsx`) already exists.",
     "(3-column standard; `ResearchProvider.jsx` now lives in `src/lib/research/`, and `ResearchCenter.jsx` was removed on 5.11.2026) already exists."),
  ],
}
SECTION20_OLD = "- **`SOD1820_MASTER_STATE.md` §20 — Gate #18, Unified Judgment & Human-Gate Contract**, CLOSED 2026-08-23:"
SECTION20_NEW = "- **`SOD1820_MASTER_STATE.md` §20 — Gate #18, Unified Judgment & Human-Gate Contract** *(reference note 11.11.2026: §20 is no longer present in the compacted current Master State; the decision remains in git history)*, CLOSED 2026-08-23:"
EDITS['docs/research-studio-v1-contract.md'].insert(0, (SECTION20_OLD, SECTION20_NEW))

report = {}
for rel, pairs in EDITS.items():
    path = os.path.join(REPO, rel)
    t = open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old == '__APPEND__':
            t = t.rstrip('\n') + '\n' + new.lstrip('\n').join(['\n', '']) if False else t.rstrip('\n') + '\n' + new
            continue
        c = t.count(old)
        if c != 1:
            raise SystemExit(f'{rel}: occurs {c} times: {old[:80]!r}')
        t = t.replace(old, new)
    if not t.endswith('\n'):
        t += '\n'
    open(path, 'w', encoding='utf-8').write(t)
    report[rel] = len(pairs)
print(json.dumps(report, indent=1))
