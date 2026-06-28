// 🧬 ניתוח חיים — תשתית קלט/פלט. סכמת קלט אחת אחידה → מנועים מרובים (עדשות) → פלט להשוואה.
// המנוע המובנה «מפת השדה» מחושב לגמרי (גימטריה/מבנה, בלי AI). מנועי AI = פרומפט מוכן-להדבקה.
import { calcGem } from "../../theme.js";
import { onlyHeb } from "../gematria.js";

export const LIFE_KEY = "sod_life_v1";

export const emptyProfile = () => ({
  profile: { name: "", parents: { father: "", mother: "" } },
  life_events: [],   // {date,title,description,type}
  key_dates: { marriage: "", divorce: "", births: [] }, // births: {name,date}
  context_notes: "",
  _ai: { a: "", b: "" }, // פלטי מנועי AI שהמשתמש מדביק בחזרה (להשוואה)
});

export const loadProfile = () => {
  try { const j = JSON.parse(localStorage.getItem(LIFE_KEY) || "{}"); return { ...emptyProfile(), ...j, profile: { ...emptyProfile().profile, ...(j.profile || {}) }, key_dates: { ...emptyProfile().key_dates, ...(j.key_dates || {}) }, _ai: { ...emptyProfile()._ai, ...(j._ai || {}) } }; }
  catch { return emptyProfile(); }
};
export const saveProfile = p => { try { localStorage.setItem(LIFE_KEY, JSON.stringify(p)); } catch { /* noop */ } };

export const EVENT_TYPES = [
  { key: "relationship", label: "זוגיות/קשר" }, { key: "family", label: "משפחה" },
  { key: "work", label: "עבודה/קריירה" }, { key: "move", label: "מעבר/מקום" },
  { key: "emotional", label: "רגשי/פנימי" }, { key: "other", label: "אחר" },
];
const typeLabel = k => (EVENT_TYPES.find(t => t.key === k) || {}).label || k || "אחר";
const g = s => calcGem(s || "");
const yearOf = d => { const m = String(d || "").match(/\b(\d{4})\b/); return m ? +m[1] : null; };

// 🧭 מנוע «מפת השדה» — פלט מבני, מחושב במלואו (לא AI). זה ה-Field Map.
export function fieldMap(input) {
  const name = input.profile?.name || "";
  const core = { name, value: g(name), letters: onlyHeb(name).length };
  const people = [
    { role: "השם שלך", name, value: g(name) },
    { role: "אב", name: input.profile?.parents?.father || "", value: g(input.profile?.parents?.father) },
    { role: "אם", name: input.profile?.parents?.mother || "", value: g(input.profile?.parents?.mother) },
  ].filter(p => p.name);

  const events = (input.life_events || []).filter(e => e.title || e.date).map(e => ({
    title: e.title || "(ללא כותרת)", type: e.type || "other", typeLabel: typeLabel(e.type),
    date: e.date || "", year: yearOf(e.date), value: g(e.title),
  }));

  // אשכולות לפי סוג
  const byType = {};
  events.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });
  const clusters = Object.entries(byType).map(([type, count]) => ({ type, label: typeLabel(type), count })).sort((a, b) => b.count - a.count);

  // נקודות לחץ — שנים עם ריכוז אירועים
  const byYear = {};
  events.forEach(e => { if (e.year) byYear[e.year] = (byYear[e.year] || 0) + 1; });
  const pressure = Object.entries(byYear).map(([year, count]) => ({ year: +year, count })).sort((a, b) => b.count - a.count || a.year - b.year);

  // נקודות מעבר — אירועים על ציר הזמן
  const transitions = events.filter(e => e.year).sort((a, b) => a.year - b.year);

  // התכנסויות מספריות — עובדה (גימטריה)
  const nameMatches = events.filter(e => e.value && e.value === core.value);
  const pairs = [];
  for (let i = 0; i < events.length; i++)
    for (let j = i + 1; j < events.length; j++)
      if (events[i].value && events[i].value === events[j].value) pairs.push({ a: events[i].title, b: events[j].title, value: events[i].value });

  return { core, people, events, clusters, pressure, transitions, convergences: { nameMatches, pairs } };
}

// 📤 הקלט האחיד כ-JSON נקי (בלי שדות פנימיים) — מוכן להאכלה לכל מנוע/מודל
export const cleanInput = p => ({
  profile: p.profile, life_events: p.life_events, key_dates: p.key_dates, context_notes: p.context_notes,
});

// פרומפטים מוכנים — שתי עדשות: נרטיב (עומק) ומפת-שדה (מבנה)
export const promptNarrative = input =>
  `נתח את נתוני החיים הבאים (JSON). כתוב בעברית, בכבוד, בלי ניחוש/עתידות — רק תובנות מהנתונים.\n\n${JSON.stringify(input, null, 2)}\n\nפלט:\n1. סיפור חיים נרטיבי\n2. דפוסים התנהגותיים/רגשיים\n3. נקודות מפנה מרכזיות\n4. דינמיקות מערכות-יחסים\n5. תובנה מסכמת (עד 5 שורות)`;
export const promptFieldMap = input =>
  `הפק FIELD MAP בלבד עבור נתוני החיים (JSON). מבנה בלבד, בלי סיפור.\n\n${JSON.stringify(input, null, 2)}\n\nפלט:\n1. ציר מרכזי (המבנה הדומיננטי)\n2. אשכולות (קיבוץ אירועים)\n3. נקודות לחץ (ריכוזי-זמן)\n4. נקודות מעבר\n5. סיכום-שדה (מבנה בלבד)`;
