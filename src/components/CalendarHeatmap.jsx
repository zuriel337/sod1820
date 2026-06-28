import React, { useMemo } from "react";
import { C, F } from "../theme.js";
import { computeCalendar, heatAlpha } from "../lib/heatmap.js";
import { effDate } from "../lib/reality.js";

// ===== מפת חום קלנדרית (סגנון GitHub contributions) =====
// עדשה על כל אוסף פריטים בעלי תאריך — מראה מתי האתר "בוער".
// items: רמזים/פוסטים/אירועים. dateOf: accessor לתאריך (ברירת מחדל effDate של רמז).
// כל תא = יום; עוצמת הזהב = כמות באותו יום. RTL: זמן זורם ימין→שמאל (חדש משמאל).

const HE_MONTHS = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
const HE_DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export default function CalendarHeatmap({ items = [], dateOf = effDate, days = 364, cell = 12, gap = 3, title = "🔥 מפת חום — פעילות לאורך זמן" }) {
  const { weeks, max, total } = useMemo(
    () => computeCalendar(items, { days, dateOf }),
    [items, dateOf, days]
  );

  // תוויות חודש: מציגים שם חודש מעל השבוע שבו מתחיל חודש חדש.
  const monthCols = useMemo(() => {
    const out = [];
    let last = -1;
    weeks.forEach((w, i) => {
      const firstReal = w.find(c => c.count != null);
      if (!firstReal) return;
      const m = new Date(firstReal.t).getMonth();
      if (m !== last) { out.push({ i, label: HE_MONTHS[m] }); last = m; }
    });
    return out;
  }, [weeks]);

  if (!weeks.length) return null;

  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{total} פריטים · שיא יומי {max}</span>
      </div>

      {/* הרשת — direction:ltr פנימי כדי שהשבועות יישבו בעמודות יציבות; הקופסה כולה RTL */}
      <div style={{ overflowX: "auto", direction: "ltr", paddingBottom: 4 }}>
        <div style={{ display: "inline-block" }}>
          {/* תוויות חודש */}
          <div style={{ display: "flex", gap, marginBottom: 4, marginRight: 22 }}>
            {weeks.map((_, i) => {
              const m = monthCols.find(mc => mc.i === i);
              return (
                <div key={i} style={{ width: cell, fontSize: 9.5, color: C.goldDim, fontFamily: F.heading, textAlign: "left" }}>
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap }}>
            {/* תוויות ימים (ראשון/שלישי/חמישי) */}
            <div style={{ display: "grid", gridTemplateRows: `repeat(7, ${cell}px)`, gap, marginLeft: 4, width: 16 }}>
              {HE_DOW.map((d, i) => (
                <div key={i} style={{ fontSize: 8.5, color: C.goldDim, fontFamily: F.heading, lineHeight: `${cell}px`, textAlign: "center" }}>
                  {i % 2 === 0 ? d : ""}
                </div>
              ))}
            </div>

            {/* עמודות שבועות */}
            {weeks.map((w, wi) => (
              <div key={wi} style={{ display: "grid", gridTemplateRows: `repeat(7, ${cell}px)`, gap }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const c = w[di];
                  if (!c || c.count == null) return <div key={di} style={{ width: cell, height: cell }} />;
                  const d = new Date(c.t);
                  const titleTxt = `${d.toLocaleDateString("he-IL", { day: "numeric", month: "long" })} · ${c.count} פריטים`;
                  return (
                    <div key={di} title={titleTxt} style={{
                      width: cell, height: cell, borderRadius: 3,
                      background: heatAlpha(c.intensity),
                      border: c.count ? "1px solid rgba(212,175,55,0.25)" : `1px solid ${C.border}`,
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* מקרא */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end", direction: "ltr" }}>
        <span style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading }}>פחות</span>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <div key={t} style={{ width: 11, height: 11, borderRadius: 3, background: heatAlpha(t), border: `1px solid ${C.border}` }} />
        ))}
        <span style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading }}>יותר</span>
      </div>
    </div>
  );
}
