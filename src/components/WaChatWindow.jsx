import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode } from "../lib/themeMode.js";
import { genAvatar, writerColor } from "../lib/avatar.js";
import { moderateContribution } from "../lib/contributions.js";

// 💬 חלון-צ'אט בסגנון וואטסאפ לממצאי-הכתב. נגלל (החומר הגולמי לא מציף את הדף), ממותג-וואטסאפ,
// וצבע-זהות לכל כתב (writerColor — תואם לאווטאר). isAdmin → כפתור «קדם לפורום» בבועה (published→approved).
// items = research_contributions של הכתב (getResearcherProfile). רכיב קנוני — משמש גם בדף וגם בתיבה המרוכזת.
export default function WaChatWindow({ name, items = [], isAdmin = false, height = 460, onChange }) {
  const P = usePalette();
  const dark = useThemeMode() !== "light";
  const col = writerColor(name);
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(null);
  useEffect(() => { setRows(items); }, [items]);
  if (!rows.length) return null;

  const bubbleBg = dark ? col.bubbleDark : col.bubbleLight;
  const bubbleInk = dark ? col.inkDark : col.inkLight;
  const href = (it) => it.target_type === "number" ? `/number/${it.target_id}` : it.target_type === "topic" ? `/topic/${it.target_id}` : null;
  const promote = async (id) => {
    setBusy(id);
    try { await moderateContribution(id, "approved"); setRows(l => l.map(x => x.id === id ? { ...x, status: "approved" } : x)); onChange?.(); }
    catch { /* נשאר גולמי */ }
    setBusy(null);
  };

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${P.border}`, boxShadow: `0 6px 22px ${P.glow}` }}>
      {/* כותרת-צ'אט — בצבע הכתב */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: col.accent }}>
        <img src={genAvatar(name)} alt="" style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid rgba(255,255,255,.5)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ color: "rgba(255,255,255,.85)", fontFamily: F.heading, fontSize: 11 }}>{rows.length} ממצאים · וואטסאפ</div>
        </div>
        <span style={{ fontSize: 20 }} title="וואטסאפ">💬</span>
      </div>

      {/* גוף נגלל — רקע-וואטסאפ */}
      <div style={{
        maxHeight: height, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "14px 12px",
        background: dark ? "#0b141a" : "#e7ded4",
        backgroundImage: `radial-gradient(${dark ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.04)"} 1px, transparent 1px)`,
        backgroundSize: "18px 18px",
        display: "flex", flexDirection: "column", gap: 9,
      }}>
        {rows.map(it => {
          const to = href(it);
          const inForum = it.status === "approved";
          return (
            <div key={it.id} style={{ alignSelf: "flex-end", maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ background: bubbleBg, color: bubbleInk, borderRadius: "14px 14px 3px 14px", padding: "8px 11px", boxShadow: "0 1px 1px rgba(0,0,0,.18)", width: "fit-content" }}>
                {it.title && <div style={{ fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: it.body ? 3 : 0 }}>{it.title}</div>}
                {it.body && <div style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{it.body.length > 320 ? it.body.slice(0, 320) + "…" : it.body}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end", marginTop: 4, fontSize: 10, opacity: 0.75 }}>
                  {to && <Link to={to} style={{ color: "inherit", textDecoration: "underline" }}>לצפייה</Link>}
                  <span>{String(it.created_at).slice(0, 10)}</span>
                  {inForum && <span title="בפורום">✓✓</span>}
                </div>
              </div>
              {isAdmin && !inForum && (
                <button onClick={() => promote(it.id)} disabled={busy === it.id}
                  style={{ cursor: "pointer", marginTop: 3, border: `1px solid ${P.border}`, background: P.card, color: "#1c7a38", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "3px 10px", minHeight: 28 }}>
                  {busy === it.id ? "…" : "⬆️ קדם לפורום"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
