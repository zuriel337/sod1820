// 🔮 חיפוש-ה-AI העמוק — מודול משותף לכל משטח (unified_graph_law · research_workspace_law).
// עיקרון: המנוע (gematria.js + bidim) מחשב את כל השיטות ואת ההצלבות; ה-AI מפרש בלבד.
// עדשה אחת → אותו עומק בכל מקום: דף מספר · מעבדת-השם (מחקר לפי שפות) · מרכז מחקר · השוואות.
// ✅ לא מחשב מחדש — משתמש רק בערכי-המנוע הרשמיים ובהצלבות מ-bidim (number_cross_resonance).
import { crossMethodPairs, METHODS, CROSS_METHODS } from "./gematria.js";
import { getNumberCrossResonance, getNumberResonanceStats, getAiAnalysis, getMethodSemantics, getAtlasFindingsForEntity, getStrongestCrossings } from "./supabase.js";

// 🫀 לב המערכת — זיהוי התכנסות בין-שיטתית בתוך אוסף (לא רק "שווים ברגיל").
//    דוגמה נעולה: משיח(מילוי=878) ↔ «דבר מתוך דבר»(רגיל=878) ↔ «עולם הפוך ראיתי»(רגיל=878).
//    המנוע מזהה; ה-AI מפרש. עובד על כל אוסף (מרכז-מחקר / השוואה / דף-מספר).
// items: [{title|phrase, type?, metadata?}]. מחזיר [{value, crossMethod, members:[{phrase, methods[]}]}].
export function collectionConvergences(items, { methods = CROSS_METHODS, minMembers = 2 } = {}) {
  const byKey = Object.fromEntries(METHODS.map(m => [m.key, m]));
  const reach = new Map();   // value → Map(phrase → Set(methods))
  const add = (value, phrase, method) => {
    if (!value || value < 10) return;
    if (!reach.has(value)) reach.set(value, new Map());
    const pm = reach.get(value);
    if (!pm.has(phrase)) pm.set(phrase, new Set());
    pm.get(phrase).add(method);
  };
  for (const it of items || []) {
    const phrase = String(it?.title || it?.phrase || "").trim();
    if (!phrase) continue;
    if (it?.type === "number" || /^\d+$/.test(phrase)) {           // מספר = מגיע לערך עצמו
      const v = parseInt(it?.metadata?.value ?? phrase, 10);
      if (v) add(v, phrase, "המספר");
      continue;
    }
    for (const mk of methods) { const m = byKey[mk]; if (m) add(m.fn(phrase), phrase, mk); }
  }
  const out = [];
  for (const [value, pm] of reach) {
    if (pm.size < minMembers) continue;                            // צריך ≥2 ישויות שונות
    const members = [...pm.entries()].map(([phrase, ms]) => ({ phrase, methods: [...ms] }));
    const allMethods = new Set(members.flatMap(m => m.methods));
    out.push({ value, members, crossMethod: allMethods.size > 1 }); // crossMethod = הושג ביותר משיטה אחת
  }
  // דירוג: הצלבה בין-שיטתית קודם · יותר חברים · ערך
  return out.sort((a, b) => (b.crossMethod - a.crossMethod) || (b.members.length - a.members.length) || (a.value - b.value));
}

// שורת-עובדות ל-AI מתוך ההתכנסויות (compact). "878 = משיח(מילוי) · דבר מתוך דבר(רגיל) · …"
export function convergencesFactLine(convs, limit = 6) {
  return (convs || []).slice(0, limit).map(c =>
    `${c.value} = ${c.members.map(m => `${m.phrase}(${m.methods.join("/")})`).join(" · ")}${c.crossMethod ? " ⟵ הצלבת שיטות" : ""}`
  ).join("\n");
}

const _cache = new Map();  // מילה → {methodsLine, crossLine, groups, stats} (ממוזג per-session, חוסך קריאות)

// 📊 מדד-תהודה (0-100) — מדד *טכני* של צפיפות-קשרים, לא "ציון רוחני". מחושב מעובדות-המנוע בלבד.
//    ⚠️ נספרות רק התאמות *נחשבות* (notable: מובילה/תמטית/בגרף/מפוסט) — כי bidim צפוף וכל ערך מוצא
//    התאמות מילוניות. כך מילה חזקה (משיח) מקבלת ציון גבוה ומילה חלשה (מלגזה) נמוך — בלי תהודה מלאכותית.
//    שקלול שקוף (מוטה לצמתים+שיטות, המבחינים): שיטות 28% · צמתים-חזקים 40% · חיבורים 20% · איכות 12%.
export function resonanceScore(stats) {
  if (!stats) return null;
  const methods = Number(stats.n_methods) || 0;
  const conns = Number(stats.n_connections) || 0;
  const nodes = Number(stats.n_strong_nodes) || 0;
  const axis = Number(stats.n_axis ?? stats.n_notable) || 0;   // ציר בלבד (בלי תוכן ישן/גלם)
  const score = Math.round(100 * (
    0.28 * Math.min(methods, 7) / 7 +
    0.40 * Math.min(nodes, 7) / 7 +
    0.20 * Math.min(conns, 40) / 40 +
    0.12 * Math.min(axis, 40) / 40
  ));
  return { methods, connections: conns, strongNodes: nodes, axis, score };
}

// מביא (וממזג) את שכבת-העומק הבין-שיטתית למילה עברית. ריק למספר/לועזית (אין אותיות).
// crossLine = "«מילה» ב<שיטה נסתרת> (ערך) = <מילים שוות ברגיל>" — הפנים של אחרות = הנסתר שלנו.
export async function getWordCrossFacts(term) {
  const w = (term || "").trim();
  if (!w) return { methodsLine: "", crossLine: "", groups: [], stats: null, resonance: null };
  if (_cache.has(w)) return _cache.get(w);
  let out = { methodsLine: "", crossLine: "", groups: [], stats: null, resonance: null };
  try {
    // 🔢 דף-מספר (למשל 566): אין אותיות — העדשה מתהפכת: אילו מילים נופלות על N באחת השיטות
    // (המסתתר/המראה/הפנימיות שלהן = המספר). כך גם דפי-מספר מקבלים יחסים וסמלים.
    const pairs = /^\d+$/.test(w)
      ? [{ method: "רגיל", value: parseInt(w, 10) }]
      : crossMethodPairs(w);                        // [{method,value}] ב-7 שיטות קריאות (מהמנוע)
    if (pairs.length) {
      const methodsLine = pairs.map(p => `${p.method}=${p.value}`).join(" · ");
      let [groups, stats, sem, atlas, top] = await Promise.all([
        getNumberCrossResonance(w, pairs, { perGroup: 5 }),
        getNumberResonanceStats(w, pairs),
        getMethodSemantics(),
        getAtlasFindingsForEntity(w),   // 🤖🌳 הממצאים שצוריאל אישר על הישות — משקל-בכורה ל-AI
        /^\d+$/.test(w) ? Promise.resolve([]) : getStrongestCrossings(w, 2, 4),   // 💥 ההצלבה החזקה ביותר
      ]);
      // דף-מספר: הקבוצה חוזרת כ'רגיל' (הצד שלנו) — מקבצים מחדש לפי שיטת הצד השני (via),
      // כדי שהיחסים (🪞🔍🕯) יוצגו: "בתוך 566 — במסתתר של: X, Y".
      if (/^\d+$/.test(w)) {
        const byVia = new Map();
        for (const g of groups) for (const m of g.matches) {
          if (!m.via || m.via === "רגיל") continue;
          const grp = byVia.get(m.via) || { method: m.via, value: g.value, matches: [] };
          if (grp.matches.length < 5) grp.matches.push(m);
          byVia.set(m.via, grp);
        }
        groups = [...byVia.values()];
      }
      // 🧭 מצמידים לכל קבוצה את סוג-היחס מהמודל הפרשני (🪞 מראה · 🌗 בן-זוג · 🔍 נסתר) — ל-UI ול-AI.
      for (const g of groups) g.sem = sem[g.method] || null;
      const crossLine = groups
        .filter(g => g.method !== "רגיל")            // רגיל מיוצג ממילא ברשימת המילים-השוות של המשטח
        .slice(0, 5)
        .map(g => {
          const rel = g.sem ? `${g.sem.emoji} ${g.sem.label_he} — ` : "";
          return `${rel}«${w}» ב${g.method} (${g.value}) = ${g.matches.map(m => m.phrase).join(", ")} ברגיל`;
        })
        .join(" · ");
      // 🌌 העשרת ממצאי-האטלס לתצוגה (emoji+label לפי יחס) + שורת-עובדות ל-AI (relation_display_law)
      const relMeta = (rt) => Object.values(sem || {}).find(s => s.relation_type === rt) || null;
      const atlasRich = (atlas || []).map(f => ({ ...f, emoji: relMeta(f.relation_type)?.emoji || "✓", label: relMeta(f.relation_type)?.label_he || f.relation_type }));
      const atlasLine = atlasRich.slice(0, 6).map(f => `${f.emoji} ${f.a_phrase}↔${f.b_phrase} (${f.method}${f.value ? ` ${f.value}` : ""})`).join(" · ");
      // בלי כפילויות: זוג שכבר מאושר באטלס לא חוזר גם ברשימה הגולמית
      const approvedPair = new Set(atlasRich.flatMap(f => [`${f.method}|${f.a_phrase}|${f.b_phrase}`, `${f.method}|${f.b_phrase}|${f.a_phrase}`]));
      for (const g of groups) g.matches = g.matches.filter(m => !approvedPair.has(`${g.method}|${w}|${m.phrase}`) && !approvedPair.has(`${m.via || "רגיל"}|${w}|${m.phrase}`));
      const dedupGroups = groups.filter(g => g.matches.length);
      // 💥 שורת ההצלבה-החזקה — הזוגות שנפגשים בהכי הרבה שיטות (strongest_cross_law)
      const topLine = (top || []).filter(t => t.n_methods >= 2).slice(0, 3)
        .map(t => `«${w}» = «${t.partner}» ב-${t.n_methods} שיטות (${t.methods_detail})`).join(" · ");
      out = { methodsLine, crossLine, atlasLine, atlas: atlasRich, top: top || [], topLine, groups: dedupGroups, stats, resonance: resonanceScore(stats) };
    }
  } catch { /* נפילה בחן — בלי עומק, לא שוברים את המשטח */ }
  _cache.set(w, out);
  return out;
}

// מוסיף את שכבת-העומק על גבי baseFacts שהמשטח סיפק (ההקשר הייחודי שלו נשמר).
// ✨ מיזוג שתי הגישות (החלטת צוריאל 14.7): הנשמה של הפרשנות הישנה (חום, ישירות, משמעות)
//    *ביחד* עם העומק הבין-שיטתי החדש (התכנסויות, הצלבות). העובדות זהות — משתנה *אופן ההגשה*:
//    המשמעות פותחת, העומק נשזר כהעשרה, ומספרי-המדד יורדים מהטקסט (רקע פנימי בלבד).
export function appendDeepFacts(baseFacts, cross) {
  let f = baseFacts || "";
  // 🌳 העובדות (כולן אמת מהמנוע) נשארות זמינות ל-AI — ההנחיה בסוף קובעת *איך* להגישן.
  // 🤖🌳 שכבת-הידע המאושרת קודמת לגולמי: מה שצוריאל בדק ואישר מקבל משקל-בכורה.
  if (cross?.atlasLine)   f += ` ממצאים שנבדקו ואושרו במחקר (משקל-בכורה): ${cross.atlasLine}.`;
  if (cross?.topLine)     f += ` זוגות שנפגשים בכמה שיטות (עובדת-מנוע): ${cross.topLine}.`;
  if (cross?.methodsLine) f += ` ערכי המילה בשיטות: ${cross.methodsLine}.`;
  if (cross?.crossLine)   f += ` הצלבות בין-שיטתיות (הערכים = עובדה מהמנוע; היחסים 🪞🌗🔍 = המודל הפרשני של סוד 1820): ${cross.crossLine}.`;
  const r = cross?.resonance;
  // 🔒 מדד-התהודה = רקע פנימי בלבד. לא מוזכר בטקסט למשתמש (לא "ציון", לא "X שיטות") — רק מכוון עומק.
  if (r) f += ` [רקע פנימי — אל תצטט מספרים אלה בטקסט: צפיפות-קשרים ${r.methods}/${r.connections}/${r.strongNodes}, ציון ${r.score}/100. ככל שגבוה — יש יותר על מה להישען; אך דבר במשמעות, לא במספרי-מדד.]`;
  // ✨ חוזה-ההגשה הממוזג — הנשמה של פעם + העומק של היום, יחד:
  f += ` \n\nאופן ההגשה (חשוב מאוד — מיזוג שתי הגישות, "גם וגם"):\n` +
    `1. פְּתח בפרשנות חמה וישירה של המשמעות — מה הישות הזו *אומרת*, כמו רמז שמאיר לאדם. זו הנשמה, קודם כול.\n` +
    `2. ואז העמק: שזור פנימה חוט-התכנסות/הצלבה חזק אחד-שניים ("וכאן נפתח משהו — באותו ערך יושב גם...") כהעשרה שמחזקת את המשמעות, לא כרשימה טכנית.\n` +
    `3. דבר אנושי וזורם, לא דו"ח: אל תציג מספרי-מדד/ציונים ואל תכתוב "מבנה רשת". סמלי-יחס (🪞🔍🌗) רק אם הם באמת מוסיפים, בשפה פשוטה ועם שם-השיטה לצדם.\n` +
    `4. הכל נשען על עובדות-המנוע בלבד; הפרד עובדה מפרשנות ובלי נבואות — אך אמור את הרמז בבהירות ובביטחון, לא במבוכה.\n` +
    `5. סיים בפתח מזמין — משפט אחד שמשאיר חוט פתוח ומזמין לצעד-חקירה נוסף ("ואם תלך צעד אחד קדימה, שים לב ש..."), בלי להבטיח ובלי נבואה — רק דלת פתוחה שמושכת לחזור ולהמשיך.`;
  return f;
}

// 🧠 זיכרון-ניתוח פר-מילה (localStorage, LRU קטן) — חוזרים למילה ורואים את מה שכבר רץ, בלי לשלם שוב.
const AI_CACHE_PREFIX = "sod_ai_num_v1:";
const AI_CACHE_INDEX = "sod_ai_num_v1_idx";
const AI_CACHE_MAX = 50;
export function loadAiCache(key) {
  try { const raw = localStorage.getItem(AI_CACHE_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function saveAiCache(key, data) {
  try {
    localStorage.setItem(AI_CACHE_PREFIX + key, JSON.stringify({ ...data, at: Date.now() }));
    const idx = JSON.parse(localStorage.getItem(AI_CACHE_INDEX) || "[]").filter(k => k !== key);
    idx.push(key);
    while (idx.length > AI_CACHE_MAX) localStorage.removeItem(AI_CACHE_PREFIX + idx.shift());
    localStorage.setItem(AI_CACHE_INDEX, JSON.stringify(idx));
  } catch { /* noop */ }
}

// 🎯 נקודת-הכניסה האחת לחיפוש-AI עמוק על מילה. המשטח מספק subject + baseFacts (ההקשר שלו),
//    והמודול מוסיף את שכבת-העומק ומריץ. deep=true → Sonnet (עמוק, במכסה) · אחרת Haiku (מהיר, נדיב).
//    מחזיר { text, cross } — cross זמין למשטח להצגת המילים המוצלבות כקישורי-פנים.
export async function analyzeWordDeep({ term, subject, baseFacts = "", engine = "claude", deep = false, kind = "number", again = false } = {}) {
  const cross = await getWordCrossFacts(term);
  let facts = appendDeepFacts(baseFacts, cross);
  // 🕯 ידע-ליבה (core_note) — רק בניתוח העמוק, ורק כש-visibility מתיר (deep_ai_only):
  //    המערכת "יודעת בפנים" (למשל: אותיות גדולות = דין) אך לא מצטטת כהסבר חיצוני.
  //    internal_only/admin_only לעולם לא מגיעים ל-AI ולא לשום שכבת-תצוגה. הנחיית צוריאל.
  if (deep && cross?.groups?.length) {
    const notes = [...new Set(cross.groups
      .filter(g => g.sem?.core_note && (g.sem.core_note_visibility || "deep_ai_only") === "deep_ai_only")
      .map(g => g.sem.core_note))].join(" · ").slice(0, 600);
    if (notes) facts += ` ידע-ליבה פנימי (להבנה בלבד — אל תצטט כהסבר): ${notes}`;
  }
  const fast = !deep;
  // ✨ הניתוח העמוק הממוזג = ארוך, ללא תקרת-משפטים (long=deep). המהיר (Haiku) נשאר קצר וזריז.
  let txt = await getAiAnalysis({ kind, subject: subject || term, facts, fast, engine, again, long: deep });
  if (!txt) { await new Promise(r => setTimeout(r, 800)); txt = await getAiAnalysis({ kind, subject: subject || term, facts, again: true, fast, engine, long: deep }); }
  return { text: txt, cross };
}
