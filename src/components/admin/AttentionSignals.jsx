// 📡 אותות-קשב (COMMAND_CENTER Pass 1C, §3 → Pass 1C-Closure §2-§7) — "מה קורה באתר" / "מה קורה
// במחקר" / "מה כדאי לי לעשות" מופרדים ויזואלית (§5), כדי ש-HOT≠TRUE·POPULAR≠IMPORTANT·
// IMPORTANT≠CANONICAL·RECOMMENDATION≠DECISION לא יתמזגו לציון-אמת אחד.
//
// Closure §2 COUNT=DRILL-DOWN LAW: כל מספר כאן מגיע כבר עם `ids` (המפתחות המלאים, לא דוגמית) מתוך
// computeSignals/reconcileNewVsAttention (ccwork.js) — הרכיב הזה **לא מחשב שום דבר בעצמו**, רק
// מציג ומעביר `ids`+`label` הלאה ל-onDrill (WarRoomTab.drillTo), שמפעיל filters.ids על אותה
// pipeline קיימת (shown/liveAf/candF/selection/BulkBar/Raziel digest) — reuse מלא, אין navigation
// מקביל. §3.4/§3.7 עדיין EXTENSION POINT NOW (לא ממציאים קשר/resurfacing).
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";

const SRCKIND_HE = { post: "📄 פוסט", comment: "💬 תגובה", channel: "📡 ערוץ", finding: "🔬 ממצא", wa: "🟢 וואטסאפ", אחר: "אחר" };

export default function AttentionSignals({ theme, signals, reconcile, hot, hotDays, onDrill, onMarkSeen }) {
  const T = theme || { surface2: "#fff", border: "#dbe1ea", goldBright: "#1c4bbf", goldLight: "#1b1d22", muted: "#5b6472", faint: "#8a93a3" };
  const box = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 0 };
  const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 800, fontFamily: F.heading, minHeight: 22 });
  const clickPill = (c) => ({ ...pill(c), cursor: "pointer", border: `1px solid ${c}` });
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  if (!signals) return null;
  const s = signals, r = reconcile || {};

  const drill = (ids, label) => { if (onDrill && ids?.length) onDrill(ids, label); };

  const Row = ({ id, title, count, ids, color, label, children, ext, sub }) => (
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: T.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>{title}</span>
        {count != null && (
          ids?.length
            ? <button onClick={() => drill(ids, label || title)} style={clickPill(color)} title="לחץ לראות בדיוק את אלה">{count}</button>
            : <span style={pill(color)}>{count}</span>
        )}
        <span style={{ color: T.faint, fontSize: 11 }}>{sub}</span>
        {!ext && count > 0 && <span onClick={() => toggle(id)} style={{ color: T.faint, fontSize: 10.5, marginInlineStart: "auto", cursor: "pointer" }}>{open[id] ? "▲ תצוגה מקדימה" : "▼ תצוגה מקדימה"}</span>}
        {ext && <span style={{ ...pill(T.muted), marginInlineStart: "auto" }}>EXTENSION POINT NOW</span>}
      </div>
      {!ext && open[id] && count > 0 && <div style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ color: T.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📡 אותות-קשב</span>
        <span style={{ color: T.faint, fontSize: 10.5 }}>כל מספר לחיץ ← מוביל בדיוק לפריטים שמרכיבים אותו. «מה כדאי לי לעשות» = רק בחדר רזיאל למטה.</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <span style={pill("#e0563a")}>HOT≠TRUE</span><span style={pill("#b08bd8")}>POPULAR≠IMPORTANT</span>
        <span style={pill("#c79a2e")}>IMPORTANT≠CANONICAL</span><span style={pill("#3ea6ff")}>RECOMMENDATION≠DECISION</span>
      </div>

      {/* 3.1 — מה קורה באתר (audience behavior, לא רזיאל). המספרים עצמם = לינקים אמיתיים ל-/number/:n */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: T.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>👀 חם אצל הקהל</span>
          <span style={{ color: T.faint, fontSize: 11 }}>מבוסס חיפושים (search_log) ב-{hotDays || "?"} הימים האחרונים — אות-קהל, לא המלצת רזיאל</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {(hot || []).slice(0, 12).map((h) => (
            <Link key={h.n} to={`/number/${h.n}`} style={{ ...pill(T.faint), textDecoration: "none", cursor: "pointer" }}>{h.n} · {h.count ?? ""}</Link>
          ))}
          {!(hot || []).length && <span style={{ color: T.faint, fontSize: 11 }}>אין נתוני-צפיות בטווח.</span>}
        </div>
      </div>

      {/* 3.2 — מה קורה במחקר: הריכוז העצמי שלי */}
      <Row id="focus" title="🧠 חם במחקר שלי" count={s.myFocus.topValues.length} color="#3ea6ff"
        sub="ערכים שסגרת-מהתור לאחרונה בעצמך — תדירות-טיפול, לא טענת-אמת">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.myFocus.topValues.map((v) => (
            <button key={v.value} onClick={() => drill(v.ids, `ערך ${v.value} — חם במחקר שלי (${v.count}×)`)} style={clickPill("#3ea6ff")}>{v.value} · {v.count}×</button>
          ))}
        </div>
      </Row>

      {/* 3.3 — מה חדש מהמערכת (כותרת+מספר-ראשי לחיצים, וכל source-chip לחיץ בנפרד) */}
      <Row id="fresh" title="🔬 חדש מהמערכת" count={s.fresh.count} ids={s.fresh.ids} color="#4caf7d"
        label={`חדש מהמערכת (${s.fresh.count})`}
        sub="פריטים שנכנסו מאז הביקור האחרון שלך — כל הצינורות (כולל תצוגה-בלבד: תגובות/וואטסאפ/פוסטים)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {Object.entries(s.fresh.by_source).map(([k, n]) => (
            <button key={k} onClick={() => drill(s.fresh.by_source_ids[k], `${SRCKIND_HE[k] || k} · ${n} מתוך "חדש מהמערכת"`)} style={clickPill("#4caf7d")}>{SRCKIND_HE[k] || k} · {n}</button>
          ))}
        </div>
        {onMarkSeen && <button onClick={onMarkSeen} style={{ ...pill(T.muted), cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent" }}>סמן כנראה</button>}
      </Row>

      {/* Closure §1/§6 — Crosswalk אמיתי: 234 (חדש) ו-195 (ממתינים) הם שני צירים אורתוגונליים
          (זמן-כניסה מול סטטוס-טיפול), לא אותו universe — לא נכפה עליהם יחס תת-קבוצה מלאכותי.
          שתי פירוקים מדויקים (חיתוך/הפרש לפי id יציב), כל מספר לחיץ. */}
      {reconcile && (
        <div style={{ borderTop: `2px solid ${T.border}`, paddingTop: 10, marginTop: 10 }}>
          <div style={{ color: T.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, marginBottom: 4 }}>
            ⚖️ למה "חדש מהמערכת" ≠ "ממתינים"? (Set Equation, לא קירוב)
          </div>
          <div style={{ color: T.faint, fontSize: 11, marginBottom: 8, lineHeight: 1.6 }}>
            «חדש» = ציר-זמן (נכנס לאחרונה, בכל הצינורות כולל תצוגה-בלבד). «ממתינים» = ציר-סטטוס (טרם-טופל, רק בתור ה-Human-Gate בפועל: ערוץ+מועמדי-מנוע). שני concepts שונים באמת — לא bug, לא נכפה שוויון.
          </div>
          <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
            <div style={{ color: T.muted }}>
              ממתינים ({r.waiting_total}) = <button onClick={() => drill(r.fresh_in_queue_open?.ids, `ממתינים · חדשים-ופתוחים (${r.fresh_in_queue_open?.count ?? 0})`)} style={clickPill("#4caf7d")}>חדשים-ופתוחים {r.fresh_in_queue_open?.count ?? 0}</button>
              {" + "}
              <button onClick={() => drill(r.waiting_not_fresh?.ids, `ממתינים · ותיקים, לא-חדשים (${r.waiting_not_fresh?.count ?? 0})`)} style={clickPill("#c79a2e")}>ותיקים (לא-חדשים) {r.waiting_not_fresh?.count ?? 0}</button>
            </div>
            <div style={{ color: T.muted }}>
              חדש מהמערכת ({r.fresh_total}) = <button onClick={() => drill(r.fresh_in_queue?.ids, `חדש · בתור-הקשב (${r.fresh_in_queue?.count ?? 0})`)} style={clickPill("#3ea6ff")}>בתור-הקשב {r.fresh_in_queue?.count ?? 0}</button>
              {" + "}
              <button onClick={() => drill(r.fresh_outside_queue?.ids, `חדש · מחוץ לתור-הקשב — תצוגה-בלבד (${r.fresh_outside_queue?.count ?? 0})`)} style={clickPill(T.muted)}>מחוץ-לתור-הקשב (תצוגה-בלבד) {r.fresh_outside_queue?.count ?? 0}</button>
            </div>
            <div style={{ color: T.faint, fontSize: 11 }}>
              מתוך "בתור-הקשב": <button onClick={() => drill(r.fresh_in_queue_open?.ids, `חדש-ופתוח (${r.fresh_in_queue_open?.count ?? 0})`)} style={clickPill("#4caf7d")}>פתוח {r.fresh_in_queue_open?.count ?? 0}</button>
              {" · "}
              <button onClick={() => drill(r.fresh_in_queue_handled?.ids, `חדש אך כבר-טופל (${r.fresh_in_queue_handled?.count ?? 0})`)} style={clickPill("#8a8a95")}>כבר-טופל {r.fresh_in_queue_handled?.count ?? 0}</button>
            </div>
          </div>
        </div>
      )}

      {/* 3.4 — EXTENSION POINT: לא ממציאים "קשר" בלי מקור-יחס אמיתי */}
      <Row id="related" title="🔗 מתחבר למה שאני כבר חוקר" ext
        sub="דורש הצלבה דטרמיניסטית אמיתית בין פריטים-נכנסים לבין המחקר הפעיל שלך (graph relation / matching קיים) — לא נבנה בפאס הזה כדי לא להמציא יחס." />

      {/* 3.5 — דפוסים/כפילויות */}
      <Row id="dup" title="♻️ דפוסים / כפילויות" count={s.duplicates.count} ids={s.duplicates.ids} color="#8a8a95"
        label={`כפילויות (${s.duplicates.count})`} sub="טקסט חוזר בתוך המנה הנוכחית — «נראה דומה», לא קביעת-כפילות סופית">
        <div style={{ display: "grid", gap: 4 }}>
          {s.duplicates.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90) || "(ללא טקסט)"}</div>)}
        </div>
      </Row>

      {/* 3.6 — דורש את צוריאל בפועל */}
      <Row id="req" title="⚖️ דורש את צוריאל" count={s.requiresZuriel.count} ids={s.requiresZuriel.ids} color="#c79a2e"
        label={`דורש את צוריאל (${s.requiresZuriel.count})`} sub="מועמדי-מנוע (research_objects, status=candidate) שממתינים בפועל להכרעתך">
        <div style={{ display: "grid", gap: 4 }}>
          {s.requiresZuriel.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90)}</div>)}
        </div>
      </Row>

      {/* 3.7 — EXTENSION POINT: resurfacing-engine לא נבנה בפאס הזה */}
      <Row id="buried" title="💎 משהו חזק שנקבר" ext
        sub="דורש מנוע-חשיפה-מחדש (ראיה-חדשה/יחס-חדש/אימות-מנוע-חדש על חומר-ישן) — לא נבנה כדי לא להמציא אות." />

      {/* 3.8 — פער/סתירה */}
      <Row id="gap" title="⚠️ פער / סתירה / צריך לבדוק" count={s.gaps.count} ids={s.gaps.ids} color="#e0563a"
        label={`פער-מנוע (${s.gaps.count})`} sub="מועמדים שאימות-המנוע לא-תואם (engine_verified=false) — פער לבדיקה, לא קביעה ש-false">
        <div style={{ display: "grid", gap: 4 }}>
          {s.gaps.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90)}</div>)}
        </div>
      </Row>
    </div>
  );
}
