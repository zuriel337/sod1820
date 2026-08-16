import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";

// 🧭 Work Area של הצופן — /lab/els  (Phase 3+4, קריאה-בלבד)
//
// ⛔ אין כאן מנוע. אין fork, אין tzofen-lab.html, אין TzofenLabEmbed, אין ELS ב-React.
//    אותו <TzofenEmbed> בדיוק ואותו /tzofen.html?embed=1 שמשרתים את /code ואת ההיכל.
//    המסך הזה **רק מציג** את ההודעה `state` שהמנוע משדר אחרי כל render() (ראה elsState()).
//
// 🎯 מטרת השלב: acceptance — להוכיח שה-host רואה בדיוק את מה שהמנוע באמת מצא.
//    «פשוט» ו«עומק» הם **שתי תצוגות של אותו state** — לא שני מנועים, לא שתי שאילתות,
//    לא שני state stores. יש בדיוק אובייקט-מצב אחד (useState אחד) ושתי דרכים לצייר אותו.

const dirLabel = (d) => (d === "back" ? "↑ אחורה" : "↓ קדימה");
const MODE_LABEL = {
  regular: "חיפוש רגיל", "cross-simple": "הצלבה פשוטה",
  "cross-free": "התכנסות חופשית", bridge: "גשר דו-מונחי", cross: "הצלבה",
};

export default function ElsWorkAreaPage() {
  const P = usePalette();
  const [state, setState] = useState(null);
  const [deep, setDeep] = useState(false);
  const [seen, setSeen] = useState(0);   // כמה תמונות-מצב הגיעו — חיווי acceptance ש«החוט חי»

  useEffect(() => {
    applySeo({ title: "Work Area · הצופן", description: "סביבת עבודה על מנוע הצופן הקנוני", path: "/lab/els" });
  }, []);

  // ⚠️ יציב על פני רינדורים — אחרת ה-listener ב-TzofenEmbed היה נרשם מחדש בכל תמונת-מצב.
  const onState = useCallback((s) => { setState(s); setSeen(n => n + 1); }, []);

  const card = {
    background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 14,
    padding: "14px 16px", boxSizing: "border-box",
  };
  const label = { color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6 };
  const value = { color: P.ink, fontFamily: F.body, fontSize: 15, fontWeight: 700, marginTop: 2, wordBreak: "break-word" };

  const Row = ({ k, v }) => (
    <div style={{ minWidth: 0 }}><div style={label}>{k}</div><div style={value}>{v}</div></div>
  );
  const Grid = ({ children, min = 132 }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 12 }}>{children}</div>
  );
  const Sect = ({ title, note, children }) => (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 13.5, color: P.accentText, marginBottom: 10 }}>
        {title}{note && <span style={{ color: P.accentDim, fontWeight: 600, fontSize: 11.5 }}> · {note}</span>}
      </div>
      {children}
    </div>
  );

  const s = state;
  const ok = s && s.status === "ok";

  return (
    <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "18px 14px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h1 style={{ margin: 0, color: P.accentText, fontFamily: F.regal, fontSize: "clamp(20px,4vw,30px)", fontWeight: 800 }}>
          🧭 Work Area · הצופן
        </h1>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, border: `1px solid ${P.border}`, borderRadius: 999, padding: "3px 10px" }}>
          קריאה בלבד
        </span>
        <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
          הצופן המלא ←
        </Link>
      </div>

      <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: "0 0 14px", maxWidth: 720 }}>
        אותו מנוע קנוני בדיוק (<code style={{ fontSize: 12.5 }}>/tzofen.html?embed=1</code>). כל מה שלמטה מגיע מהמנוע עצמו —
        ה-host אינו מחשב דילוגים. חפשו בכלי, והלוח יתעדכן.
      </p>

      {/* ── המנוע. אותו רכיב, אותו artifact. ── */}
      <TzofenEmbed onState={onState} />

      {/* ── שתי תצוגות של אותו state ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px", flexWrap: "wrap" }}>
        {[["פשוט", false], ["עומק", true]].map(([t, v]) => (
          <button key={t} type="button" onClick={() => setDeep(v)}
            style={{
              cursor: "pointer", minHeight: 44, padding: "0 18px", borderRadius: 999,
              fontFamily: F.heading, fontSize: 14, fontWeight: 800,
              border: `1px solid ${deep === v ? "transparent" : P.border}`,
              background: deep === v ? P.accentBtn : "transparent",
              color: deep === v ? P.onAccent : P.inkSoft,
            }}>{t}</button>
        ))}
        <span style={{ marginInlineStart: "auto", color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>
          {seen ? `${seen} תמונות-מצב מהמנוע` : "ממתין למנוע…"}
        </span>
      </div>

      {!s && (
        <div style={{ ...card, color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>
          עדיין לא הגיעה תמונת-מצב. חפשו מונח בכלי שלמעלה — המנוע משדר את מצבו אחרי כל רינדור.
        </div>
      )}

      {s && s.status === "empty" && (
        <Sect title="🔍 לא נמצא" note="המנוע השלים חיפוש ולא מצא דילוג">
          <Grid>
            <Row k="מונח" v={`«${s.termRaw || "—"}»`} />
            <Row k="מנורמל" v={s.term || "—"} />
            <Row k="היקף" v={s.scope === "tanakh" ? "כל התנ״ך" : "תורה"} />
            <Row k="אותיות בקורפוס" v={(s.corpusLetters || 0).toLocaleString("he-IL")} />
          </Grid>
        </Sect>
      )}

      {ok && !deep && (
        <>
          <Sect title="① הממצא">
            <Grid>
              <Row k="מונח" v={`«${s.termRaw}»`} />
              <Row k="אורך" v={`${s.length} אותיות`} />
              <Row k="היקף" v={s.scope === "tanakh" ? "כל התנ״ך" : "תורה"} />
              <Row k="מצב חיפוש" v={MODE_LABEL[s.search?.mode] || s.search?.mode} />
            </Grid>
          </Sect>
          <Sect title="② המטריצה">
            <Grid>
              <Row k="דילוג" v={s.axis.skip.toLocaleString("he-IL")} />
              <Row k="כיוון" v={dirLabel(s.axis.direction)} />
              <Row k="רוחב שורה" v={s.geometry.S.toLocaleString("he-IL")} />
              <Row k="מופע" v={`${s.occurrence.index + 1} מתוך ${s.occurrence.count.toLocaleString("he-IL")}${s.occurrence.capped ? "+" : ""}`} />
            </Grid>
          </Sect>
          <Sect title="③ ממצאים במטריצה" note={`${s.findings.length}`}>
            {s.findings.length === 0
              ? <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>אין ממצאים צבועים עדיין.</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {s.findings.map((w, i) => (
                  <span key={w.t + i} style={{
                    display: "inline-flex", alignItems: "center", gap: 7, background: P.cardSoft,
                    border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 12px",
                    fontFamily: F.body, fontSize: 13.5, fontWeight: 700, color: P.ink,
                  }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: w.color, flex: "none" }} />
                    {w.t}
                    <b style={{ color: P.accentDim, fontWeight: 700, fontSize: 12 }}>{w.shown.length}/{w.total}</b>
                  </span>
                ))}
              </div>}
          </Sect>
          <Sect title="④ הבסיס" note="מאיפה זה בא">
            <Grid>
              <Row k="עמדת התחלה" v={s.axis.start.toLocaleString("he-IL")} />
              <Row k="מזהה מופע" v={<code style={{ fontSize: 12.5 }}>{s.axis.hitId}</code>} />
              <Row k="צופן שמור" v={s.provenance.cipherSlug || "—"} />
              <Row k="מחבר" v={s.provenance.author || "—"} />
            </Grid>
          </Sect>
        </>
      )}

      {ok && deep && (
        <>
          <Sect title="הציר" note="axis">
            <Grid>
              <Row k="מונח גולמי" v={`«${s.termRaw}»`} />
              <Row k="מנורמל (engine input)" v={s.term} />
              <Row k="אורך" v={s.length} />
              <Row k="דילוג" v={s.axis.skip.toLocaleString("he-IL")} />
              <Row k="כיוון" v={dirLabel(s.axis.direction)} />
              <Row k="start" v={s.axis.start.toLocaleString("he-IL")} />
              <Row k="hitId" v={<code style={{ fontSize: 12.5 }}>{s.axis.hitId}</code>} />
              <Row k="אותיות בקורפוס" v={(s.corpusLetters || 0).toLocaleString("he-IL")} />
            </Grid>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10, lineHeight: 1.7 }}>
              ⛔ המיקומים אינם משודרים — הם נגזרים: <code>p[k] = start {s.axis.direction === "back" ? "−" : "+"} skip·k</code>, ל-k=0…{s.length - 1}.
            </div>
          </Sect>
          <Sect title="גאומטריה" note="geometry — חלון הסריקה">
            <Grid min={110}>
              <Row k="S (רוחב שורה)" v={s.geometry.S.toLocaleString("he-IL")} />
              <Row k="עמודת הציר" v={s.geometry.mainCol} />
              <Row k="c0 / רוחב" v={`${s.geometry.c0} / ${s.geometry.cw}`} />
              <Row k="שורות r0–r1" v={`${s.geometry.r0.toLocaleString("he-IL")}–${s.geometry.r1.toLocaleString("he-IL")}`} />
            </Grid>
          </Sect>
          <Sect title="מופעים" note="occurrence">
            <Grid>
              <Row k="נבחר" v={s.occurrence.index} />
              <Row k="סה״כ" v={s.occurrence.count.toLocaleString("he-IL")} />
              <Row k="הגיע לתקרה" v={s.occurrence.capped ? "כן — התוצאות נחתכו" : "לא"} />
            </Grid>
          </Sect>
          <Sect title="ממצאים" note="findings · hitId = skip_dir_start">
            {s.findings.length === 0
              ? <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>—</div>
              : <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460, fontFamily: F.body, fontSize: 13 }}>
                  <thead><tr>{["מונח", "מוצג/סה״כ", "בחלון", "מזהי מופעים"].map(h => (
                    <th key={h} style={{ textAlign: "start", color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "6px 8px", borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{s.findings.map((w, i) => (
                    <tr key={w.t + i}>
                      <td style={{ padding: "7px 8px", color: P.ink, fontWeight: 700, whiteSpace: "nowrap" }}>
                        <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: w.color, marginInlineEnd: 7 }} />{w.t}
                      </td>
                      <td style={{ padding: "7px 8px", color: P.inkSoft }}>{w.shown.length}/{w.total}</td>
                      <td style={{ padding: "7px 8px", color: P.inkSoft }}>{w.inWindow}</td>
                      <td style={{ padding: "7px 8px", color: P.inkSoft }}><code style={{ fontSize: 11.5 }}>{w.shown.join(" · ") || "—"}</code></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
          </Sect>
          <Sect title="פרמטרי חיפוש" note="search">
            <Grid>
              <Row k="מצב" v={MODE_LABEL[s.search.mode] || s.search.mode} />
              <Row k="ציר / מונח שני" v={`${s.search.crossA || "—"} × ${s.search.crossB || "—"}`} />
              <Row k="מונחי הצלבה" v={s.search.crossTerms.length ? s.search.crossTerms.join(" · ") : "—"} />
              <Row k="סף טוהר" v={s.search.crossPure} />
              <Row k="אזורי התכנסות" v={s.search.zones ? `${s.search.zones} (מוצג ${s.search.zoneIndex + 1})` : "—"} />
            </Grid>
          </Sect>
          <Sect title="מצב תצוגה" note="ui — הסמנטיקה הקיימת של המנוע">
            <Grid min={104}>
              <Row k="expand" v={s.ui.expand} />
              <Row k="swOpen" v={s.ui.swOpen} />
              <Row k="lineFor" v={s.ui.lineFor} />
              <Row k="תאים נבחרים" v={s.ui.selCells.length} />
              <Row k="showN" v={s.ui.showN} />
              <Row k="ctxR" v={s.ui.ctxR} />
              <Row k="ציר מוסתר" v={s.ui.hideMain ? "כן" : "לא"} />
              <Row k="קריאת פסוק" v={s.ui.verseRead ? "דלוק" : "כבוי"} />
            </Grid>
          </Sect>
          <Sect title="ייחוס" note="provenance">
            <Grid>
              <Row k="editId" v={s.provenance.editId || "—"} />
              <Row k="slug" v={s.provenance.cipherSlug || "—"} />
              <Row k="מונח הצופן" v={s.provenance.cipherTerm || "—"} />
              <Row k="מחבר" v={s.provenance.author || "—"} />
              <Row k="פוסט מקושר" v={s.provenance.postTitle || s.provenance.postUrl || "—"} />
              <Row k="איכות" v={s.provenance.quality ? `${s.provenance.quality.stars}★` : "—"} />
              <Row k="דרגה" v={s.admin ? "אדמין" : s.tier} />
            </Grid>
          </Sect>
          <details style={{ ...card }}>
            <summary style={{ cursor: "pointer", color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 13, minHeight: 30 }}>
              המסר הגולמי (state)
            </summary>
            <pre dir="ltr" style={{
              marginTop: 10, overflowX: "auto", background: P.cardSoft, border: `1px solid ${P.border}`,
              borderRadius: 10, padding: 12, color: P.inkSoft, fontSize: 11.5, lineHeight: 1.6, maxHeight: 420,
            }}>{JSON.stringify(s, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}
