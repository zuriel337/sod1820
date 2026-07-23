import React, { useEffect, useState } from "react";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getContributorsFeed, getResearcherProfile } from "../lib/contributions.js";
import { genAvatar, writerColor } from "../lib/avatar.js";
import { formatDateHe } from "../lib/format.js";
import WaChatWindow from "../components/WaChatWindow.jsx";

// 📱 תיבת הוואטסאפ — כל ממצאי הכתבים במקום אחד, בסגנון וואטסאפ מלא: רשימת-צ'אטים (כתב = שורה
// עם אווטאר+צבע+מונה) + חלון-שיחה. מקור אחד: contributors_feed (רשימה) + getResearcherProfile (שיחה).
// רספונסיבי: דסקטופ = שתי עמודות; מובייל = רשימה, לחיצה פותחת שיחה עם «חזרה». קידום-לפורום = אדמין.
export default function WaInboxPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false); // מובייל: מציג שיחה

  useEffect(() => { track("wa-inbox"); applySeo({ title: "תיבת הוואטסאפ — ממצאי הכתבים · סוד 1820", description: "כל ממצאי הכתבים מהוואטסאפ במקום אחד — חלון-צ'אט לכל כתב.", path: "/community/whatsapp" }); }, []);
  useEffect(() => { getContributorsFeed(40).then(r => { const w = (r || []).filter(x => x.findings > 0); setList(w); if (w.length) setSel(w[0].display_name); }).catch(() => setList([])); }, []);
  useEffect(() => { if (!sel) { setItems(null); return; } let a = true; setItems(null); getResearcherProfile(sel, 100).then(r => { if (a) setItems(r?.items || []); }).catch(() => a && setItems([])); return () => { a = false; }; }, [sel]);

  const pick = (name) => { setSel(name); setOpen(true); };

  return (
    <div dir="rtl" style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px 80px", position: "relative", zIndex: 1 }}>
      <style>{`
        .wainbox { display:grid; grid-template-columns: minmax(0,320px) 1fr; gap:14px; align-items:start; }
        .wainbox-back { display:none !important; }
        @media (max-width:760px){
          .wainbox { grid-template-columns: 1fr; }
          .wainbox[data-open="1"] .wainbox-list { display:none; }
          .wainbox[data-open="0"] .wainbox-conv { display:none; }
          .wainbox[data-open="1"] .wainbox-back { display:inline-block !important; }
        }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,36px)", fontWeight: 800, margin: "0 0 6px" }}>📱 תיבת הוואטסאפ</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>כל ממצאי הכתבים מהוואטסאפ — כל כתב בצבע ובחלון משלו. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b></p>
      </div>

      {list === null ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 50 }}>טוען…</div>
      ) : !list.length ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 50 }}>אין עדיין ממצאי-וואטסאפ.</div>
      ) : (
        <div className="wainbox" data-open={open ? "1" : "0"}>
          {/* רשימת-הצ'אטים */}
          <div className="wainbox-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map(w => {
              const c = writerColor(w.display_name);
              const on = sel === w.display_name;
              return (
                <button key={w.slug} onClick={() => pick(w.display_name)}
                  style={{ cursor: "pointer", textAlign: "start", display: "flex", alignItems: "center", gap: 11, background: on ? P.glow : P.card, border: `1px solid ${on ? c.accent : P.border}`, borderRadius: 14, padding: "10px 12px" }}>
                  <img src={genAvatar(w.display_name)} alt="" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, borderInlineStart: `3px solid ${c.accent}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.display_name}</div>
                    <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>💬 {w.findings} · 🕐 {formatDateHe(w.last_activity)}</div>
                  </div>
                  <span style={{ background: c.accent, color: "#fff", borderRadius: 999, minWidth: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "0 6px", flexShrink: 0 }}>{w.findings}</span>
                </button>
              );
            })}
          </div>

          {/* חלון-השיחה */}
          <div className="wainbox-conv">
            <button onClick={() => setOpen(false)} className="wainbox-back" style={{ cursor: "pointer", background: "transparent", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 8, padding: 0 }}>← לרשימת הכתבים</button>
            {sel && (
              items === null
                ? <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>טוען שיחה…</div>
                : <WaChatWindow name={sel} items={items} isAdmin={isAdmin} height={560} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
