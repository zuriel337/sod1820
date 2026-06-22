import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPhraseValueFamilies, getValuePhraseList, getRandomStartPhrase, logView, zeroScales } from "../lib/supabase.js";
import { shareNumberSmart } from "../lib/numberCard.js";
import { clamp, isNumeric, dominantWorld } from "../lib/journey.js";

// ===== «מסע ההתכנסות» — טיול בתוך הערך (value-as-trunk) =====
// המסע מטייל בין ביטויים ששווים לאותו ערך גימטרי (משפחת-הערך מ-bidim). ערך-היעד נסתר עד השיא,
// ואז נחשף: "לא טיילת בין מילים — טיילת בתוך הערך 596". כשמשפחת-הערך נגמרת, המסע אינו נעצר מיד —
// הוא «קופץ» לסקאלת-אפס עשירה (zero_scale_law: 560→5600) וממשיך. הערך מהדהד כלפי מעלה. רק כשגם
// משפחת-התהודה נגמרת — נעצר ביושר. אין קפיצות מומצאות.

const LINES = [
  "ומה עוד נפגש כאן —",
  "החוט ממשיך אל",
  "ומשם נפתח שביל אל",
  "הערך לוחש לך גם על",
  "תחנה הבאה במסע —",
  "ומכאן אל",
];

// 🤖 «מסר מהמנוע» (בטא) — הודעה שנגזרת מנתוני המסע עצמם (לא טקסט קבוע). בעתיד תהפוך ל-AI מותאם.
function engineMessage({ root, bases = [], stations = 0, dWorld }) {
  const out = [];
  if (stations > 0) out.push(`ראיתי אותך עובר ${stations} תחנות — וכולן, ללא יוצא מן הכלל, נפלו על ${root}.`);
  if (bases.length > 1) out.push(`והערך לא נעצר: הוא המשיך להדהד בסדרי גודל — ${bases.join(" → ")}. מה שראית קטן ממה שיש מתחת.`);
  if (dWorld) out.push(`השדה ששב וחזר אליך הוא «${dWorld}» — שם נמצא הלב של המסע שלך.`);
  if (KEY_NUMBERS[root]) out.push(`וזכור: ${root} הוא ${KEY_NUMBERS[root]}.`);
  out.push("זה רק קצה הקצה. בגרסה הבאה אדבר אליך אישית — לפי בדיוק מה שחיפשת.");
  return out;
}

// 🔮 ריבוע פיתוחים עתידיים — מה שבדרך (כולל גרסה 2 של המסע)
const FUTURE = [
  { icon: "🤖", title: "מסר מהמנוע — אישי (AI)", note: "ההודעה תיכתב במיוחד עבורך לפי המסע שעשית", soon: true },
  { icon: "🧭", title: "מסע מודרך לפי שדה/עולם", note: "לבחור נושא — והמנוע בונה מסע סביבו" },
  { icon: "💾", title: "המסעות שלי", note: "היסטוריה אישית — לשמור ולחזור למסעות" },
  { icon: "🎴", title: "כרטיס-מסע מעוצב לשיתוף", note: "תמונה שמספרת את כל המסע במבט אחד" },
];

export default function JourneyPage() {
  const P = usePalette();
  const [sp] = useSearchParams();
  const startFrom = (sp.get("from") || "").trim();
  const [target, setTarget] = useState(null);     // ערך-היעד הנסתר (הסקאלה הפעילה)
  const [bases, setBases] = useState([]);          // [value, value*10, ...] — סקאלות שהמסע עבר (שורש→תהודה)
  const [family, setFamily] = useState([]);        // [{phrase, world}] — כל הביטויים = target
  const [path, setPath] = useState([]);            // [{phrase, world} | {leap:true, phrase}] — התחנות שעברנו
  const [goal, setGoal] = useState(5);             // תחנות להתכנסות מלאה
  const [finished, setFinished] = useState(null);  // null | "complete" | "stopped"
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "מסע ההתכנסות · סוד 1820"; }, []);

  // מאתחל מסע: בוחר ערך-יעד נסתר (משפחה עשירה) וטוען את משפחת-הערך לטייל בה.
  async function begin(fromParam) {
    setLoading(true); setFinished(null); setPath([]); setTarget(null); setFamily([]); setBases([]);
    let value = null, startPhrase = null;
    if (isNumeric(fromParam)) {
      value = parseInt(fromParam, 10);
    } else {
      startPhrase = fromParam || await getRandomStartPhrase() || "ירושלים";
      const fams = await getPhraseValueFamilies(startPhrase);
      value = (fams.find(f => f.size >= 3) || fams[0])?.value ?? null;
    }
    if (value == null) { setFinished("stopped"); setLoading(false); return; }
    const fam = await getValuePhraseList(value);
    if (!fam.length) { setTarget(value); setFinished("stopped"); setLoading(false); return; }
    // תחנת הפתיחה: הביטוי שהמשתמש בא ממנו (אם במשפחה) או הראשון במשפחה.
    const startIdx = startPhrase ? fam.findIndex(f => f.phrase === startPhrase) : -1;
    const start = startIdx >= 0 ? fam[startIdx] : fam[0];
    setTarget(value);
    setBases([value]);
    setFamily(fam);
    setGoal(clamp(fam.length, 3, 7));
    setPath([start]);
    setLoading(false);
    logView("journey_start", String(value));   // 📊 פאנל: התחלת מסע
  }

  useEffect(() => { begin(startFrom); }, [startFrom]); // eslint-disable-line

  // 🔢 קפיצת-תהודה — כשמשפחת-הערך נגמרת, מחפש סקאלת-אפס עשירה בביטויים חדשים (zero_scale_law).
  async function tryLeap(seen) {
    if (bases.length >= 3) return null;            // עד 2 קפיצות — לא רץ לאינסוף
    let best = null;
    for (const s of zeroScales(target)) {
      if (bases.includes(s.v)) continue;           // לא חוזרים לסקאלה שכבר היינו בה
      const fam = await getValuePhraseList(s.v).catch(() => []);
      const fresh = fam.filter(f => !seen.has(f.phrase));
      if (fresh.length >= 2 && (!best || fresh.length > best.fresh.length)) best = { v: s.v, fam, fresh };
    }
    if (!best) return null;
    return { value: best.v, fam: best.fam, first: best.fresh[Math.floor(Math.random() * best.fresh.length)] };
  }

  async function step() {
    if (finished || busy || !family.length) return;
    const seen = new Set(path.filter(p => !p.leap).map(p => p.phrase));
    const pool = family.filter(f => !seen.has(f.phrase));
    if (!pool.length) {
      // משפחת-הערך נגמרה → לפני עצירה, ננסה לקפוץ לסקאלת-אפס (הערך מהדהד כלפי מעלה)
      setBusy(true);
      const leap = await tryLeap(seen);
      setBusy(false);
      if (leap) {
        setBases(b => [...b, leap.value]);
        setTarget(leap.value);
        setFamily(leap.fam);
        setGoal(g => g + clamp(leap.fam.length, 2, 4));
        setPath(p => [...p, { leap: true, phrase: `⚡ הערך מהדהד · ${target} → ${leap.value}` }, leap.first]);
        logView("journey_leap", `${target}->${leap.value}`);  // 📊 פאנל: קפיצת-תהודה
        return;
      }
      setFinished("stopped");
      logView("journey_stall", String(target));            // 📊 פאנל: נעצר (גם התהודה נגמרה)
      logView("journey_target_revealed", String(bases[0])); // 📊 פאנל: הערך נחשף
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    const np = [...path, next];
    setPath(np);
    if (np.filter(p => !p.leap).length >= goal) {
      setFinished("complete");
      logView("journey_complete", String(bases[0]));         // 📊 פאנל: השלמת מסע (100%)
      logView("journey_target_revealed", String(bases[0]));  // 📊 פאנל: הערך נחשף
    }
  }

  function restart() { begin(""); }

  const root = bases[0] ?? target;                 // הערך-שורש שאליו התכנס המסע (לפני קפיצות)
  const leaped = bases.length > 1;

  async function shareJourney() {
    if (busy || root == null) return;
    setBusy(true);
    logView("journey_share", String(root));   // 📊 פאנל: שיתוף מסע
    try { await shareNumberSmart(root, path.filter(s => !s.leap).map(s => ({ phrase: s.phrase }))); } finally { setBusy(false); }
  }

  const cur = path[path.length - 1];
  const prev = path.length > 1 ? path[path.length - 2] : null;
  const stations = path.filter(p => !p.leap);
  const dWorld = dominantWorld(stations);
  const progress = goal > 0 ? clamp(Math.round((stations.length / goal) * 100), 0, 100) : 0;

  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "34px 18px 90px", position: "relative", zIndex: 1 }}>
      <style>{`@keyframes jArrive{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes jReveal{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.08)}100%{opacity:1;transform:none}}`}</style>

      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>מסע התכנסות</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 800, margin: "6px 0 6px", textShadow: `0 0 40px ${P.onAccent}` }}>✨ קחו אותי למסע</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 470, margin: "0 auto" }}>
          כל תחנה היא ביטוי חדש — וכולן מובילות אל מספר אחד נסתר. גלו לאיזה ערך כל המסע מתכנס.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>טוען את המסע…</div>
      ) : finished ? (
        /* ───────── מסך הגילוי — העלה מתקפל אל הגזע ───────── */
        <div style={{ textAlign: "center" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
            {finished === "complete" ? "🌳 התכנסות הושלמה" : "המסע נעצר כאן"}
          </div>
          {finished === "stopped" && (
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, marginBottom: 12 }}>הקשרים הידועים הובילו אותך עד לנקודה זו.</div>
          )}
          {root != null && (
            <>
              <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, marginBottom: 4 }}>הגילוי</div>
              <div style={{ animation: "jReveal .7s ease both", color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(64px,16vw,120px)", fontWeight: 900, lineHeight: 1, textShadow: `0 0 50px ${P.glow}` }}>
                {root}
              </div>
              {KEY_NUMBERS[root] && <div style={{ color: P.accent, fontFamily: F.body, fontSize: 14, marginTop: 8, fontStyle: "italic" }}>{KEY_NUMBERS[root]}</div>}
              {leaped && (
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, marginTop: 12, display: "inline-flex", gap: 7, alignItems: "center", flexWrap: "wrap", justifyContent: "center", background: P.glow, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "6px 16px" }}>
                  <span>⚡ הערך מהדהד בסדרי גודל:</span>
                  {bases.map((b, i) => <React.Fragment key={b}>{i > 0 && <span style={{ color: P.accentDim }}>→</span>}<b style={{ color: P.accentText }}>{b}</b></React.Fragment>)}
                </div>
              )}
              <p style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(16px,3vw,20px)", fontWeight: 700, lineHeight: 1.6, maxWidth: 460, margin: "18px auto 6px" }}>
                {leaped ? "לא טיילת בין מילים. טיילת בתוך הערך — והוא הִדהד מעלה." : "לא טיילת בין מילים. טיילת בתוך הערך."}
              </p>
            </>
          )}
          {dWorld && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginBottom: 18 }}>השדה המשותף: <b style={{ color: P.ink }}>{dWorld}</b></div>}

          {/* השביל — מההתחלה אל הגזע */}
          {path.length > 0 && (
            <div style={{ display: "inline-flex", flexDirection: "column", gap: 7, alignItems: "center", margin: "6px auto 24px" }}>
              {path.map((s, i) => (
                <React.Fragment key={i}>
                  {s.leap
                    ? <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, fontStyle: "italic" }}>{s.phrase}</span>
                    : <span style={{ color: i === 0 ? P.accentText : P.ink, fontFamily: F.body, fontSize: 15, fontWeight: i === 0 ? 800 : 600,
                      border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "4px 16px", background: P.glow }}>{s.phrase}</span>}
                  {i < path.length - 1 && <span style={{ color: P.accentDim, fontSize: 14 }}>↓</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* 🤖 מסר מהמנוע (בטא) — נגזר מנתוני המסע */}
          {root != null && (
            <div style={{ maxWidth: 520, margin: "0 auto 18px", textAlign: "right", background: P.cardGrad, border: `1.5px solid ${P.borderStrong}`, borderRadius: 18, padding: "16px 18px", boxShadow: `0 0 30px ${P.glow}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "space-between" }}>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 0.5 }}>🤖 מסר מהמנוע</span>
                <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 9px" }}>בטא · בפיתוח</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {engineMessage({ root, bases, stations: stations.length, dWorld }).map((line, i, a) => (
                  <p key={i} style={{ margin: 0, color: i === a.length - 1 ? P.accentDim : P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, fontStyle: i === a.length - 1 ? "italic" : "normal" }}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* 🔮 ריבוע פיתוחים עתידיים + גרסה 2 */}
          <div style={{ maxWidth: 520, margin: "0 auto 24px", textAlign: "right", background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>🔮 מה עוד בדרך</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>המסע הזה רק מתחיל לגדול. הנה מה שהמנוע יֵדע לעשות בקרוב:</div>
            <div style={{ display: "grid", gap: 8 }}>
              {FUTURE.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: P.glow, border: `1px solid ${P.border}`, borderRadius: 12, padding: "9px 12px" }}>
                  <span style={{ fontSize: 17, lineHeight: 1.2 }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>{f.title}{f.soon && <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 10, fontWeight: 800, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "1px 7px", marginInlineStart: 8 }}>בקרוב</span>}</div>
                    <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{f.note}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* גרסה 2 — הכותרת הגדולה */}
            <div style={{ marginTop: 12, background: `linear-gradient(135deg, ${P.accent}22, ${P.glow})`, border: `1.5px solid ${P.accent}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>✨ מסע · גרסה 2</span>
                <span style={{ color: P.onAccent, background: P.accentBtn, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 10px" }}>בדרך</span>
              </div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65, marginTop: 6 }}>
                מסע מודרך עם הסתעפויות לבחירתך, בחירת עומק (קצר/עמוק), ומסר-מנוע אישי שנכתב בזמן אמת. אתה תכוון את המסע — לא רק תצפה בו.
              </div>
            </div>
          </div>

          {/* כפתורים — פתיחת הגזע · שיתוף · מסע חדש */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {root != null && (
              <Link to={`/number/${root}`} onClick={() => logView("journey_open", String(root))} style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 30px", boxShadow: `0 0 30px ${P.onAccent}` }}>
                פתח את {root} →
              </Link>
            )}
            {root != null && (
              <button onClick={shareJourney} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: P.card, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 22px" }}>
                {busy ? "מכין…" : "שתפו את המסע ✦"}
              </button>
            )}
            <button onClick={restart} style={{ cursor: "pointer", background: "none", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, padding: "13px 18px" }}>
              מסע חדש 🎲
            </button>
          </div>
        </div>
      ) : cur ? (
        /* ───────── המסע עצמו (ערך-היעד נסתר) ───────── */
        <>
          {/* מד ההתכנסות — מטפס לקראת הגילוי (במקום "תחנה N מתוך M") */}
          <div style={{ maxWidth: 460, margin: "0 auto 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 1.5, textTransform: "uppercase" }}>התכנסות</span>
              <span style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: P.cardSoft, borderRadius: 999, overflow: "hidden", border: `1px solid ${P.border}` }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${P.accent}, ${P.accentText})`, transition: "width .5s ease" }} />
            </div>
          </div>

          {/* קריינות התחנה */}
          {prev && (
            <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13.5, marginBottom: 10 }}>
              <span style={{ color: P.inkSoft }}>{prev.phrase}</span>　{LINES[(path.length - 2) % LINES.length]}…
            </div>
          )}
          <div key={path.length} style={{
            animation: "jArrive .55s ease both", textAlign: "center",
            background: P.cardGrad,
            border: `1.5px solid ${P.borderStrong}`, borderRadius: 20, padding: "34px 22px", boxShadow: `0 0 40px ${P.onAccent}`,
          }}>
            <div style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13, marginBottom: 6 }}>תחנה {path.length}</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5.5vw,44px)", fontWeight: 800, lineHeight: 1.25 }}>{cur.phrase}</div>
            {cur.world && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 8 }}>{cur.world}</div>}
          </div>

          {/* כפתורים */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
            <button onClick={step} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 30px", boxShadow: `0 0 30px ${P.onAccent}` }}>
              המשיכו במסע ✨
            </button>
            <Link to={`/number/${encodeURIComponent(cur.phrase)}`} style={{ textDecoration: "none", background: P.card, color: P.ink, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 20px" }}>
              פתחו את {cur.phrase} →
            </Link>
            <button onClick={restart} style={{ cursor: "pointer", background: "none", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, padding: "13px 18px" }}>
              מסע חדש 🎲
            </button>
          </div>

          {/* שביל המסע */}
          {path.length > 1 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}>השביל שעברתם</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", alignItems: "center" }}>
                {path.slice(-12).map((s, i, a) => (
                  <React.Fragment key={i}>
                    {s.leap
                      ? <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, fontStyle: "italic" }}>{s.phrase}</span>
                      : <span style={{ color: s === cur ? P.accentText : P.inkSoft, fontFamily: F.body, fontSize: 13, border: `1px solid ${s === cur ? P.borderStrong : P.border}`, borderRadius: 999, padding: "3px 11px" }}>{s.phrase}</span>}
                    {i < a.length - 1 && <span style={{ color: P.accentDim, fontSize: 12 }}>←</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>לא נמצא מסע מתאים. <button onClick={restart} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontWeight: 700 }}>נסו מסע חדש 🎲</button></div>
      )}
    </div>
  );
}
