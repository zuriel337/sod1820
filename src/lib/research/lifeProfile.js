// 🧬 תקן השדה האחיד (Unified Field Standard) — נעול v2.
// קלט אחיד אחד → כל מנוע (מובנה/AI) מחזיר אותו פלט אחיד → השוואה + «עץ אחד» (nodes+edges).
// כלל הזהב: אין פיצ׳ר שלא הופך ל-node בגרף. גימטריה=עובדה; פרשנות AI=נפרדת.
import { calcGem } from "../../theme.js";
import { computeEntity, connectToAxis, PRIMARY } from "./coreEngine.js";

export const LIFE_KEY = "sod_field_v2";

// ===== 📥 INPUT — תקן קלט אחיד =====
export const emptyProfile = () => ({
  identity: { name: "", nickname: "", birth_date: "", birth_place: "", family: { father: "", mother: "", children: [] } },
  timeline: [],                              // {date,title,description,emotion: positive|neutral|negative}
  entities: { people: [], places: [], objects: [] }, // people: {name,status,note}
  media: [],                                // {type: image|text|note, description, user_comment}
  patterns: { repeated_words: [], repeated_numbers: [], life_themes: [] },
  context_notes: "",
  _engines: {},                             // פלטי מנועי AI שהמשתמש מדביק (key→text)
});

export const loadProfile = () => {
  try {
    const j = JSON.parse(localStorage.getItem(LIFE_KEY) || "{}"); const e = emptyProfile();
    return { ...e, ...j,
      identity: { ...e.identity, ...(j.identity || {}), family: { ...e.identity.family, ...((j.identity || {}).family || {}) } },
      entities: { ...e.entities, ...(j.entities || {}) },
      patterns: { ...e.patterns, ...(j.patterns || {}) },
      _engines: { ...(j._engines || {}) },
    };
  } catch { return emptyProfile(); }
};
export const saveProfile = p => { try { localStorage.setItem(LIFE_KEY, JSON.stringify(p)); } catch { /* noop */ } };

export const EMOTIONS = [{ key: "positive", label: "חיובי", sign: "＋" }, { key: "neutral", label: "ניטרלי", sign: "•" }, { key: "negative", label: "קשה", sign: "－" }];

const g = s => calcGem(s || "");
const yearOf = d => { const m = String(d || "").match(/\b(\d{4})\b/); return m ? +m[1] : null; };
const norm = (v, max) => max ? Math.round((v / max) * 100) : 0;

// הקלט הנקי (בלי שדות פנימיים) — מוזן לכל מנוע
export const cleanInput = p => ({
  identity: p.identity, timeline: p.timeline, entities: p.entities, media: p.media, patterns: p.patterns, context_notes: p.context_notes,
});

// ===== ⚙️ מנוע «מפת השדה» — מחזיר את הפלט האחיד (מחושב, עובדה) =====
// כל הערכים נשאבים ממנוע הליבה (coreEngine) — מקור-אמת יחיד. כאן רק מבנה ופרשנות-מבנית.
export function fieldEngine(input) {
  const name = input.identity?.name || "";
  const axis = computeEntity(name);                 // 🔵 הציר הראשי — ערכי כל השיטות
  const events = (input.timeline || []).filter(e => e.title || e.date).map(e => ({
    title: e.title || "(ללא כותרת)", emotion: e.emotion || "neutral", date: e.date || "", year: yearOf(e.date),
    core: computeEntity(e.title), get value() { return this.core.primary; },
  }));
  const themes = input.patterns?.life_themes || [];
  const people = input.entities?.people || [];

  // 🌳 חיבור לציר הראשי — כל ישות שמתחברת לשם דרך ערך משותף (חוצה-שיטות)
  const axisLinks = [];
  if (axis.text) {
    [...events.map(e => ({ kind: "אירוע", label: e.title, core: e.core })),
     ...people.filter(p => p.name).map(p => ({ kind: "אדם", label: p.name, core: computeEntity(p.name) }))]
      .forEach(it => { const ls = connectToAxis(axis, it.core); if (ls.length) axisLinks.push({ ...it, links: ls }); });
  }

  // --- clusters: לפי נושאי-חיים (אם יש), אחרת לפי רגש ---
  let clusters = [];
  if (themes.length) {
    clusters = themes.map(th => {
      const evs = events.filter(e => e.title.includes(th)).map(e => e.title);
      return { name: th, events: evs, strength: evs.length };
    });
  }
  const byEmotion = {};
  events.forEach(e => { (byEmotion[e.emotion] ||= []).push(e.title); });
  Object.entries(byEmotion).forEach(([emo, evs]) => clusters.push({ name: (EMOTIONS.find(x => x.key === emo) || {}).label || emo, events: evs, strength: evs.length }));
  const maxStrength = Math.max(1, ...clusters.map(c => c.strength));
  clusters = clusters.filter(c => c.strength > 0).map(c => ({ ...c, strength: norm(c.strength, maxStrength) })).sort((a, b) => b.strength - a.strength);

  // --- timeline_pressure: ריכוז אירועים לפי שנה ---
  const byYear = {};
  events.forEach(e => { if (e.year) byYear[e.year] = (byYear[e.year] || 0) + 1; });
  const maxYear = Math.max(1, ...Object.values(byYear));
  const timeline_pressure = Object.entries(byYear).map(([period, c]) => ({ period, intensity: norm(c, maxYear) })).sort((a, b) => +a.period - +b.period);

  // --- relationships_graph: nodes+edges (עץ אחד) ---
  const rel = [];
  if (name) rel.push({ node_a: name, node_b: String(axis.primary), relation: "ערך (ציר ראשי)" });
  people.forEach(pe => { if (pe.name) rel.push({ node_a: name || "אני", node_b: pe.name, relation: pe.status || "קשור" }); });
  events.forEach(e => { if (e.year) rel.push({ node_a: e.title, node_b: String(e.year), relation: "בשנת" }); });
  // 🌳 חיבור לציר הראשי — קצוות חזקים (ערך משותף עם השם, חוצה-שיטות) = עובדה
  axisLinks.forEach(it => it.links.forEach(l => rel.push({
    node_a: it.label, node_b: name, relation: `${l.entMethod}=${l.axisMethod} → ${l.value}`,
  })));
  // התכנסויות מספריות בין אירועים — עובדה
  for (let i = 0; i < events.length; i++)
    for (let j = i + 1; j < events.length; j++)
      if (events[i].value && events[i].value === events[j].value) rel.push({ node_a: events[i].title, node_b: events[j].title, relation: `התכנסות = ${events[i].value}` });
  themes.forEach(th => events.filter(e => e.title.includes(th)).forEach(e => rel.push({ node_a: e.title, node_b: th, relation: "נושא" })));

  // --- core_axis ---
  const core_axis = clusters[0] ? `${clusters[0].name}${name ? ` · ${name}=${g(name)}` : ""}` : (name ? `ציר השם · ${name}=${g(name)}` : "—");

  // --- summary (עובדתי, בלי פרשנות) ---
  const years = events.map(e => e.year).filter(Boolean);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—";
  const convs = rel.filter(r => r.relation.startsWith("התכנסות")).length;
  const axisHits = axisLinks.reduce((s, it) => s + it.links.length, 0);
  const summary = `${events.length} אירועים · טווח ${span} · ${clusters.length} אשכולות · ${convs} התכנסויות · ${axisHits} חיבורים לציר הראשי · ${people.length} אנשים`;

  // --- insight_level לפי עושר הקלט ---
  const score = (name ? 1 : 0) + events.length + themes.length + people.length + (input.patterns?.repeated_numbers?.length || 0);
  const insight_level = score >= 10 ? "high" : score >= 4 ? "medium" : "low";

  // axis = הציר הראשי (ערכי כל השיטות) · axisLinks = החיבורים אליו · שניהם ממנוע הליבה
  return { core_axis, axis, axisLinks, clusters, timeline_pressure, relationships_graph: rel, summary, insight_level };
}

// ===== 🤖 פרומפטים — כל מנוע AI חייב להחזיר את אותו פלט אחיד =====
const OUTPUT_SHAPE = `{
  "core_axis": "",
  "clusters": [{ "name": "", "events": [], "strength": 0 }],
  "timeline_pressure": [{ "period": "", "intensity": 0 }],
  "relationships_graph": [{ "node_a": "", "node_b": "", "relation": "" }],
  "summary": "",
  "insight_level": "low | medium | high"
}`;
export const promptFor = (input, lens) => {
  // 🔵 ערכי מנוע הליבה — כבר מחושבים. ה-AI אסור לו לחשב גימטריה, רק לפרש.
  const precomputed = {
    axis: computeEntity(input.identity?.name || ""),
    events: (input.timeline || []).filter(e => e.title).map(e => ({ title: e.title, values: computeEntity(e.title).values })),
    people: (input.entities?.people || []).filter(p => p.name).map(p => ({ name: p.name, values: computeEntity(p.name).values })),
  };
  return `אתה מנוע ב«מרכז מחקר זהות». נתון קלט-חיים (JSON). ${lens}\n` +
    `⚠️ מנוע הליבה (Single Source of Truth) כבר חישב את כל ערכי הגימטריה — הם מצורפים תחת "core_values". ` +
    `אסור לך לחשב/לשנות מספרים. השתמש אך ורק בערכים שניתנו, ופרש את המבנה.\n` +
    `החזר אך ורק JSON בפורמט האחיד הבא (בלי טקסט מסביב):\n${OUTPUT_SHAPE}\n\n` +
    `כללים: בלי ניחוש/עתידות/מיסטיקה — רק דפוסים מהנתונים. כל פריט = node/edge בגרף, ומתחבר לציר הראשי (השם).\n\n` +
    `קלט:\n${JSON.stringify(input, null, 2)}\n\ncore_values (ממנוע הליבה — אל תשנה):\n${JSON.stringify(precomputed, null, 2)}`;
};

export const LENSES = [
  { key: "narrative", title: "🧠 עדשת נרטיב (עומק)", lens: "נתח כסיפור-חיים ודפוסים רגשיים, אך תרגם הכל למבנה הפלט האחיד." },
  { key: "structure", title: "🧭 עדשת מבנה (Field)", lens: "נתח מבנה בלבד — צירים, אשכולות, צפיפות-זמן וקשרים. בלי סיפור." },
];
