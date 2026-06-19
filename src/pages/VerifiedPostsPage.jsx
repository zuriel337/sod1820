import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import VerifiedBadge from "../components/VerifiedBadge.jsx";

// פוסטים מאומתים בלבד — verified=true (חוק ai_disclaimer_law).
export default function VerifiedPostsPage() {
  const P = usePalette();
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    applySeo({ title: "פוסטים מאומתים", description: "כל הפוסטים שנסרקו ואומתו על ידי AI באתר SOD1820.", path: "/verified" });
    let live = true;
    supabase.from("posts").select("wp_id,title,slug,excerpt,image_url,modified")
      .eq("verified", true).order("modified", { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => { if (live) setPosts(data || []); });
    return () => { live = false; };
  }, []);

  return (
    <div style={{ direction: "rtl", maxWidth: 1080, margin: "0 auto", padding: "48px 18px 90px", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ display: "inline-flex", marginBottom: 10 }}><VerifiedBadge variant="ai" size={18} label="AI · מאומת" /></div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0, textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
          ✓ פוסטים מאומתים
        </h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 480, margin: "12px auto 0" }}>
          פוסטים שהנתונים בהם (תאריכים ומספרים) נסרקו ואומתו על ידי בינה מלאכותית.
        </p>
      </div>

      {posts === null ? (
        <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען…</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>עדיין אין פוסטים מאומתים.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {posts.map(p => {
            const img = p.image_url;
            const title = stripHtml(p.title || "");
            return (
              <Link key={p.wp_id} to={`/${p.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", overflow: "hidden", border: `1px solid ${P.borderStrong}`, borderRadius: 14, background: P.cardGrad }}>
                <div style={{ position: "relative", aspectRatio: "16/10", background: img ? `center/cover no-repeat url(${img})` : `linear-gradient(135deg, ${P.onAccent}, ${P.cardSoft})` }}>
                  <span style={{ position: "absolute", top: 8, insetInlineStart: 8 }}><VerifiedBadge variant="ai" size={14} label="מאומת" /></span>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginTop: 6 }}>עודכן · {timeAgoHe(p.modified)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
