import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import ChristinaEngine from "./ChristinaEngine.jsx";
import { getResearcherConvergences } from "../lib/contributions.js";

// ✦ מנוע-המרכז של דף-הכתב — נבחר לפי contributors.specialty (writers_page_law).
// כל כתב והמנוע שלו; זו הזהות של הדף, לא פיד גנרי. מנוע שלא מומש עדיין → null,
// והמדורים הרגילים של הדף נושאים את התוכן בינתיים. עץ אחד: כל מנוע = עדשה על הגרף.
export default function SpecialtyCenter({ c }) {
  const P = usePalette();
  if (!c || !c.specialty) return null;
  const acc = c.accent || P.accent;
  switch (c.specialty) {
    case "letter-decoder":
      return <ChristinaEngine embedded />;
    case "crosses":
      return <CrossesWall name={c.display_name} acc={acc} P={P} />;
    case "els-ciphers":
      return <CiphersWall name={c.display_name} acc={acc} P={P} />;
    case "wordplay-langs":
      return <WordplayWall name={c.display_name} acc={acc} P={P} />;
    default:
      return null;
  }
}

// ✎ קיר משחקי-האותיות — נוטריקון · אנגרם · שפות (writer_material_home_law §2).
// עדשה על research_contributions (author_name, intent=חידוש, gematria_claim.kind ∈ אנגרם/נוטריקון/...).
// אנגרם/נוטריקון = רמז-פרשני; רק ערך-הגימטריה עובדה מאומתת. מספר → /number הקנוני, לא משכפל.
const WORDPLAY_KINDS = ["anagram", "notarikon", "anagram+notarikon", "wordplay", "cross_language"];
function WordplayWall({ name, acc, P }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase.from("research_contributions")
      .select("id,title,body,target_id,gematria_claim,created_at")
      .eq("author_name", name).eq("status", "approved")
      .not("gematria_claim", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!alive) return;
        const wp = (Array.isArray(data) ? data : []).filter(r => WORDPLAY_KINDS.includes(r.gematria_claim?.kind));
        setRows(wp);
      });
    return () => { alive = false; };
  }, [name]);

  if (rows === null || rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>✎ משחקי-האותיות של {name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} רמזים — נוטריקון · אנגרם · שפות · הערך מאומת במנוע, הצירוף רמז משלים
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {rows.map(r => {
          const val = r.gematria_claim?.value;
          return (
            <div key={r.id}
              style={{ display: "flex", flexDirection: "column", gap: 8,
                background: `linear-gradient(180deg, ${acc}1c, ${P.card} 70%)`,
                border: `1px solid ${P.border}`, borderTop: `3px solid ${acc}`, borderRadius: 14, padding: "13px 15px" }}>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.4 }}>{r.title}</div>
              {r.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.5 }}>{r.body}</div>}
              {val != null && (
                <div style={{ marginTop: "auto" }}>
                  <a href={`/number/${val}`} onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, color: acc, textDecoration: "none",
                      border: `1px solid ${acc}55`, borderRadius: 999, padding: "2px 10px" }}>{val}</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}

// 🔡 קיר הצפנים — הצפנים שהכתב פרסם (els_records published). כל צופן → /codes הקנוני.
// חוקרי הצופן התנכי (אהרן בוחניק · נריה דויטש · אברהם הירש). עץ אחד: מצביע, לא משכפל.
function CiphersWall({ name, acc, P }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase.from("els_records")
      .select("slug,title,search_term,skip_distance,scope,image_url")
      .eq("author_name", name).eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, [name]);

  if (rows === null || rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>🔡 הצפנים של {name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} צפנים בתורה · דילוגי אותיות · לחיצה פותחת את הצופן המלא
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {rows.map(r => (
          <a key={r.slug} href={`/codes/${encodeURIComponent(r.slug)}`}
            style={{ display: "flex", flexDirection: "column", textDecoration: "none",
              background: P.card, border: `1px solid ${P.border}`, borderTop: `3px solid ${acc}`,
              borderRadius: 14, overflow: "hidden" }}>
            {r.image_url && (
              <div style={{ width: "100%", aspectRatio: "16/10", background: "#0a0710", overflow: "hidden" }}>
                <img src={r.image_url} alt={r.title || r.search_term} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.35 }}>{r.title || r.search_term}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", color: P.inkSoft, fontFamily: F.mono, fontSize: 11.5 }}>
                {r.search_term && <span style={{ color: acc, fontWeight: 800 }}>🔠 {r.search_term}</span>}
                {r.skip_distance != null && <span>דילוג {r.skip_distance}</span>}
                {r.scope && <span>· {r.scope === "tanakh" ? "תנ״ך" : "תורה"}</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}

// ✦ קיר ההצלבות — ההתכנסויות שהכתב יצר (topic_cards created_by). כל הצלבה = כרטיס בולט
// שמפנה ל-/topic הקנוני, והמספרים ל-/number. לא משכפל — מצביע (unified_graph_law).
function CrossesWall({ name, acc, P }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    getResearcherConvergences(name).then(r => { if (alive) setRows(Array.isArray(r) ? r : []); });
    return () => { alive = false; };
  }, [name]);

  if (rows === null) return null;
  if (rows.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>✦ קיר ההצלבות של {name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} הצלבות — ביטויים ששווים לאותו ערך · לחיצה פותחת את ההתכנסות
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {rows.map(t => {
          const nums = [...new Set([...(t.highlight_numbers || []), ...(t.numbers || [])])].filter(n => n != null).slice(0, 4);
          return (
            <a key={t.slug} href={`/topic/${t.slug}`}
              style={{ display: "flex", flexDirection: "column", gap: 8, textDecoration: "none",
                background: `linear-gradient(180deg, ${acc}1c, ${P.card} 70%)`,
                border: `1px solid ${P.border}`, borderTop: `3px solid ${acc}`, borderRadius: 14, padding: "13px 15px" }}>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.4 }}>{t.title}</div>
              {t.subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.5 }}>{t.subtitle}</div>}
              {nums.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                  {nums.map(n => (
                    <span key={n} onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/number/${n}`; }}
                      style={{ fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, color: acc,
                        border: `1px solid ${acc}55`, borderRadius: 999, padding: "2px 10px", cursor: "pointer" }}>{n}</span>
                  ))}
                </div>
              )}
            </a>
          );
        })}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
