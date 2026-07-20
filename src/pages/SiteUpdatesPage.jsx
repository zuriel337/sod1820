import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { formatDateHe } from "../lib/format.js";
import { track } from "../lib/tracking.js";
import { getChannelUpdates } from "../lib/supabase.js";

// 🌳 «מה חדש באתר» — עמוד-השדרוגים הקנוני. מקור-אמת יחיד: ערוץ site-news (channel_updates).
// עץ אחד: הטיקר (WhatsNewBadge), העמוד הזה, וכל תצוגה עתידית קוראים מאותו מקור — מוסיפים
// שדרוג פעם אחת ל-site-news, ומופיע בכל מקום. אין פוסט-שדרוגים ידני מקביל.
export default function SiteUpdatesPage() {
  const P = usePalette();
  const [items, setItems] = useState(null);

  useEffect(() => {
    track("whats-new");
    applySeo({
      title: "מה חדש באתר — עדכוני ושדרוגי סוד 1820",
      description: "כל השדרוגים והפיצ׳רים החדשים של סוד 1820 במקום אחד — מתעדכן אוטומטית עם כל שיפור.",
      path: "/whats-new",
    });
  }, []);

  useEffect(() => { getChannelUpdates(60, "site-news", true).then(r => setItems(r || [])).catch(() => setItems([])); }, []);

  const list = items || [];
  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>עדכוני האתר</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, margin: "0 0 8px" }}>🌳 מה חדש באתר</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 520, margin: "0 auto" }}>
            כל השדרוגים והפיצ׳רים החדשים — במקום אחד, החדשים למעלה. מתעדכן אוטומטית עם כל שיפור.
          </p>
        </div>

        {items === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>
        ) : !list.length ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "50px 20px" }}>עדיין אין עדכונים.</div>
        ) : (
          <div style={{ position: "relative" }}>
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
                    {u.link_url && (
                      <div style={{ marginTop: 9 }}>
                        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>לצפייה ←</span>
                      </div>
                    )}
                    {u.credit && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 7 }}>✍️ {u.credit}</div>}
                  </div>
                );
                return (
                  <div key={u.id} style={{ position: "relative", paddingInlineStart: 30 }}>
                    <span style={{ position: "absolute", insetInlineStart: 3, top: 16, width: 14, height: 14, borderRadius: "50%", background: P.accent, border: `2px solid ${P.pageBg}` }} aria-hidden />
                    {u.link_url
                      ? <Link to={u.link_url} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>
                      : inner}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 26 }}>
          <Link to="/broadcasts" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none", borderBottom: `1px dotted ${P.accentDim}` }}>📡 מרכז השידורים — כל הערוצים ←</Link>
        </div>
      </div>
    </div>
  );
}
