import React, { useState, useCallback } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";
import { enSearch } from "../lib/supabase.js";

// 🔎 English Discovery — שער-הכניסה למנוע-הגילויים החוצה-שפתי (research_workspace_law).
// לא "עוד תיבת חיפוש": מילה לועזית → fn_en_search → מסננים בנדירות → מציגים רק זהב קודם
// (Progressive Disclosure), ואז "פתח את כל הגילויים". מחובר = שומר למחקר; אנונימי = CTA להצטרפות.
// המנוע המלא (8 שיטות · כל ההתכנסויות) חי ב-RPC; החזית מגישה אותו בשכבות בלי עומס.

const SIGNAL = {
  gold:   { label: "נדיר · זהב",  chip: "💎", c: "#b8901f", bg: "rgba(196,154,46,0.14)", bd: "rgba(196,154,46,0.5)" },
  strong: { label: "אות",         chip: "✦",  c: "#2f6df6", bg: "rgba(47,109,246,0.10)", bd: "rgba(47,109,246,0.35)" },
  weak:   { label: "שכיח",        chip: "·",  c: "#8a93a3", bg: "rgba(120,130,150,0.08)", bd: "rgba(120,130,150,0.25)" },
};

function DiscoveryCard({ row, P, user, onExplore }) {
  const { addToResearch, saveItem } = useResearch();
  const s = SIGNAL[row.signal] || SIGNAL.weak;
  const matches = row.matches || [];
  const entity = {
    id: `en-disc-${row.value}-${row.method}`,
    type: "convergence",
    title: `${row.value} · ${row.method} — ${row.input_hebrew}`,
    value: row.value, method: row.method, matches,
  };
  return (
    <div style={{ background: P.card, border: `1px solid ${s.bd}`, borderRadius: 13, padding: "12px 14px", display: "grid", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: s.c, background: s.bg, fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 10px" }}>{s.chip} {s.label}</span>
        <a href={`/number/${row.value}`} style={{ color: P.accentText, fontFamily: F.mono, fontSize: 20, fontWeight: 900, textDecoration: "none" }}>{row.value}</a>
        <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{row.method}</span>
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginInlineStart: "auto" }}>נדירות {row.rarity}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {matches.map((m, i) => (
          <span key={i} style={{ color: P.ink, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 8, padding: "3px 9px", fontFamily: F.regal, fontSize: 13.5, fontWeight: 600 }}>{m}</span>
        ))}
      </div>
      {user ? (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={() => addToResearch?.(entity)} style={miniBtn(P, true)}>➕ הוסף למחקר</button>
          <button onClick={() => saveItem?.(entity)} style={miniBtn(P)}>⭐ שמור</button>
          <button onClick={() => onExplore(row.value)} style={miniBtn(P)}>🔗 המשך חקירה</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => onExplore(row.value)} style={miniBtn(P)}>👁 צפייה בגילוי</button>
          <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>הצטרפו כדי לשמור →</span>
        </div>
      )}
    </div>
  );
}
function miniBtn(P, primary) {
  return { cursor: "pointer", borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "6px 13px", minHeight: 34,
    border: primary ? "none" : `1px solid ${P.border}`, background: primary ? P.accentBtn : "none", color: primary ? P.onAccent : P.accentDim };
}

export default function EnglishDiscovery() {
  const P = usePalette();
  const { user } = useAuth();
  const [word, setWord] = useState("");
  const [rows, setRows] = useState(null);   // null=טרם חיפש, []=אין
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [asked, setAsked] = useState("");

  const run = useCallback(async (e) => {
    e?.preventDefault?.();
    const q = word.trim();
    if (!q) return;
    setBusy(true); setShowAll(false); setAsked(q);
    try {
      const data = await enSearch(q);
      setRows(data);
      emit(EVENTS.SEARCH_GEMATRIA, { q, source: "english-discovery", hits: data.length });
    } catch { setRows([]); }
    finally { setBusy(false); }
  }, [word]);

  const onExplore = (value) => { window.location.href = `/number/${value}`; };

  const gold = (rows || []).filter(r => r.signal === "gold");
  const strong = (rows || []).filter(r => r.signal === "strong");
  const weak = (rows || []).filter(r => r.signal === "weak");
  const rareCount = gold.length + strong.length;
  // שלב ראשון: כל הזהב + עד 2 "אות". "פתח הכל" → הכל.
  const preview = [...gold, ...strong.slice(0, 2)];
  const rest = [...strong.slice(2), ...weak];
  const shown = showAll ? [...gold, ...strong, ...weak] : preview;

  const inp = { width: "100%", boxSizing: "border-box", padding: "13px 15px", borderRadius: 12, background: P.cardSoft, border: `1.5px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" };

  return (
    <div style={{ background: P.surface, border: `1.5px solid ${P.borderStrong}`, borderRadius: 18, padding: "20px 18px", marginBottom: 26 }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>🔎 מנוע הגילויים — כל שפה</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, maxWidth: 460, margin: "6px auto 0" }}>
          כתבו מילה באנגלית (או עברית). המנוע פורש אותה על כל השיטות ומציג רק את <b style={{ color: P.accentText }}>ההתכנסויות הנדירות</b> — הזהב, בלי הרעש.
        </div>
      </div>

      <form onSubmit={run} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <input value={word} onChange={e => setWord(e.target.value)} placeholder="dream · pilot · love · שלום" style={{ ...inp, flex: "1 1 200px" }} dir="auto" />
        <button type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 12, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "0 22px", minHeight: 48 }}>
          {busy ? "סורק…" : "גלה"}
        </button>
      </form>

      {rows && !busy && (
        rows.length === 0 ? (
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, textAlign: "center", padding: "16px 0" }}>
            לא נמצאו התכנסויות ל־«{asked}».{!/[א-ת]/.test(asked) && " ייתכן שהמילה עוד לא במילון-התעתוק — אפשר להוסיף אותה למטה כקשר-שפה 👇"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, textAlign: "center" }}>
              💎 נמצאו {rareCount || rows.length} התכנסויות {rareCount ? "נדירות" : ""} ל־«{asked}»
            </div>
            {shown.map((r, i) => <DiscoveryCard key={i} row={r} P={P} user={user} onExplore={onExplore} />)}

            {!showAll && rest.length > 0 && (
              <button onClick={() => setShowAll(true)} style={{ cursor: "pointer", background: "none", border: `1px dashed ${P.border}`, color: P.accentText, borderRadius: 12, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, padding: "11px", minHeight: 44 }}>
                פתח את כל הגילויים ({rest.length}) ▾
              </button>
            )}

            {/* אנונימי — שער-כניסה לקהילה (הפיכת חיפוש להצטרפות) */}
            {!user && (
              <div style={{ background: P.glow, border: `1px solid ${P.border}`, borderRadius: 13, padding: "14px 15px", textAlign: "center", display: "grid", gap: 8 }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15, fontWeight: 800 }}>רוצים לשמור את הגילויים ולהיות חלק מהקהילה?</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>הצטרפו — שמרו התכנסויות למחקר האישי שלכם, צרו קשרים, והמשיכו לחקור מכל מכשיר.</div>
                <a href="/auth" style={{ justifySelf: "center", background: P.accentBtn, color: P.onAccent, textDecoration: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "10px 24px" }}>הצטרפו לקהילה →</a>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
