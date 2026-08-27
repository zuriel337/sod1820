// 📡 אותות-קשב (COMMAND_CENTER Pass 1C, §3) — "מה קורה באתר" / "מה קורה במחקר" / "מה כדאי לי לעשות"
// מופרדים ויזואלית (§5), כדי ש-HOT≠TRUE·POPULAR≠IMPORTANT·IMPORTANT≠CANONICAL·RECOMMENDATION≠DECISION
// לא יתמזגו לציון-אמת אחד. כל תת-חתך נגזר דטרמיניסטית מ-computeSignals (ccwork.js) מעל מה שכבר טעון
// ב-WarRoomTab — אין fetch חדש, אין engine, אין ניחוש-יחסים. §3.4/§3.7 מסומנים EXTENSION POINT NOW
// במפורש (לא בונים כאן קשר-בין-פריטים/מנוע-חשיפה-מחדש — זו לא בקשה שאפשר לממש בבטחה מ-signals קיימים
// בלי להמציא "יחס" שלא-קיים). "🌱 מה כדאי לי לעשות" נשאר אך ורק בתוך חדר-רזיאל (RazielRoom) —
// לא כאן — כדי שהסינתזה של רזיאל תישאר ויזואלית-נבדלת מהעובדות הדטרמיניסטיות בפאנל הזה (§5/§4).
import React, { useState } from "react";
import { F } from "../../theme.js";
import { computeSignals } from "../../lib/ccwork.js";

export default function AttentionSignals({ theme, items, hot, hotDays, newCutoff, onFocusValue, onMarkSeen }) {
  const T = theme || { surface2: "#fff", border: "#dbe1ea", goldBright: "#1c4bbf", goldLight: "#1b1d22", muted: "#5b6472", faint: "#8a93a3" };
  const box = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 0 };
  const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading });
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const s = computeSignals(items, { newCutoff });

  const Row = ({ id, title, subtitle, count, color, children, ext }) => (
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8 }}>
      <div onClick={ext ? undefined : () => toggle(id)} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: ext ? "default" : "pointer" }}>
        <span style={{ color: T.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>{title}</span>
        {count != null && <span style={pill(color)}>{count}</span>}
        <span style={{ color: T.faint, fontSize: 11 }}>{subtitle}</span>
        {!ext && count > 0 && <span style={{ color: T.faint, fontSize: 10.5, marginInlineStart: "auto" }}>{open[id] ? "▲" : "▼"}</span>}
        {ext && <span style={{ ...pill(T.muted), marginInlineStart: "auto" }}>EXTENSION POINT NOW</span>}
      </div>
      {!ext && open[id] && count > 0 && <div style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ color: T.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📡 אותות-קשב</span>
        <span style={{ color: T.faint, fontSize: 10.5 }}>מה קורה באתר · מה קורה במחקר — עובדות דטרמיניסטיות. «מה כדאי לי לעשות» = רק בחדר רזיאל למטה (סינתזה, לא עובדה).</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <span style={pill("#e0563a")}>HOT≠TRUE</span><span style={pill("#b08bd8")}>POPULAR≠IMPORTANT</span>
        <span style={pill("#c79a2e")}>IMPORTANT≠CANONICAL</span><span style={pill("#3ea6ff")}>RECOMMENDATION≠DECISION</span>
      </div>

      {/* 3.1 — מה קורה באתר (audience behavior, לא רזיאל) */}
      <Row id="hot" title="👀 חם אצל הקהל" count={(hot || []).length} color="#8a8a95"
        subtitle={`מבוסס צפיות בדפי מספר ב-${hotDays || "?"} הימים האחרונים — אות-קהל, לא המלצת רזיאל ולא עדיפות-מחקר`}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(hot || []).slice(0, 12).map((h) => (
            <span key={h.n} onClick={() => onFocusValue && onFocusValue(h.n)} style={{ ...pill(T.faint), cursor: "pointer" }}>{h.n} · {h.views} צפיות</span>
          ))}
        </div>
      </Row>

      {/* 3.2 — מה קורה במחקר: הריכוז העצמי שלי */}
      <Row id="focus" title="🧠 חם במחקר שלי" count={s.myFocus.topValues.length} color="#3ea6ff"
        subtitle="ערכים שסגרת-מהתור לאחרונה בעצמך — במה אתה עצמך שקוע עכשיו (לא טענת-אמת, תדירות-טיפול בלבד)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.myFocus.topValues.map((v) => (
            <span key={v.value} onClick={() => onFocusValue && onFocusValue(Number(v.value))} style={{ ...pill("#3ea6ff"), cursor: "pointer" }}>{v.value} · {v.count}×</span>
          ))}
          {!s.myFocus.topValues.length && <span style={{ color: T.faint, fontSize: 11 }}>עדיין אין מספיק היסטוריית-סגירה כדי לזהות ריכוז.</span>}
        </div>
      </Row>

      {/* 3.3 — מה חדש מהמערכת */}
      <Row id="fresh" title="🔬 חדש מהמערכת" count={s.fresh.count} color="#4caf7d" subtitle="פריטים שנכנסו מאז הביקור האחרון שלך במפקדה — מה שלא ראית עדיין">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {Object.entries(s.fresh.by_source).map(([k, n]) => <span key={k} style={pill("#4caf7d")}>{k}: {n}</span>)}
        </div>
        {onMarkSeen && <button onClick={onMarkSeen} style={{ ...pill(T.muted), cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent" }}>סמן כנראה</button>}
      </Row>

      {/* 3.4 — EXTENSION POINT: לא ממציאים "קשר" בלי מקור-יחס אמיתי */}
      <Row id="related" title="🔗 מתחבר למה שאני כבר חוקר" ext
        subtitle="דורש הצלבה דטרמיניסטית אמיתית בין פריטים-נכנסים לבין המחקר הפעיל שלך (graph relation / matching קיים) — לא נבנה בפאס הזה כדי לא להמציא יחס." />

      {/* 3.5 — דפוסים/כפילויות (reuse classifyIngest.flag==='dup' הקיים) */}
      <Row id="dup" title="♻️ דפוסים / כפילויות" count={s.duplicates.count} color="#8a8a95" subtitle="טקסט חוזר בתוך המנה הנוכחית (זיהוי-כפילות דטרמיניסטי קיים) — «נראה דומה», לא קביעת-כפילות סופית">
        <div style={{ display: "grid", gap: 4 }}>
          {s.duplicates.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90) || "(ללא טקסט)"}</div>)}
        </div>
      </Row>

      {/* 3.6 — דורש את צוריאל בפועל (candidate ממתין-שער, לא-טופל) */}
      <Row id="req" title="⚖️ דורש את צוריאל" count={s.requiresZuriel.count} color="#c79a2e" subtitle="מועמדי-מנוע (research_objects, status=candidate) שממתינים בפועל להכרעתך — לא כל פריט-חדש">
        <div style={{ display: "grid", gap: 4 }}>
          {s.requiresZuriel.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90)}</div>)}
        </div>
      </Row>

      {/* 3.7 — EXTENSION POINT: resurfacing-engine לא נבנה בפאס הזה */}
      <Row id="buried" title="💎 משהו חזק שנקבר" ext
        subtitle="דורש מנוע-חשיפה-מחדש (ראיה-חדשה/יחס-חדש/אימות-מנוע-חדש על חומר-ישן) — אין היום סימן-בטוח לכך מעבר למה שכבר מוצג ב-«מתחבר למה שאני חוקר»; לא נבנה כדי לא להמציא אות." />

      {/* 3.8 — פער/סתירה (engine_verified===false, שדה קיים) */}
      <Row id="gap" title="⚠️ פער / סתירה / צריך לבדוק" count={s.gaps.count} color="#e0563a" subtitle="מועמדים שאימות-המנוע לא-תואם (engine_verified=false) — פער לבדיקה, לא קביעה ש-false">
        <div style={{ display: "grid", gap: 4 }}>
          {s.gaps.sample.map((it) => <div key={it.key} style={{ color: T.muted, fontSize: 11.5 }}>• {(it.raw || "").slice(0, 90)}</div>)}
        </div>
      </Row>
    </div>
  );
}
