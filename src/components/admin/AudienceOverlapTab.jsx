import React, { useEffect, useState } from "react";
import { C, F } from "../../theme.js";
import { supabase } from "../../lib/supabase.js";

// 🫂 מיפוי-קהל — «מימד חמש» מול «אור הגאולה»: כמה אנשים לחצו על כל אחד מכל האתר,
//    וכמה חופפים (אותם אנשים). מבוסס visitor_id ב-visitor_events (אנונימי, לא PII).
//    RPC אדמין-בלבד audience_overlap_report(days). מעקב מימד-חמש נוסף 13.8.2026 → מתמלא מעכשיו.
const WINDOWS = [3, 7, 14, 30];
const IND = "#8458ff";     // מימד חמש
const OG = "#e0556a";      // אור הגאולה

export default function AudienceOverlapTab() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    supabase.rpc("audience_overlap_report", { p_days: days })
      .then(({ data, error }) => { if (!alive) return; if (error) setErr(error.message); else setData(data); })
      .catch(e => { if (alive) setErr(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const d = data || {};
  const dim5 = d.dim5 || 0, og = d.orgeula || 0, both = d.both || 0;
  const onlyD = d.only_dim5 || 0, onlyO = d.only_orgeula || 0;
  const totalPeople = onlyD + onlyO + both;
  const pct = (n) => totalPeople ? Math.round((n / totalPeople) * 100) : 0;

  const Stat = ({ label, val, sub, color }) => (
    <div style={{ flex: "1 1 150px", background: C.card, border: `1px solid ${color || C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ color: color || C.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#fff", fontFamily: F.heading, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ color: C.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ direction: "rtl", padding: "4px 2px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ color: C.accentText, fontFamily: F.heading, fontSize: 20, fontWeight: 900, margin: 0 }}>🫂 מיפוי-קהל · מימד חמש מול אור הגאולה</h2>
        <div style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}>
          {WINDOWS.map(w => (
            <button key={w} onClick={() => setDays(w)} style={{
              padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: F.heading, fontWeight: 800, fontSize: 12,
              border: `1px solid ${days === w ? C.borderGold : C.border}`, background: days === w ? C.borderGold : "transparent",
              color: days === w ? "#1a1206" : C.inkSoft }}>{w} ימים</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: C.inkSoft, fontFamily: F.body, padding: 20 }}>טוען…</div>}
      {err && <div style={{ color: "#e0556a", fontFamily: F.body, padding: 14, border: "1px solid #e0556a55", borderRadius: 10 }}>שגיאה: {err}</div>}

      {!loading && !err && (
        <>
          {/* ואן-דיאגרם פשוט */}
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 22px" }}>
            <svg viewBox="0 0 420 220" style={{ width: "100%", maxWidth: 460 }} role="img" aria-label="חפיפת קהלים">
              <circle cx="160" cy="110" r="95" fill={`${IND}33`} stroke={IND} strokeWidth="2" />
              <circle cx="260" cy="110" r="95" fill={`${OG}33`} stroke={OG} strokeWidth="2" />
              <text x="95" y="112" fill={IND} fontFamily="sans-serif" fontWeight="900" fontSize="30" textAnchor="middle">{onlyD}</text>
              <text x="95" y="140" fill="#cbb9ff" fontFamily="sans-serif" fontSize="12" textAnchor="middle">רק מימד חמש</text>
              <text x="210" y="108" fill="#fff" fontFamily="sans-serif" fontWeight="900" fontSize="26" textAnchor="middle">{both}</text>
              <text x="210" y="132" fill="#f0d7dc" fontFamily="sans-serif" fontSize="11" textAnchor="middle">שניהם</text>
              <text x="325" y="112" fill={OG} fontFamily="sans-serif" fontWeight="900" fontSize="30" textAnchor="middle">{onlyO}</text>
              <text x="325" y="140" fill="#f5c2ca" fontFamily="sans-serif" fontSize="12" textAnchor="middle">רק אור הגאולה</text>
            </svg>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Stat label="🌀 מימד חמש — אנשים" val={dim5} sub={`${d.dim5_clicks || 0} קליקים · ${pct(dim5)}% מהקהל`} color={IND} />
            <Stat label="🎬 אור הגאולה — אנשים" val={og} sub={`${d.orgeula_views || 0} צפיות · ${pct(og)}% מהקהל`} color={OG} />
            <Stat label="🤝 חפיפה — לחצו על שניהם" val={both} sub={dim5 ? `${Math.round((both / dim5) * 100)}% ממימד-חמש` : "—"} color="#f6c453" />
            <Stat label="👥 סה״כ אנשים ייחודיים" val={totalPeople} sub={`חלון ${days} ימים`} color={C.border} />
          </div>

          {/* פילוח קליקי מימד-חמש לפי מקור (בית / ענן / פוטר) */}
          {d.dim5_by_surface && Object.keys(d.dim5_by_surface).length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${IND}55`, borderRadius: 12, padding: "13px 16px", marginBottom: 14 }}>
              <div style={{ color: IND, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 10 }}>🌀 קליקי מימד חמש לפי מקור</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(d.dim5_by_surface)
                  .sort((a, b) => b[1] - a[1])
                  .map(([surface, cnt]) => {
                    const label = { "home-rail": "🏠 שורת דף הבית", "cloud": "☁️ ענן מעופף", "footer": "📎 סרגל פוטר" }[surface] || surface;
                    return (
                      <div key={surface} style={{ flex: "1 1 130px", background: `${IND}14`, border: `1px solid ${IND}44`, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ color: "#fff", fontFamily: F.heading, fontSize: 22, fontWeight: 900 }}>{cnt}</div>
                        <div style={{ color: C.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 3 }}>{label}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", color: C.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
            <b style={{ color: C.accentText }}>איך לקרוא:</b> «אנשים» = מבקרים שונים (visitor_id אנונימי) שלחצו, מכל מקום באתר.
            {" "}מעקב <b>מימד חמש</b> נוסף ב-13.8.2026 — לכן המספר שלו מתחיל מ-0 ומתמלא מעכשיו (אין נתונים היסטוריים).
            {" "}<b>אור הגאולה</b> נמדד לפי פתיחת-סטורי בכל המשטחים. חפיפה נמוכה = «שתי סוגי אנשים»; חפיפה גבוהה = אותו קהל.
          </div>
        </>
      )}
    </div>
  );
}
