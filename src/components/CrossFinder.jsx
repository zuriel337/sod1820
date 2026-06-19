import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { findNameCross } from "../lib/nameCross.js";
import { shareCross, crossCardDataUrl } from "../lib/crossCard.js";

// 🔮 "מצא לי הצלבה" — לשם/ביטוי נתון, מוצא מילים קדושות שמתכנסות איתו בכמה שיטות.
// מנוע: findNameCross (gematria_engine_law — חישוב דרך METHODS בלבד). שיתוף ויזואלי: shareCross.
// אם יש יותר מהצלבה אחת — מציע לפתוח את כולן. עוגן קדוש מודגש.
const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);

const makeItem = (term, c) => ({
  id: "cross-" + term + "-" + c.partner,
  title: `${term} = ${c.partner}`,
  method_tags: c.methods.map(m => m.label),
  related_numbers: [c.value],
  gematria_pairs: { members: [
    { phrase: term, ragil: c.value, mistater: c.mistater },
    { phrase: c.partner, ragil: c.value, mistater: c.mistater },
  ] },
});

// תצוגת הצלבה בודדת — קו «=», עוגן, צ'יפים, שיתוף + תצוגה מקדימה של התמונה
function Cross({ term, c, P, primary }) {
  const [shareBusy, setShareBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pBusy, setPBusy] = useState(false);
  const item = makeItem(term, c);
  const anchorMethod = c.methods.find(m => ANCHOR_SET.has(m.value));
  const big = primary ? "clamp(19px,4vw,26px)" : "clamp(16px,3.4vw,21px)";

  const doShare = async () => { if (shareBusy) return; setShareBusy(true); try { await shareCross(item); } finally { setShareBusy(false); } };
  const doPreview = async () => {
    if (pBusy) return;
    if (preview) { setPreview(null); return; }
    setPBusy(true); try { setPreview(await crossCardDataUrl(item)); } catch { /* ignore */ } finally { setPBusy(false); }
  };

  return (
    <div style={primary ? {} : { borderTop: `1px solid ${P.border}`, paddingTop: 12, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ color: P.heroNum, fontFamily: F.regal, fontSize: big, fontWeight: 800 }}>{term}</span>
        <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: primary ? 20 : 17, fontWeight: 800 }}>=</span>
        <Link to={`/number/${encodeURIComponent(c.partner)}`} style={{ textDecoration: "none", color: P.heroNum, fontFamily: F.regal, fontSize: big, fontWeight: 800 }}>{c.partner}</Link>
      </div>

      {anchorMethod && (
        <div style={{ textAlign: "center", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>
          ✨ עוגן קדוש — {anchorMethod.value} ב{anchorMethod.label}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        {c.methods.slice(0, 8).map(m => {
          const anc = ANCHOR_SET.has(m.value);
          return (
            <span key={m.col} style={{ fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, color: anc ? P.accentText : P.accentDim, background: anc ? "rgba(201,162,39,0.16)" : P.card, border: `1px solid ${anc ? P.borderStrong : P.border}`, borderRadius: 999, padding: "3px 10px" }}>
              {anc ? "✨ " : ""}{m.label} = {m.value}
            </span>
          );
        })}
      </div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textAlign: "center", marginTop: 8 }}>
        {c.matchCount} שיטות מסכימות — עובדה גימטרית, לא פרשנות.
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={doShare} disabled={shareBusy} style={{ cursor: shareBusy ? "wait" : "pointer", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#1a0e00", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: primary ? 14.5 : 13, fontWeight: 800, padding: primary ? "11px 24px" : "9px 18px" }}>
          {shareBusy ? "מכין…" : "✦ שתפו"}
        </button>
        <button onClick={doPreview} disabled={pBusy} style={{ cursor: pBusy ? "wait" : "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: primary ? "11px 18px" : "9px 14px" }}>
          {pBusy ? "מכין…" : preview ? "▴ הסתר תמונה" : "👁 תצוגה מקדימה"}
        </button>
      </div>

      {preview && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img src={preview} alt={`הצלבה ${term} = ${c.partner}`} style={{ width: "100%", maxWidth: 320, borderRadius: 14, border: `1px solid ${P.borderStrong}`, boxShadow: `0 6px 22px ${P.glow}` }} />
        </div>
      )}
    </div>
  );
}

export default function CrossFinder({ term }) {
  const P = usePalette();
  const [status, setStatus] = useState("idle"); // idle · busy · done · none
  const [cross, setCross] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const engaged = useRef(false); // האם המשתמש כבר הפעיל — אז נרענן אוטומטית בכל שם חדש

  const find = useCallback(async () => {
    engaged.current = true;
    setStatus("busy"); setCross(null); setShowMore(false);
    try {
      const c = await findNameCross(term);
      if (c && c.matchCount >= 2) { setCross(c); setStatus("done"); }
      else setStatus("none");
    } catch { setStatus("none"); }
  }, [term]);

  // שם/ביטוי חדש → לנקות תוצאה ישנה; אם המשתמש כבר הפעיל פעם — לרענן לבד (בלי "עוד אחת")
  useEffect(() => {
    setCross(null); setShowMore(false);
    if (engaged.current) find();
    else setStatus("idle");
  }, [term, find]);

  const others = (cross && cross.others) || [];

  return (
    <div style={{ background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: `0 4px 22px ${P.glow}` }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>✦ ההצלבה הנסתרת</div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.65, marginBottom: 12 }}>
        איזו מילה או מושג קדוש מתחבא ב«{term}» — נופל על אותו ערך בכמה שיטות שונות?
      </div>

      {status === "idle" && (
        <button onClick={find} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px" }}>
          🔮 מצא לי הצלבה
        </button>
      )}

      {status === "busy" && (
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, padding: "6px 0" }}>🔍 סורק את המאגר…</div>
      )}

      {status === "none" && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
          לא נמצאה הצלבה חזקה במאגר (עדיין). המאגר גדל כל הזמן — נסו במחשבון לחקור בעצמכם:
          <div style={{ marginTop: 9 }}>
            <Link to="/beit-midrash?tab=calc" style={{ textDecoration: "none", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "8px 16px" }}>🧮 חקרו במחשבון →</Link>
          </div>
        </div>
      )}

      {status === "done" && cross && (
        <div style={{ animation: "cf-rise .5s ease both" }}>
          <style>{`@keyframes cf-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
          <Cross term={term} c={cross} P={P} primary />

          {/* יש עוד הצלבות? — אופציה לפתוח */}
          {others.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowMore(s => !s)} style={{ cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 8, background: showMore ? P.card : "rgba(201,162,39,0.10)", border: `1px solid ${P.borderStrong}`, borderRadius: 12, color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "10px 14px" }}>
                <span style={{ color: P.accentDim, fontSize: 13 }}>{showMore ? "▴" : "▾"}</span>
                <span style={{ flex: 1, textAlign: "right" }}>{showMore ? "הסתר את שאר ההצלבות" : `✦ יש עוד ${others.length} הצלבות ל«${term}» — פתחו לראות`}</span>
              </button>
              {showMore && (
                <div style={{ marginTop: 4 }}>
                  {others.map((o, i) => <Cross key={i} term={term} c={o} P={P} />)}
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={find} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "9px 18px" }}>↺ רענן</button>
          </div>
        </div>
      )}
    </div>
  );
}
