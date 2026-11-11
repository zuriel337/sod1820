# P0 patch specification — release policy / 2029 = Production (prepared 10–11.11.2026, NOT EXECUTED).
# Each op: ("frag", old, new)  -> exact substring, must occur exactly once in the base text
#          ("line", n, expected_prefix, new_line) -> replace whole base line n (1-based); base line must start with expected_prefix
#          ("after_line", n, expected_prefix, inserted_text) -> insert text after base line n

V18_HEADER = (
    "\n"
    "הוראת צוריאל מחייבת — 10.11.2026 (v18): 2029 הוא Production והמוצר הפעיל היחיד; אין הרשאת שחרור עומדת.\n"
    "2029 עלה ל-Production ב-4.11.2026 ו-Legacy פרש ב-5.11.2026 (קוד Legacy נשמר בהיסטוריית Git בלבד ואינו יעד פריסה, Preview או חזרה). "
    "סעיפים 75, 79 ו-80 (v12) תיארו את המצב שלפני המעבר והם היסטוריים; 76–78 נשארים בתוקף כעיקרון: חומר Legacy הוא ראיה היסטורית בלבד, לא סמכות עיצוב או ארכיטקטורה. "
    "כל מיזוג ל-main וכל פריסה ל-Production מחייבים אישור מפורש של צוריאל לפעולה המסוימת (deploy_on_request, הגרסה הפעילה). "
    "ההרשאה העומדת והשחרור האוטומטי של v13 (סעיפים 82, 86, 87) בוטלו; ייעוץ השחרור (81, 83–85, 88) נשאר, ותוצאתו המלצה לצוריאל — לעולם לא פעולה אוטומטית."
)

RULES = {
  "inter_agent_coordination_law": {
    "base_version": 17,
    "label": "Inter-Agent Coordination v18 — 2029 Production · Explicit Release Approval",
    "ops": [
      ("after_line", 3, "כל סעיף קודם בחוק זה", V18_HEADER),
      ("frag", "--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17 ---",
               "--- HISTORICAL V1–V16: conflicting communication clauses superseded by v17; production/release clauses 75–82 and 86–88 updated by v18 ---"),
      ("frag", "2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only]",
               "2029 TARGET / TEMPORARY LEGACY PRODUCTION BOUNDARY, additive; EXTEND_EXISTING only] — HISTORICAL PRE-CUTOVER STATE: superseded by v18 (10.11.2026); 2029 = Production since 4.11.2026"),
      ("frag", "75) TEMPORARY LEGACY PRODUCTION.", "75) [HISTORICAL · superseded by v18] TEMPORARY LEGACY PRODUCTION."),
      ("frag", "79) CUTOVER IS EXPLICIT.", "79) [HISTORICAL · cutover executed 4.11.2026 by explicit ZURIEL decision; Legacy retired 5.11.2026] CUTOVER IS EXPLICIT."),
      ("line", 125, "80) FRESH-AGENT ACCEPTANCE.",
               "80) FRESH-AGENT ACCEPTANCE (updated by v18). A project-entry agent must be able to state without prior conversation memory: CURRENT PRODUCTION = 2029 (since 4.11.2026); Legacy is retired (5.11.2026) and is not a production, Preview or rollback target; TARGET ARCHITECTURE = 2029. Treating Legacy as current production is an entry-routing failure and must be reported as DRIFT. [Historical pre-cutover wording: CURRENT PRODUCTION = legacy/transitional until explicit cutover.]"),
      ("frag", "— DEPENDENCY-AWARE AUTO-RELEASE / RELEASE ADVICE · EXTEND_EXISTING]",
               "— DEPENDENCY-AWARE RELEASE ADVICE · EXTEND_EXISTING · standing auto-release revoked by v18 (10.11.2026)]"),
      ("frag", "release-advice states from deploy_on_request v2", "release-advice states from deploy_on_request (active version)"),
      ("line", 131, "82) AUTO-RELEASE ON CLEAN STATE.",
               "82) [REVOKED by v18 · 10.11.2026] EXPLICIT APPROVAL, NO AUTO-RELEASE. A clean live preflight (GATE-CLEAN + DEPENDENCIES-CLOSED + CI/GOLDEN/SECURITY CLEAN as applicable + NO OVERLAP) makes a scope READY_FOR_APPROVAL; the Primary Owner presents the exact commit/deployment to ZURIEL and merges, applies migrations or deploys only after his explicit approval of that specific action. [Former v13 text: auto-release on clean state under standing authorization, without a second user prompt.]"),
      ("line", 135, "86) AUTO-RELEASE DOES NOT AUTO-CANONICALIZE.",
               "86) RELEASE APPROVAL DOES NOT CANONICALIZE. There is no standing release authorization (v18). Approval of a release does not grant autonomous governed-truth publication, destructive irreversible changes, pricing/economics, or other explicitly Human-Gated product decisions. Those remain separately gated."),
      ("frag", "creates a release hold in coordination context and overrides standing authorization until lifted.",
               "creates a release hold in coordination context until lifted."),
      ("frag", "blocker if any; next auto-action.",
               "blocker if any; next proposed action (a merge, deploy or DB action still awaits ZURIEL's explicit approval)."),
      ("frag", "without asking ZURIEL what to upload.",
               "without asking ZURIEL what to upload; approval of the action itself is still required."),
      ("frag", "OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request v2. No new queue/release store/registry.",
               "OWNER CHECK: EXTEND_EXISTING inter_agent_coordination_law + deploy_on_request (active version). No new queue/release store/registry."),
      ("frag", "SOD1820_DESIGN_CONTRACT_V2.md + palette.js/designTokens.js (values)",
               "SOD1820_DESIGN_CONTRACT_V2.md + paletteTokens2029.js/designTokens.js (values; palette.js was removed on 5.11.2026)"),
    ],
  },
  "foundation_closure_protocol_law": {
    "base_version": 7,
    "label": "Foundation Closure Protocol v8 — Bottom-Up Closure + Explicit Release Approval",
    "ops": [
      ("frag", "— STANDING AUTO-RELEASE BINDING · EXTEND_EXISTING]",
               "— RELEASE BINDING · EXTEND_EXISTING · standing auto-release revoked by v8 (ZURIEL 10.11.2026)]"),
      ("line", 94, "AUTO-RELEASE BINDING.",
               "RELEASE BINDING (v8). Once a bounded release scope has satisfied every applicable lower MUST, gate, dependency, current-main reconciliation, required specialist/security/privacy acceptance and release recovery condition, it is READY_FOR_APPROVAL: the Primary Owner presents the exact commit/deployment to ZURIEL and releases only after his explicit approval of that specific action (deploy_on_request, active version). Gate-clean is a precondition, never an authorization; there is no standing release authorization."),
      ("line", 95, "NO-SKIP REMAINS ABSOLUTE.",
               "NO-SKIP REMAINS ABSOLUTE. Explicit approval does not weaken any Foundation MUST or acceptance standard. קדימה/תעלה never waive a blocker."),
      ("frag", "paid product economics, major Legacy→2029 production cutover, material privacy/security weakening",
               "paid product economics, material privacy/security weakening"),
      ("frag", "whether the scope is AUTO_RELEASE_NOW, BUNDLE_WITH,",
               "whether the scope is READY_FOR_APPROVAL (formerly AUTO_RELEASE_NOW), BUNDLE_WITH,"),
      ("frag", "OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request v2. No new gate system.",
               "OWNER CHECK: EXTEND_EXISTING foundation_closure_protocol_law + deploy_on_request (active version). No new gate system."),
    ],
  },
  "system_suggestions_law": {
    "base_version": 5,
    "label": "System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval",
    "ops": [
      ("frag", "רכיב: SystemSuggestionsTab.jsx.",
               "רכיב: SystemSuggestionsTab.jsx (מסוף הניהול הישן; הוסר ב-5.11.2026, #1239)."),
      ("frag", "CI/Golden/security checks and no writer overlap under deploy_on_request v2.",
               "CI/Golden/security checks and no writer overlap, and then only with ZURIEL's explicit approval of the exact merge/deploy (deploy_on_request, active version; no standing authorization)."),
    ],
  },
}

CODEX = {
  4: {  # publishing_conventions
    "slug": "publishing_conventions",
    "ops": [
      ("frag", "- Same Post identity in legacy and 2029.",
               "- Same Post identity across historical (WordPress/Legacy-era) records and 2029."),
      ("frag", "CSS חדש במקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.",
               "CSS חדש במקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)"),
      ("frag", "מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.",
               "היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה."),
      ("frag", "בדוק תצוגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר.",
               "בדוק תצוגה בפועל במובייל/דפדפן ב-2029."),
      ("frag", "—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——",
               "—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——"),
      ("frag", "כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified",
               "כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified"),
      ("frag", "אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד;",
               "אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל;"),
    ],
  },
}
