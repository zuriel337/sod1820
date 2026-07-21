import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { formatDateHe } from "../lib/format.js";
import { getChannelUpdates } from "../lib/supabase.js";

// 🛠️ <SiteUpdatesFeed> — פיד «מה חדש באתר» המשותף (עץ אחד): ציר-הזמן של שדרוגי-הפיתוח.
// מקור-אמת יחיד: ערוץ site-news (channel_updates). מרונדר בשני שערים זהים — דף /whats-new
// (SiteUpdatesPage, עם ההירו סביבו) וטאב «פיתוח האתר» במרכז השידורים. אותו הדבר בשני המקומות.
export default function SiteUpdatesFeed({ limit = 60 }) {
  const P = usePalette();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let live = true;
    getChannelUpdates(limit, "site-news", true).then(r => { if (live) setItems(r || []); }).catch(() => live && setItems([]));
    return () => { live = false; };
  }, [limit]);

  const list = items || [];
  if (items === null) return <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>;
  if (!list.length) return <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "50px 20px" }}>עדיין אין עדכונים.</div>;

  return (
    <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
      {/* קו-ציר אנכי */}
      <div style={{ position: "absolute", insetInlineStart: 9, top: 6, bottom: 6, width: 2, background: P.border }} aria-hidden />
      <div style={{ display: "grid", gap: 16 }}>
        {list.map(u => {
          const nl = (u.text || "").indexOf("\n");
          const title = nl > -1 ? u.text.slice(0, nl) : (u.text || "");
          const body = nl > -1 ? u.text.slice(nl + 1).trim() : "";
          const inner = (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: body ? 6 : 0 }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, flex: 1, minWidth: 0 }}>{title}</div>
                {u.created_at && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, whiteSpace: "nowrap" }}>{formatDateHe(u.created_at)}</span>}
              </div>
              {body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{body}</div>}
              {u.link_url && <div style={{ marginTop: 9 }}><span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>לצפייה ←</span></div>}
              {u.credit && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 7 }}>✍️ {u.credit}</div>}
            </div>
          );
          return (
            <div key={u.id} style={{ position: "relative", paddingInlineStart: 30 }}>
              <span style={{ position: "absolute", insetInlineStart: 3, top: 16, width: 14, height: 14, borderRadius: "50%", background: P.accent, border: `2px solid ${P.pageBg}` }} aria-hidden />
              {u.link_url ? <Link to={u.link_url} style={{ textDecoration: "none", display: "block" }}>{inner}</Link> : inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
