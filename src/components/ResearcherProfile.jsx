import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { formatDateHe } from "../lib/format.js";
import { supabase } from "../lib/supabase.js";
import { getResearcherProfile } from "../lib/contributions.js";

// 👤 פרופיל-חוקר קל — לחוקר רשום שאין לו שורת-contributor אצורה (identity_architecture_law).
// עדשה על research_contributions לפי שם + דרגה (research_level_of) + מוניטין (researcher_reputation).
// עץ אחד: מוצג דרך ContributorPage כ-fallback → אותו דף לכל חוקר, אצור או אוטומטי.
// noindex — פרופיל-אוטומטי לא נכנס לאינדקס (פרטיות; דפי-חוקר אצורים כן נאינדקסים).

// יעד-עומק לחידוש לפי סוג-היעד
function targetHref(t) {
  if (!t?.target_id) return "/forum";
  if (t.target_type === "number" || t.target_type === "phrase") return `/number/${encodeURIComponent(t.target_id)}#comments`;
  if (t.target_type === "els") return `/codes/${encodeURIComponent(t.target_id)}`;
  return "/forum";
}

function Stat({ P, big, label }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 14px", textAlign: "center", minWidth: 92 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{big}</div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 5 }}>{label}</div>
    </div>
  );
}

export default function ResearcherProfile({ name, onNotFound }) {
  const P = usePalette();
  const [prof, setProf] = useState(undefined); // undefined=טוען · null=לא-נמצא
  const [level, setLevel] = useState(null);
  const [rep, setRep] = useState(null);

  useEffect(() => {
    let alive = true;
    setProf(undefined); setLevel(null); setRep(null);
    getResearcherProfile(name).then((p) => {
      if (!alive) return;
      setProf(p || null);
      if (!p) { onNotFound && onNotFound(); return; }
      if (p.uid && supabase) {
        supabase.rpc("research_level_of", { p_user: p.uid }).then(({ data }) => alive && setLevel(data || null)).catch(() => {});
        supabase.rpc("researcher_reputation", { p_user_id: p.uid }).then(({ data }) => alive && setRep(data || null)).catch(() => {});
      }
    }).catch(() => alive && setProf(null));
    return () => { alive = false; };
  }, [name, onNotFound]);

  // SEO — כותרת + noindex (פרופיל-אוטומטי)
  useEffect(() => {
    if (prof === undefined) return;
    if (prof) applySeo({ title: `${prof.name} — חוקר · סוד 1820`, description: `${prof.count} חידושים של ${prof.name} בקהילת המחקר של סוד 1820.`, path: `/community/researcher/${encodeURIComponent(name)}` });
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex";
    document.head.appendChild(m);
    return () => { try { document.head.removeChild(m); } catch { /* noop */ } };
  }, [prof, name]);

  const wrap = { direction: "rtl", background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };
  if (prof === undefined) return <div style={wrap}><div style={{ textAlign: "center", padding: 70, color: P.accentDim, fontFamily: F.body }}>טוען חוקר…</div></div>;
  if (!prof) return (
    <div style={wrap}><div style={{ textAlign: "center", padding: "80px 20px", color: P.inkSoft, fontFamily: F.body, lineHeight: 1.9 }}>
      <div style={{ fontSize: 42, marginBottom: 10, opacity: 0.7 }}>👤</div>
      החוקר «{name}» לא נמצא, או שאין לו עדיין חידושים מאושרים.<br />
      <Link to="/community/researchers" style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, textDecoration: "none" }}>← לכל החוקרים</Link>
    </div></div>
  );

  const initial = (prof.name || "?").trim().charAt(0);
  const roleLabel = level?.label || "חוקר";
  const rankLabel = rep?.rank || null;
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "26px 16px 80px" }}>
        {/* כותרת */}
        <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", background: P.cardGrad || P.card, border: `2px solid ${P.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: P.accentText, fontFamily: F.regal, fontSize: 30, fontWeight: 800, flex: "0 0 auto" }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,5vw,32px)", fontWeight: 800, margin: "0 0 6px" }}>{prof.name}</h1>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{ background: P.glow, border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 999, padding: "2px 11px", fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>🌱 {roleLabel}{level?.level ? ` · דרגה ${level.level}` : ""}</span>
              {rankLabel && <span style={{ background: P.glow, border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, padding: "2px 11px", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>⭐ {rankLabel}</span>}
            </div>
          </div>
        </div>

        {/* מדדים */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          <Stat P={P} big={prof.count} label="חידושים" />
          {rep?.validated != null && <Stat P={P} big={rep.validated} label="אומתו" />}
          {rep?.points != null && <Stat P={P} big={rep.points} label="נקודות" />}
          {level?.xp != null && <Stat P={P} big={level.xp} label="XP" />}
          {prof.joined && <Stat P={P} big={formatDateHe(prof.joined).replace(/^\d+\s/, "").slice(0, 8) || "—"} label={`הצטרף ${formatDateHe(prof.joined)}`} />}
        </div>

        {/* החידושים שלו */}
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 10 }}>💡 החידושים של {prof.name}</div>
        <div style={{ display: "grid", gap: 11 }}>
          {prof.items.map((it) => {
            const txt = (it.title || it.body || "").toString().replace(/<[^>]+>/g, " ").trim();
            return (
              <Link key={it.id} to={targetHref(it)} style={{ textDecoration: "none", display: "block", background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 13, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800 }}>💡 {it.intent || "חידוש"}</span>
                  {it.target_id && <span style={{ color: P.accent, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{it.target_type === "number" ? "🔢" : it.target_type === "els" ? "🔠" : "🔖"} {it.target_id}</span>}
                  <span style={{ flex: 1 }} />
                  <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>{formatDateHe(it.created_at)}</span>
                </div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7 }}>{txt.length > 200 ? txt.slice(0, 200) + "…" : txt}</div>
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 22, textAlign: "center" }}>
          <Link to="/community/researchers" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none", borderBottom: `1px dotted ${P.accentDim}` }}>← לכל החוקרים והכתבים</Link>
        </div>
      </div>
    </div>
  );
}
