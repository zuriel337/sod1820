import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { getMatrixBySlug } from "../lib/elsMatrices.js";
import { getContributions } from "../lib/contributions.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";
import Discourse from "../components/Discourse.jsx";

// 🔗 עמוד קנוני יחיד לכל צופן שמור (/code/:slug) — עדשה על els_records (published).
// unified_graph_law: מקור אחד; גלריה/שיתוף מפנים לכאן, לא משכפלים. SEO+OG לכל צופן.
export default function CipherPage() {
  const { slug } = useParams();
  const P = usePalette();
  const [m, setM] = useState(undefined); // undefined=טוען · null=לא נמצא
  const [contribCount, setContribCount] = useState(0);

  useEffect(() => {
    let alive = true;
    setM(undefined); setContribCount(0);
    getMatrixBySlug(slug).then(r => { if (alive) setM(r); }).catch(() => alive && setM(null));
    getContributions("els", slug).then(list => { if (alive) setContribCount((list || []).length); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  // SEO קנוני לכל צופן (כמו EntityPage/TopicPage). לא-נמצא → noindex.
  useEffect(() => {
    if (m === undefined) return;
    if (!m) {
      const t = document.createElement("meta"); t.name = "robots"; t.content = "noindex";
      document.head.appendChild(t);
      return () => { try { document.head.removeChild(t); } catch { /* noop */ } };
    }
    const findings = Array.isArray(m.positions?.findings) ? m.positions.findings.map(f => f.t).filter(Boolean) : [];
    const scopeTxt = m.scope === "tanakh" ? "כל התנ״ך" : "התורה";
    applySeo({
      title: `הצופן «${m.title || m.search_term}» — דילוג ${m.skip_distance}`,
      description: `דילוג-האותיות (ELS) של «${m.search_term}» ב${scopeTxt}, בדילוג ${m.skip_distance}${findings.length ? ` · ${findings.slice(0, 6).join(" · ")}` : ""}. עדות — לא ניבוי · סוד 1820.`,
      path: `/codes/${encodeURIComponent(slug)}`,
      image: m.image_url || undefined,
    });
  }, [m, slug]);

  const share = async () => {
    const url = `https://sod1820.co.il/codes/${encodeURIComponent(slug)}`;
    const text = `🔠 צופן דילוג: «${m?.title || m?.search_term}» · דילוג ${m?.skip_distance} — סוד 1820`;
    try { if (navigator.share) return await navigator.share({ title: "צופן דילוג · סוד 1820", text, url }); } catch { /* noop */ }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); alert("הקישור הועתק ✓"); } catch { /* noop */ }
  };

  const wrap = { direction: "rtl", background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };

  if (m === undefined) return <div style={wrap}><div style={{ textAlign: "center", padding: 70, color: P.accentDim, fontFamily: F.body }}>טוען צופן…</div></div>;
  if (!m) return (
    <div style={wrap}><div style={{ textAlign: "center", padding: "80px 20px", color: P.inkSoft, fontFamily: F.body, lineHeight: 1.9 }}>
      <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.7 }}>🔍</div>
      הצופן לא נמצא (ייתכן שעדיין ממתין לאישור).<br />
      <Link to="/code" style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, textDecoration: "none" }}>← למנוע הצופן התנ״כי</Link>
    </div></div>
  );

  const findings = Array.isArray(m.positions?.findings) ? m.positions.findings : [];
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 14px 8px" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 3, textTransform: "uppercase" }}>דילוגי אותיות · ELS</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 800, margin: "4px 0 6px" }}>
            🔠 {m.title || m.search_term}
          </h1>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <span>דילוג <b style={{ color: P.accentText }}>{m.skip_distance}</b></span>
            <span>· {m.scope === "tanakh" ? "כל התנ״ך" : "התורה"}</span>
            {m.author_name && <span>· ✍️ {m.author_name}</span>}
          </div>
          {findings.length > 0 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              {findings.slice(0, 10).map((f, i) => (
                <span key={i} style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 10px", fontFamily: F.body, fontSize: 12 }}>{f.t}</span>
              ))}
            </div>
          )}
          {m.description && <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 620, margin: "10px auto 0" }}>{m.description}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={share} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 20px", minHeight: 40 }}>🔗 שתפו את הצופן</button>
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px" }}>🔍 חפשו צופן משלכם ←</Link>
          </div>
        </div>

        {/* 🔗 מחובר אל · 🎖️ רמת מחקר — הופך את העמוד לשער-מחקר (unified_graph_law). מינימלי, גדל עם הנתונים. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, margin: "14px 0 4px" }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 13, padding: "13px 15px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 9 }}>🎖️ רמת מחקר</div>
            <div style={{ display: "grid", gap: 6, color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.5 }}>
              <span>✓ נמצא במנוע — דילוג {m.skip_distance} ב{m.scope === "tanakh" ? "תנ״ך" : "תורה"}</span>
              <span>✓ עבר אישור ופורסם</span>
              {findings.length > 0 && <span>✓ {findings.length} ממצאים מוצלבים</span>}
              {contribCount > 0 && <span>✓ {contribCount} חידושי-קהילה</span>}
            </div>
          </div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 13, padding: "13px 15px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 9 }}>🔗 מחובר אל</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Link to={`/number/${encodeURIComponent(m.search_term)}`} style={anchorChip(P)}>🔢 גימטריה של «{m.search_term}»</Link>
              {m.primary_number ? <Link to={`/number/${m.primary_number}`} style={anchorChip(P)}>מספר {m.primary_number}</Link> : null}
              {findings.slice(0, 4).map((f, i) => (
                <Link key={i} to={`/number/${encodeURIComponent(f.t)}`} style={anchorChip(P)}>{f.t}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* הכלי טעון על הצופן הזה — המבקר רואה אותו מיד ויכול לחקור */}
      <TzofenEmbed matrix={m} />

      {/* 🔬 מחקר קהילתי — העמוד «חי»: חידושים/עדויות/הצלבות מצטברים על הצופן (research_contribution_law) */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "22px 14px 70px" }}>
        <Discourse target={{ type: "els", id: slug }} origin="els" archive={[]} />
      </div>
    </div>
  );
}
function anchorChip(P) {
  return { color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.body, fontSize: 12.5, textDecoration: "none", fontWeight: 700 };
}
