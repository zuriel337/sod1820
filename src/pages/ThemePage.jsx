import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { supabase } from "../lib/supabase.js";

// ===== עמוד-נושא — עדשה אחת חוצה-תוכן על נושא אחד (theme_links) =====
// unified_graph_law: נושא = node אחד, מחובר לכל ישות מכל סוג. כאן מציגים אותן מקובצות.
// מקור: public.theme_links (theme_slug → post/els/number/spatial_model/image).

const KINDS = [
  { key: "post",          icon: "📄", title: "פוסטים" },
  { key: "els",           icon: "🔠", title: "צפני ELS" },
  { key: "spatial_model", icon: "🧊", title: "מודלים מרחביים" },
  { key: "number",        icon: "🔢", title: "מספרים" },
  { key: "image",         icon: "🖼️", title: "תמונות" },
];

const decodeHtml = (s) => { if (!s) return ""; const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

export default function ThemePage() {
  const { slug } = useParams();
  const theme = decodeURIComponent(slug || "");
  const P = usePalette();
  const [items, setItems] = useState(null);

  useEffect(() => {
    track("theme", theme);
    applySeo({
      title: `נושא: ${theme} — כל הצפנים, הפוסטים והמספרים · סוד 1820`,
      description: `עדשה אחת על נושא «${theme}»: פוסטים, צפני אותיות (ELS), מספרים ומודלים מרחביים — כולם מחוברים בעץ אחד.`,
      path: `/theme/${encodeURIComponent(theme)}`,
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent(theme) + "&sub=" + encodeURIComponent("נושא · סוד 1820") + "&cap=" + encodeURIComponent("פוסטים · צפנים · מספרים · מודלים"),
    });
  }, [theme]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    supabase.from("theme_links").select("kind,ref_id,ref_label,ref_url")
      .eq("theme_slug", theme).order("kind")
      .then(({ data }) => { if (alive) setItems(data || []); });
    return () => { alive = false; };
  }, [theme]);

  const byKind = (k) => (items || []).filter(i => i.kind === k);
  const total = (items || []).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 16px 60px", direction: "rtl" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.18em", color: P.accentDim, textTransform: "uppercase" }}>נושא</div>
        <h1 style={{ fontFamily: F.royal, fontWeight: 800, fontSize: "clamp(30px,6.5vw,48px)", color: P.ink, margin: "6px 0 4px" }}>{theme}</h1>
        <p style={{ fontFamily: F.body, fontSize: 15, color: P.inkSoft, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
          עדשה אחת על כל מה שמחובר לנושא — פוסטים, צפנים, מספרים ומודלים. עץ אחד, מבט אחד.
        </p>
      </div>

      {items === null ? (
        <div style={{ textAlign: "center", color: P.muted, fontFamily: F.body, padding: 40 }}>טוען…</div>
      ) : total === 0 ? (
        <div style={{ textAlign: "center", color: P.muted, fontFamily: F.body, padding: 40 }}>אין עדיין תוכן מקושר לנושא «{theme}».</div>
      ) : (
        KINDS.map(k => {
          const list = byKind(k.key);
          if (!list.length) return null;
          return (
            <section key={k.key} style={{ marginTop: 22 }}>
              <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 16, color: P.accentText, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{k.icon}</span><span>{k.title}</span>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: P.accentDim }}>({list.length})</span>
                <span style={{ flex: 1, height: 1, background: P.border, marginInlineStart: 4 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map((it, i) => (
                  <Link key={i} to={it.ref_url || "#"} style={{
                    textDecoration: "none", display: "block", fontFamily: F.body, fontSize: 14.5, color: P.ink,
                    background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 15px", lineHeight: 1.5,
                  }}>
                    {decodeHtml(it.ref_label) || it.ref_url}
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}

      <p style={{ fontFamily: F.body, fontSize: 12.5, color: P.accentDim, textAlign: "center", marginTop: 30, lineHeight: 1.7 }}>
        {total > 0 && <>{total} פריטים מחוברים לנושא «{theme}». </>}
        עץ אחד — כל נושא הוא עדשה על אותו גרף.
      </p>
    </div>
  );
}
