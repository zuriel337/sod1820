// 🧭 מסע-המחקר של השם — שכבת-המיפוי היציבה (גל 3.1)
// הופכת את מסמך fn_name_protocol למבנה שה-UI צורך, בלי לחשוף שמות-סוכנים:
//   buildJourney(doc) → { header, steps, layers, raw }
// עקרונות-ברזל (החלטת צוריאל):
//   • כל צעד במסע נגזר מ-agents[].ok/ms/seq האמיתיים — לא אנימציה עצמאית.
//   • כל שכבה/ממצא נושא provenance (agent→fn). אין מקור → לא מוצג כעובדה.
//   • שמות-הסוכנים לא נחשפים — רק תוויות-משתמש ניטרליות.

// המסע: תווית-משתמש ניטרלית → אילו output_keys מזינים אותה. steps סינתטיים = שער/ניקוד/איחוד.
const STEPS = [
  { id: "gateway",   label: "מזהים ומנרמלים את השם",       keys: [], synthetic: "gateway" },
  { id: "numbers",   label: "בודקים את המבנה המספרי",       keys: ["gematria"] },
  { id: "tanach",    label: "מחפשים הופעות בתנ״ך",          keys: ["sources"] },
  { id: "letters",   label: "בוחנים אותיות וצורות",         keys: ["linguistics", "root"] },
  { id: "language",  label: "בודקים קשרים לשוניים",         keys: ["language"] },
  { id: "fills",     label: "בוחנים מילויים ותמורות",        keys: ["gematria"] },
  { id: "notarikon", label: "בוחנים ראשי-תיבות (נוטריקון)",  keys: ["notarikon"] },
  { id: "els",       label: "מחפשים דילוגים",               keys: ["els"] },
  { id: "network",   label: "בונים את רשת הקשרים",           keys: ["neighbors", "graph_bridges"] },
  { id: "cross",     label: "מצליבים בין הממצאים",           keys: ["crossings"] },
  { id: "depth",     label: "מודדים עומק ועוצמת קשר",        keys: [], synthetic: "scoring" },
  { id: "unify",     label: "מאחדים את התמונה",             keys: [], synthetic: "synthesis" },
];

// status של צעד: ok (רץ + תוכן) · empty (רץ, ריק) · skipped (מגודר, לא רץ) · fail (רץ ונכשל) · pending
function agentStatus(agents, key) {
  const a = (agents || []).find((x) => x.output_key === key);
  if (!a) return null;
  if (a.ran === false) return { st: "skipped", ms: a.ms || 0, seq: a.seq };
  if (a.ok === false) return { st: "fail", ms: a.ms || 0, seq: a.seq };
  if (a.empty) return { st: "empty", ms: a.ms || 0, seq: a.seq };
  return { st: "ok", ms: a.ms || 0, seq: a.seq };
}

function stepState(doc, step) {
  const agents = doc.agents || [];
  if (step.synthetic === "gateway")
    return { st: doc.input?.normalized ? "ok" : "fail", ms: 0, seq: 0 };
  if (step.synthetic === "scoring")
    return { st: doc.scores?.depth != null ? "ok" : "empty", ms: 0, seq: 990 };
  if (step.synthetic === "synthesis")
    return { st: doc.metatron ? "ok" : "empty", ms: 0, seq: 999 };
  const parts = step.keys.map((k) => agentStatus(agents, k)).filter(Boolean);
  if (!parts.length) return { st: "pending", ms: 0, seq: 500 };
  const ms = parts.reduce((s, p) => s + (p.ms || 0), 0);
  const seq = Math.min(...parts.map((p) => p.seq ?? 500));
  if (parts.some((p) => p.st === "ok")) return { st: "ok", ms, seq };
  if (parts.some((p) => p.st === "fail")) return { st: "fail", ms, seq };
  if (parts.some((p) => p.st === "empty")) return { st: "empty", ms, seq };
  return { st: "skipped", ms, seq };
}

function num(x) { return typeof x === "number" ? x : 0; }
function len(a) { return Array.isArray(a) ? a.length : 0; }

// כמה ממצאים בפועל (ספירה כנה מכל השכבות)
function countFindings(f) {
  if (!f) return 0;
  return (
    len(f.linguistics?.same_value) +
    len(f.crossings) +
    len(f.graph_bridges) +
    len(f.notarikon?.rashei_tevot) +
    len(f.notarikon?.sofei_tevot) +
    len(f.neighbors) +
    len(f.linguistics?.anagrams) +
    num(f.sources?.count) +
    len(f.els?.search?.hits) +
    len(f.language?.bridges)
  );
}

export function buildJourney(doc) {
  if (!doc || doc.error) return { error: doc?.error || "no_doc", header: null, steps: [], layers: [] };
  const f = doc.findings || {};
  const prov = doc.provenance || {};
  const p = (key) => prov[key] || null; // {agent,fn,stage}

  const steps = STEPS.map((s) => {
    const state = stepState(doc, s);
    return { id: s.id, label: s.label, ...state };
  });

  const header = {
    name: doc.input?.normalized || "",
    value: doc.input?.value ?? null,
    depth: doc.scores?.depth ?? null,
    findings: countFindings(f),
    crossings: len(f.crossings),
    research_id: doc.research_id || null,
  };

  // ── שכבות המסמך — סיפור אחד, כל שכבה ניתנת לפתיחה עד הנתון הגולמי ──
  const m = doc.metatron || {};
  const layers = [];

  // תמונת המחקר (מטטרון) — סיכום + הכוונות-המשך. ההכוונות = כיוונים, לא עובדות.
  layers.push({
    id: "overview", icon: "🔭", title: "תמונת המחקר", kind: "summary",
    data: {
      value: m.value ?? header.value,
      headline: m.headline || null,
      follow_up: Array.isArray(m.follow_up) ? m.follow_up : [],
    },
  });

  // ממצאים מרכזיים — הזוגות שנפגשים בכמה שיטות. מקור: crossings/strongest_crossings.
  const strong = m.strong_findings || {};
  layers.push({
    id: "key", icon: "💥", title: "ממצאים מרכזיים", kind: "fact",
    provenance: { agent: strong.source_agent, fn: strong.source_fn },
    data: { items: Array.isArray(strong.items) ? strong.items : [] },
  });

  // הצלבות רב-שיטתיות (הנתון הגולמי מאחורי הממצאים המרכזיים)
  layers.push({
    id: "cross", icon: "🔗", title: "הצלבות רב-שיטתיות", kind: "fact",
    provenance: p("crossings"),
    data: { items: Array.isArray(f.crossings) ? f.crossings : [] },
  });

  // תנ״ך
  layers.push({
    id: "tanach", icon: "📜", title: "בתנ״ך ובמקורות", kind: "fact",
    provenance: p("sources"),
    data: f.sources || null,
  });

  // מספרים (שיטות)
  layers.push({
    id: "numbers", icon: "🔢", title: "המבנה המספרי", kind: "fact",
    provenance: p("gematria"),
    data: { methods: f.gematria || null, same_value: f.linguistics?.same_value || [] },
  });

  // אותיות וצורות + שורש
  layers.push({
    id: "letters", icon: "🔠", title: "אותיות, צורות ושורש", kind: "fact",
    provenance: p("linguistics"),
    data: {
      letters: f.linguistics?.letters || [],
      anagrams: f.linguistics?.anagrams || [],
      transforms: f.linguistics?.transforms || null,
      root: f.root || null, root_prov: p("root"),
    },
  });

  // נוטריקון — ראשי-תיבות דטרמיניסטי (עובדת-מנוע; הפרשנות נפרדת)
  layers.push({
    id: "notarikon", icon: "🔤", title: "ראשי-תיבות (נוטריקון)", kind: "fact",
    provenance: p("notarikon"),
    data: f.notarikon || null,
  });

  // שפה — גשרים חוצי-שפות + הקשר
  layers.push({
    id: "language", icon: "🌉", title: "קשרים לשוניים והקשר", kind: "fact",
    provenance: p("language"),
    data: f.language || null,
  });

  // רשת קשרים — שכנים + גשרי-גרף
  layers.push({
    id: "network", icon: "🕸️", title: "רשת הקשרים", kind: "fact",
    provenance: p("neighbors"),
    data: { neighbors: f.neighbors || [], graph_bridges: f.graph_bridges || [], bridges_prov: p("graph_bridges") },
  });

  // דילוגים — קשור לשם הנוכחי
  layers.push({
    id: "els", icon: "🔍", title: "דילוגים (ELS)", kind: "fact",
    provenance: p("els"),
    data: f.els || null,
  });

  // מדדים
  layers.push({
    id: "scores", icon: "🎯", title: "עומק ועוצמת-קשר", kind: "fact",
    data: doc.scores || null,
  });

  // נתוני המקור — הכול, כולל provenance מלא (למי שרוצה לחפור)
  layers.push({
    id: "raw", icon: "🗄️", title: "נתוני המקור", kind: "raw",
    data: { findings: f, provenance: prov, agents: doc.agents || [] },
  });

  return { header, steps, layers, raw: doc };
}

export const JOURNEY_STEP_COUNT = STEPS.length;
