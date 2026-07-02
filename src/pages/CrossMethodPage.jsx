import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import DocActions from "../components/DocActions.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

// ===== הצלבת שיטות — "מסר מצטרף לפי מספר" =====
// מזינים מספר. המערכת שולפת את כל הביטויים *המאומתים* שנופלים על המספר הזה בכל שיטה,
// ומציגה אותם מקובצים לפי שיטה — כך שמתקבל מסר אחד שכל השיטות מתכנסות אליו.
// מקור: gematria_words (is_verified=true). השדות הם עמודות-השיטה במסד.

// סדר התצוגה + השמות התואמים לעמודות המסד.
const METHOD_COLS = [
  { col: "ragil",    name: "רגיל",   sub: "חיבור ערכי האותיות", soul: "המהות הגלויה", icon: "✦" },
  { col: "miluy",    name: "מילוי",  sub: "ערך שֵם האות המלא", soul: "הפנימיות — מה שמתמלא בפנים", icon: "🫧" },
  { col: "misratar", name: "מסתתר",  sub: "הפרשים בין אותיות", soul: "מה שמסתתר בין האותיות", icon: "🔍" },
  { col: "kadmi",    name: "קדמי · משולש", sub: "סכום מצטבר עד האות", soul: "השורש המצטבר", icon: "🌱" },
  { col: "gadol",    name: "גדול",   sub: "סופיות 500–900", soul: "ההתפשטות הגדולה", icon: "🔥" },
  { col: "siduri",   name: "סידורי", sub: "מיקום האות 1–22", soul: "הסדר והמיקום", icon: "🔢" },
  { col: "atbash",   name: "אתבש",   sub: "היפוך הא״ב", soul: "המראה — הצד הנגדי", icon: "🪞" },
  { col: "albam",    name: "אלבם",   sub: "חצי מול חצי", soul: "בן/בת הזוג — הזיווג המשלים", icon: "💍" },
  { col: "ribua",    name: "ריבוע",  sub: "ערך בריבוע", soul: "העָצמה — הערך בריבוע", icon: "💠" },
];
const METHOD_BY_COL = Object.fromEntries(METHOD_COLS.map(m => [m.col, m]));
const SELECT = "phrase,category," + METHOD_COLS.map(m => m.col).join(",");
const TOTAL_METHODS = METHOD_COLS.length;

const SAMPLES = [1820, 313, 326, 322, 1234, 776, 86];

// עוגנים קדושים — מספרי-ליבה (זהה ל-CrossFinder; מקור אחד עתידי: crossRarity)
const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);

// עוצמת ההתכנסות לפי שיטות בלתי-תלויות (אחרי קיפול גדול→רגיל) — תווית עובדתית, לא ציון שרירותי
const strengthLabel = n =>
  n >= 5 ? "✦ התכנסות-על" : n >= 3 ? "✦ התכנסות חזקה" : n === 2 ? "הצלבה" : "נגיעה יחידה";

// כותרות פוסטים ישנים מגיעות עם ישויות-HTML של וורדפרס — ניקוי לתצוגה
const decodeTitle = s => String(s || "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#x27;/g, "'")
  .replace(/<[^>]+>/g, "").trim();

// 🧭 המסביר האינטראקטיבי — שלושת שלבי ההצלבה. הדוגמאות אומתו במנוע הרשמי (fn_ragil):
// אהבה=13, אחד=13, משיח=358, נחש=358 — נתוני מערכת מאומתים.
const EXPLAIN = [
  {
    k: "fact", icon: "🔢", t: "עובדה", head: "לכל ביטוי יש ערך",
    body: "כל אות עברית שווה מספר (א=1, ב=2 … ת=400). מחברים את אותיות הביטוי ומקבלים את הערך שלו. למשל: אהבה = 1+5+2+5 = 13. זה חישוב טהור שהמנוע מאמת — עובדה, לא פרשנות.",
    demo: { label: "אהבה = 13 = אחד", to: "/number/13" },
  },
  {
    k: "cross", icon: "✚", t: "הצלבה", head: "שני ביטויים · אותו מספר",
    body: "כששני ביטויים שונים נופלים בדיוק על אותו ערך — נוצרת הצלבה: נקודת מפגש בין שני מושגים. הדוגמה המפורסמת: משיח = 358 = נחש. ההצלבה עצמה היא עובדה מתמטית; מה היא אומרת — זה הרמז.",
    demo: { label: "משיח = 358 = נחש", to: "/cross?n=358" },
  },
  {
    k: "conv", icon: "✦", t: "התכנסות", head: "הרבה שיטות · מספר אחד",
    body: "יש 9 שיטות חישוב שונות (רגיל, מילוי, מסתתר, אתבש…). כשביטויים רבים — בשיטות בלתי-תלויות — נופלים כולם על אותו מספר, זו התכנסות. ככל שיותר שיטות עצמאיות מצביעות על אותה נקודה, הראיה נדירה וחזקה יותר. זה מה שהדף הזה מודד.",
    demo: { label: "1820 — התכנסות-העל", to: "/cross?n=1820" },
  },
];

export default function CrossMethodPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const contentRef = useRef(null);   // מכל-התוכן להדפסה (DocActions)
  const btn = { cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 20px" };
  const chip = { cursor: "pointer", background: P.card, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.mono, fontSize: 14, padding: "7px 16px" };
  const chipOn = { borderColor: P.accent, color: P.accentText, background: P.cardSoft };
  const phraseChip = { background: P.cardSoft, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.body, fontSize: 13.5, padding: "5px 12px", textDecoration: "none" };
  const [params] = useSearchParams();
  const initN = Number(params.get("n")) || 1820;   // עומק-לינק: /cross?n=1820 (מ-/topic)
  const [input, setInput] = useState(String(initN));
  const [num, setNum] = useState(initN);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);   // ישויות מאומתות שנופלות על המספר (מדורגות לפי משמעות)
  const [related, setRelated] = useState([]);     // ישויות קרובות דרך הגרף (edges)
  const [cards, setCards] = useState([]);         // כרטיסי התכנסות שמכילים את המספר (גשר ל-/topic)
  const [entityPosts, setEntityPosts] = useState({}); // ישות → פוסטי-המקור מהגרף (edges: post mentions entity)
  const [expl, setExpl] = useState(null);          // המסביר האינטראקטיבי — איזה שלב פתוח

  // כרטיסי התכנסות שמכילים את המספר — הגשר לציר ההתכנסות
  useEffect(() => {
    let live = true; setCards([]);
    if (!num || num <= 0) return;
    import("../lib/supabase.js").then(({ getTopicCards }) =>
      getTopicCards({ approvedOnly: true }).then(all => {
        if (live) setCards((all || []).filter(c => (c.numbers || []).includes(num)));
      })).catch(() => {});
    return () => { live = false; };
  }, [num]);

  useEffect(() => { document.title = `הצלבת שיטות · ${num} · סוד 1820`; }, [num]);

  useEffect(() => {
    let live = true;
    if (!num || num <= 0) { setRows([]); return; }
    setLoading(true);
    const orFilter = METHOD_COLS.map(m => `${m.col}.eq.${num}`).join(",");
    supabase.from("gematria_words").select(SELECT)
      .eq("is_verified", true).or(orFilter).limit(800)
      .then(({ data }) => { if (live) { setRows(data || []); setLoading(false); } });
    return () => { live = false; };
  }, [num]);

  // שכבת הישויות: מאילו מהביטויים שנפלו על המספר הם ישויות-זהב (node), ומה הקשרים שלהן.
  useEffect(() => {
    let live = true;
    const phrases = [...new Set(rows.map(r => r.phrase))];
    if (!phrases.length) { setEntities([]); setRelated([]); return; }
    (async () => {
      const { data: ents } = await supabase.from("nodes")
        .select("id,label,weight,description,metadata").eq("type", "entity").eq("is_active", true).in("label", phrases);
      if (!live) return;
      const E = (ents || []).map(n => ({ id: n.id, label: n.label, weight: n.weight || 3, world: n.metadata?.world, desc: n.description, tier: n.metadata?.tier || null, display: n.metadata?.display || null }))
        .sort((a, b) => (b.tier === "gold" ? 1 : 0) - (a.tier === "gold" ? 1 : 0) || b.weight - a.weight);
      setEntities(E);
      if (!E.length) { setRelated([]); return; }
      const { data: eg } = await supabase.from("edges")
        .select("to_node").eq("relation_type", "related").in("from_node", E.map(e => e.id));
      const toIds = [...new Set((eg || []).map(x => x.to_node))];
      if (!toIds.length) { setRelated([]); return; }
      const { data: rn } = await supabase.from("nodes")
        .select("label,weight,metadata").eq("is_active", true).in("id", toIds);
      if (!live) return;
      const have = new Set(E.map(e => e.label));
      setRelated((rn || [])
        .filter(n => !have.has(n.label))
        .map(n => ({ label: n.label, weight: n.weight || 3, world: n.metadata?.world }))
        .sort((a, b) => b.weight - a.weight));
    })();
    return () => { live = false; };
  }, [rows]);

  // 📖 פוסטי-המקור לכל ישות — RPC משולב: קודם קשרי-הגרף (edges: post mentions entity),
  // ואם אין — חיפוש הביטוי בפוסטים עצמם (כותרת קודם, ואז תוכן). מפנה — לא מעתיק (עץ אחד).
  useEffect(() => {
    let live = true;
    if (!entities.length) { setEntityPosts({}); return; }
    supabase.rpc("cross_source_posts", { p_labels: entities.map(e => e.label) })
      .then(({ data }) => {
        if (!live) return;
        const m = {};
        for (const r of data || []) {
          if (!r.slug) continue;
          (m[r.label] = m[r.label] || []).push({ slug: r.slug, title: decodeTitle(r.title) });
        }
        setEntityPosts(m);
      });
    return () => { live = false; };
  }, [entities]);

  // לכל ביטוי — השיטות שבהן נפל על המספר, אחרי קיפול תלות (method_hierarchy_ragil_foundation):
  // «גדול» ששווה ל«רגיל» = אין אות סופית = אותה ראיה, לא שיטה נפרדת → מקופל.
  const phraseMethods = useMemo(() => {
    const map = {};
    for (const r of rows) {
      let hits = METHOD_COLS.filter(m => r[m.col] === num).map(m => m.col);
      if (hits.includes("ragil") && hits.includes("gadol")) hits = hits.filter(c => c !== "gadol");
      if (hits.length) map[r.phrase] = [...new Set([...(map[r.phrase] || []), ...hits])];
    }
    return map;
  }, [rows, num]);

  // כמה ביטויים קופלו (גדול=רגיל) — לשקיפות בתעודה
  const foldedCount = useMemo(() =>
    rows.filter(r => r.ragil === num && r.gadol === num).length, [rows, num]);

  // קיבוץ לפי שיטה — מהמפה המקופלת (ספירה ישרה, לא מנופחת)
  const groups = useMemo(() => {
    const byCol = {};
    for (const [p, cols] of Object.entries(phraseMethods))
      for (const c of cols) (byCol[c] = byCol[c] || new Set()).add(p);
    return METHOD_COLS
      .map(m => ({ ...m, phrases: [...(byCol[m.col] || [])] }))
      .filter(g => g.phrases.length > 0)
      .sort((a, b) => b.phrases.length - a.phrases.length);
  }, [phraseMethods]);

  const allPhrases = useMemo(() => Object.keys(phraseMethods), [phraseMethods]);
  const methodsHit = groups.length;   // שיטות בלתי-תלויות בלבד
  const meaning = KEY_NUMBERS[num];

  // דירוג ביטויים בתוך שיטה: ישויות-זהב → ישויות → מי שנופל ביותר שיטות → הקצר קודם
  const entityRank = useMemo(() => {
    const m = {};
    for (const e of entities) m[e.label] = e.tier === "gold" ? 2 : 1;
    return m;
  }, [entities]);
  const rankPhrases = list => [...list].sort((a, b) =>
    (entityRank[b] || 0) - (entityRank[a] || 0) ||
    (phraseMethods[b]?.length || 0) - (phraseMethods[a]?.length || 0) ||
    a.length - b.length);

  // 📜 תעודת המספר — פסקה מוסברת, דטרמיניסטית, כולה מנתוני המנוע (אפס המצאות)
  const certificate = useMemo(() => {
    if (!allPhrases.length) return null;
    const densest = groups[0];
    const rarest = groups[groups.length - 1];
    const goldCount = entities.filter(e => e.tier === "gold").length;
    let s = `על ${num} נופלים ${allPhrases.length} ביטויים מאומתים ב-${methodsHit} ${methodsHit === 1 ? "שיטה" : "שיטות"} בלתי-תלויות`;
    if (goldCount) s += `, ובהם ${goldCount === 1 ? "ישות-זהב אחת" : `${goldCount} ישויות-זהב`}`;
    s += `. ההתכנסות הצפופה ביותר — ב«${densest.name}» (${densest.phrases.length} ביטויים)`;
    if (rarest && rarest.col !== densest.col)
      s += `; הנדירה ביותר — ב«${rarest.name}», ${rarest.phrases.length === 1 ? "ביטוי אחד בלבד" : `רק ${rarest.phrases.length} ביטויים`} בכל המאגר — ככל שהמשפחה קטנה, הראיה נדירה וחזקה יותר`;
    s += ANCHOR_SET.has(num) ? `. המספר עצמו הוא עוגן קדוש במערכת.` : ".";
    return s;
  }, [allPhrases.length, groups, entities, methodsHit, num]);

  // כרטיסי-שיטה מקופלים — top-5 גלוי, השאר בלחיצה
  const [expanded, setExpanded] = useState({});
  useEffect(() => { setExpanded({}); }, [num]);
  const TOP_N = 5;
  // רצועת-המסר — מדורגת ומקופלת גם היא
  const [stripOpen, setStripOpen] = useState(false);
  const STRIP_N = 15;

  // מסר נרטיבי — נבנה מהעולמות והקשרים של הישויות.
  const narrative = useMemo(() => {
    if (!entities.length) return null;
    const worlds = [...new Set(entities.map(e => e.world).filter(Boolean))].slice(0, 3);
    const tops = entities.slice(0, 3).map(e => e.label);
    const rel = related.slice(0, 4).map(r => r.label);
    let s = `המספר ${num} נע סביב ` + (worlds.length ? `עולמות של ${worlds.join(" · ")}` : "ציר משמעות אחד");
    if (tops.length) s += `, ומתכנס אל ${tops.join(" · ")}`;
    s += rel.length ? `. קשריו מובילים גם אל ${rel.join(" · ")}.` : ".";
    return s;
  }, [entities, related, num]);

  function go(v) {
    const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
    if (n > 0) { setNum(n); setInput(String(n)); }
  }
  function submit(e) { e.preventDefault(); go(input); }

  // 🚧 הדף סגור לציבור בזמן השדרוג הגדול (תוכנית «תעודת המספר») — אדמין ממשיך לעבוד רגיל
  if (!isAdmin) return (
    <div style={{ direction: "rtl", maxWidth: 560, margin: "0 auto", padding: "80px 20px 100px", textAlign: "center" }}>
      <div style={{ background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "42px 26px", boxShadow: `0 10px 40px ${P.glow}` }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⟡</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>הצלבת השיטות — בשדרוג</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 420, margin: "0 auto 20px" }}>
          המנוע עובר שדרוג עומק: במקום רשימות — <b style={{ color: P.ink }}>תעודת-מספר מוסברת</b> עם
          מד-נדירות, שיטות בלתי-תלויות והמסר המצטרף. נפתח מחדש בקרוב.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/number/1820" style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "10px 24px", borderRadius: 999 }}>🔢 בינתיים — דף המספר ←</Link>
          <Link to="/beit-midrash" style={{ textDecoration: "none", background: P.card, border: `1px solid ${P.border}`, color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 24px", borderRadius: 999 }}>📚 בית המדרש</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={contentRef} style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "26px 16px 80px", color: P.inkSoft, background: P.pageBg }}>

      {/* כותרת */}
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>הצלבת שיטות</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, margin: "6px 0 8px", textShadow: `0 0 40px ${P.glow}` }}>
          המסר המצטרף שמאחורי המספר
        </h1>
        {/* 🖨️ הדפסה + 💾 שמירה פרטית לדף העבודה */}
        <div style={{ marginTop: 10 }}>
          <DocActions kind="cross" refId={num} title={`הצלבת שיטות · ${num}`} link={`/cross?n=${num}`} contentRef={contentRef} />
        </div>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, maxWidth: 640, margin: "0 auto" }}>
          כל הביטויים <b style={{ color: P.ink }}>המאומתים</b> שנופלים על אותו מספר — בכל שיטה ושיטה.
          כשמספר אחד הוא נקודת מפגש של שיטות רבות, הביטויים סביבו נקראים יחד כמסר.
        </p>

        {/* 🧭 מה זו הצלבה? — מסביר אינטראקטיבי: עיגולים שנפתחים לריבועי-הסבר עם דוגמה חיה */}
        <div style={{ maxWidth: 660, margin: "16px auto 0" }}>
          <div style={{ color: P.accent, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 1.5, marginBottom: 10 }}>
            מה זו הצלבה? לחצו על כל שלב 👇
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
            {EXPLAIN.map((s, i) => {
              const on = expl === s.k;
              return (
                <React.Fragment key={s.k}>
                  <button onClick={() => setExpl(x => (x === s.k ? null : s.k))} aria-expanded={on}
                    style={{ cursor: "pointer", width: 74, height: 74, borderRadius: "50%",
                      background: on ? P.cardGrad : P.card,
                      border: on ? `2px solid ${P.accent}` : `1.5px solid ${P.borderStrong}`,
                      boxShadow: on ? `0 0 26px ${P.glow}` : "none",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                      color: on ? P.accentText : P.ink, transition: "box-shadow .18s ease, border-color .18s ease" }}>
                    <span style={{ fontSize: 19, lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>{s.t}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9.5, color: P.accentDim }}>{i + 1}/3</span>
                  </button>
                  {i < EXPLAIN.length - 1 && <span style={{ color: P.accentDim, fontSize: 16, padding: "0 2px" }}>←</span>}
                </React.Fragment>
              );
            })}
          </div>
          {expl && (() => {
            const s = EXPLAIN.find(x => x.k === expl);
            return (
              <div style={{ marginTop: 12, background: P.cardGrad, border: `1px solid ${P.accent}`, borderRadius: 14, padding: "15px 18px", textAlign: "center" }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>{s.icon} {s.head}</div>
                <p style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 2, margin: "8px 0 11px" }}>{s.body}</p>
                <Link to={s.demo.to} onClick={() => { if (s.demo.to.startsWith("/cross")) { const n = Number(s.demo.to.split("n=")[1]); if (n) { go(n); setExpl(null); } } }}
                  style={{ textDecoration: "none", display: "inline-block", background: P.accentBtn, color: P.onAccent,
                    fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "8px 20px", borderRadius: 999 }}>
                  ✦ דוגמה חיה: {s.demo.label} ←
                </Link>
                <div style={{ marginTop: 9, color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>
                  ⚙️ הערכים בדוגמאות אומתו במנוע · 🔎 המשמעות — רמז משלים
                </div>
              </div>
            );
          })()}
        </div>
      </header>

      {/* קלט */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} inputMode="numeric"
          placeholder="הקלידו מספר…"
          style={{ background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.accentText, fontFamily: F.mono, fontSize: 18, padding: "10px 22px", outline: "none", textAlign: "center", width: 160, letterSpacing: 1 }} />
        <button type="submit" style={btn}>הצלב ✦</button>
      </form>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
        {SAMPLES.map(s => (
          <button key={s} onClick={() => go(s)} style={{ ...chip, ...(s === num ? chipOn : {}) }}>{s}</button>
        ))}
      </div>

      {/* 🧩 גשר לציר ההתכנסות — אם יש כרטיס על המספר */}
      {cards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {cards.map(c => (
            <Link key={c.id} to={`/topic/${encodeURIComponent(c.slug)}`} style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
              background: P.cardGrad,
              border: `1px solid ${P.accent}`, borderRadius: 999, padding: "7px 16px",
              color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700,
            }}>🧩 ציר התכנסות: {c.title} →</Link>
          ))}
        </div>
      )}

      {/* 📜 תעודת המספר — סיכום-מנוע מוסבר (שיטות בלתי-תלויות בלבד, לא ספירה מנופחת) */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(44px,11vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 50px ${P.glow}` }}>{num}</div>
        {meaning && <div style={{ color: P.accent, fontFamily: F.regal, fontSize: 16, marginTop: 6 }}>{meaning}</div>}
        {!loading && allPhrases.length > 0 && (
          <>
            <div style={{ marginTop: 12, display: "inline-flex", gap: 18, flexWrap: "wrap", justifyContent: "center", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>
              <span><b style={{ color: P.ink, fontFamily: F.mono, fontSize: 16 }}>{methodsHit}</b> שיטות בלתי-תלויות</span>
              <span>·</span>
              <span><b style={{ color: P.ink, fontFamily: F.mono, fontSize: 16 }}>{allPhrases.length}</b> ביטויים מאומתים</span>
              <span>·</span>
              <span style={{ color: P.accentText, fontWeight: 700 }}>{strengthLabel(methodsHit)}</span>
            </div>
            {certificate && (
              <p style={{ maxWidth: 620, margin: "14px auto 0", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 14,
                padding: "14px 18px", color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 2, textAlign: "center" }}>
                {certificate}
              </p>
            )}
            <div style={{ marginTop: 8, color: P.accentDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7 }}>
              עובדה: כל הערכים חושבו ואומתו במנוע. משמעות השיטות — רמז משלים.
              {foldedCount > 0 && ` · «גדול» נספר רק כשיש אות סופית (${foldedCount} ${foldedCount === 1 ? "ביטוי קופל" : "ביטויים קופלו"} לתוך «רגיל»)`}
            </div>
          </>
        )}
      </div>

      {/* ✨ המסר המרכזי — ישויות-זהב מדורגות לפי משמעות */}
      {!loading && entities.length > 0 && (
        <section style={{ marginBottom: 18, background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 20px" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>✨ המסר המרכזי</div>
          {/* מסר מהמספרים (AI) — סגור עד שהמנוע יושלם */}
          <div style={{ textAlign: "center", margin: "0 auto 14px", maxWidth: 600, color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 1, border: `1px dashed ${P.borderStrong}`, borderRadius: 10, padding: "11px 14px" }}>
            🔒 מסר מהמספרים (AI) — המנוע עדיין בפיתוח
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 480, margin: "0 auto" }}>
            {entities.map(e => {
              const vias = (phraseMethods[e.label] || []).map(c => METHOD_BY_COL[c]).filter(Boolean);
              const isGold = e.tier === "gold";
              const srcPosts = entityPosts[e.label] || [];
              return (
              <div key={e.label}>
              <Link to={`/number/${encodeURIComponent(e.label)}`} style={{ display: "block", textDecoration: "none",
                padding: isGold ? "13px 15px" : "9px 13px", borderRadius: isGold ? 13 : 10,
                background: isGold ? P.cardGrad : P.card,
                border: isGold ? `1.5px solid ${P.accent}` : `1px solid ${P.border}`,
                boxShadow: isGold ? `0 0 28px ${P.glow}` : "none" }}>
                {isGold && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11, letterSpacing: 2.5, marginBottom: 5 }}>👑 ישות זהב</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: isGold ? 22 : 19, fontWeight: 700, minWidth: 96 }}>{e.display || e.label}</span>
                  {isGold ? <span style={{ fontSize: 18 }} title="ישות זהב">👑</span> : <Stars n={e.weight} P={P} />}
                  {e.world && <span style={{ marginInlineStart: "auto", color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>{e.world}</span>}
                </div>
                {isGold && e.display && e.display !== e.label && (
                  <div style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5, marginTop: 5, opacity: 0.9 }}>{e.label} = {num}</div>
                )}
                {e.desc && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 3 }}>{e.desc}</div>}
                {vias.length > 0 && (
                  <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {vias.map(m => (
                      <span key={m.col} title={m.soul} style={{ color: (m.col === "atbash" || m.col === "albam") ? P.accentText : P.accentDim, fontFamily: F.body, fontSize: 11, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 8px" }}>
                        {m.icon} {m.name}{(m.col === "atbash" || m.col === "albam") ? ` · ${m.soul}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
              {/* 📖 פוסט המקור — גלוי על כל הצלבה, מפנה לפוסט המלא (עץ אחד: מפנים, לא מעתיקים) */}
              {srcPosts.length > 0 && (
                <div style={{ margin: "0 10px", padding: "7px 12px 8px", background: P.card,
                  border: `1px solid ${P.border}`, borderTop: "none", borderRadius: "0 0 11px 11px",
                  display: "flex", flexDirection: "column", gap: 4 }}>
                  {srcPosts.map(p => (
                    <Link key={p.slug} to={`/${p.slug}`} style={{ textDecoration: "none", color: P.accentText,
                      fontFamily: F.body, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6 }}>
                      📖 פוסט המקור: {p.title} ←
                    </Link>
                  ))}
                </div>
              )}
              </div>
            );})}
          </div>
          {related.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${P.border}` }}>
              <div style={{ color: P.accent, fontFamily: F.heading, fontSize: 12.5, marginBottom: 8 }}>🌳 ישויות קרובות</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {related.slice(0, 12).map(r => (
                  <Link key={r.label} to={`/number/${encodeURIComponent(r.label)}`} style={{ ...phraseChip, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {r.label} <span style={{ color: P.accentDim, fontSize: 10 }}>{"★".repeat(r.weight)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* מצב */}
      {loading && <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 30 }}>טוען…</div>}
      {!loading && allPhrases.length === 0 && (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 30 }}>
          אין ביטוי מאומת שנופל על {num} באף שיטה. נסו מספר אחר.
        </div>
      )}

      {/* כרטיסי השיטות — מדורג ומוסבר: top-5 גלוי (ישויות קודם), השאר בלחיצה. עובדה ↑ רמז ↓ */}
      {!loading && groups.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {groups.map(g => {
            const ranked = rankPhrases(g.phrases);
            const open = !!expanded[g.col];
            const shown = open ? ranked : ranked.slice(0, TOP_N);
            const rest = ranked.length - TOP_N;
            return (
            <section key={g.col} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ borderBottom: `1px solid ${P.border}`, paddingBottom: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{g.icon} {g.name}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ color: P.accent, fontFamily: F.mono, fontSize: 13 }} title="גודל המשפחה — כמה ביטויים מאומתים נופלים כאן">{g.phrases.length}</span>
                </div>
                {/* עובדה (מה השיטה מחשבת) ↑ · רמז (מה נהוג לקרוא בה) ↓ — הפרדה מפורשת */}
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 3 }}>⚙️ {g.sub}</div>
                <div style={{ color: P.accent, fontFamily: F.body, fontSize: 11.5, fontStyle: "italic", marginTop: 2 }}>🔎 רמז: {g.soul}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {shown.map(p => {
                  const tier = entityRank[p] || 0;
                  return (
                    <Link key={p} to={`/number/${encodeURIComponent(p)}`} style={{ ...phraseChip,
                      ...(tier === 2 ? { borderColor: P.accent, color: P.accentText, fontWeight: 700 } : tier === 1 ? { borderColor: P.borderStrong } : {}) }}>
                      {tier === 2 ? "👑 " : ""}{p}
                    </Link>
                  );
                })}
              </div>
              {rest > 0 && (
                <button onClick={() => setExpanded(x => ({ ...x, [g.col]: !open }))} style={{ cursor: "pointer", marginTop: 9, background: "none",
                  border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: 0 }}>
                  {open ? "▴ הצג פחות" : `▾ הצג את כל ${ranked.length} הביטויים`}
                </button>
              )}
            </section>
          );})}
        </div>
      )}

      {/* רצועת המסר — מדורגת (ישויות קודם) ומקופלת */}
      {!loading && allPhrases.length > 1 && (() => {
        const ranked = rankPhrases(allPhrases);
        const shown = stripOpen ? ranked : ranked.slice(0, STRIP_N);
        return (
        <section style={{ marginTop: 26, background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
            המסר המצטרף · {num}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", lineHeight: 2 }}>
            {shown.map((p, i) => (
              <React.Fragment key={p}>
                <Link to={`/number/${encodeURIComponent(p)}`} style={{ color: entityRank[p] ? P.accentText : P.ink, fontFamily: F.regal, fontSize: 17, textDecoration: "none", fontWeight: entityRank[p] === 2 ? 800 : 400 }}>{entityRank[p] === 2 ? "👑 " : ""}{p}</Link>
                {i < shown.length - 1 && <span style={{ color: P.accentDim }}>·</span>}
              </React.Fragment>
            ))}
          </div>
          {ranked.length > STRIP_N && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button onClick={() => setStripOpen(v => !v)} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`,
                color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 16px" }}>
                {stripOpen ? "▴ הצג פחות" : `▾ עוד ${ranked.length - STRIP_N} ביטויים`}
              </button>
            </div>
          )}
        </section>
      );})()}

      <div style={{ textAlign: "center", marginTop: 26, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/journey" style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "9px 22px", borderRadius: 999 }}>🎲 קחו אותי למסע</Link>
        <Link to="/beit-midrash" style={{ ...chip, textDecoration: "none" }}>← לבית המדרש</Link>
      </div>
    </div>
  );
}

function Stars({ n = 3, P }) {
  return (
    <span style={{ color: P.accent, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap" }} title={`משמעות ${n}/5`}>
      {"★".repeat(n)}<span style={{ color: P.border }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}
