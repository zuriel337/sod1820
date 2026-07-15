import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { getMatrixBySlug } from "../lib/elsMatrices.js";
import { getContributions } from "../lib/contributions.js";
import { getAiAnalysis, supabase } from "../lib/supabase.js";
import { GEM } from "../lib/gematria.js";
import { useAuth } from "../lib/AuthContext.jsx";
import TzofenEmbed from "../components/TzofenEmbed.jsx";
import Discourse from "../components/Discourse.jsx";
import ShareActions from "../components/ShareActions.jsx";

// גימטריה רגילה (יסוד) בצד-הלקוח — סופיות מקופלות לבסיס (GEM כולל אותן). לעובדות ה-AI בלבד.
const ragil = (s) => [...String(s || "")].reduce((a, c) => a + (GEM[c] || 0), 0);

// 🔗 עמוד קנוני יחיד לכל צופן שמור (/code/:slug) — עדשה על els_records (published).
// unified_graph_law: מקור אחד; גלריה/שיתוף מפנים לכאן, לא משכפלים. SEO+OG לכל צופן.
export default function CipherPage() {
  const { slug } = useParams();
  const P = usePalette();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [m, setM] = useState(undefined); // undefined=טוען · null=לא נמצא
  const [contribCount, setContribCount] = useState(0);
  const [desc, setDesc] = useState(null);       // תוכן-העורך (null עד טעינת הצופן → m.description)
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");        // שגיאה/סטטוס
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    let alive = true;
    setM(undefined); setContribCount(0);
    getMatrixBySlug(slug).then(r => { if (alive) setM(r); }).catch(() => alive && setM(null));
    getContributions("els", slug).then(list => { if (alive) setContribCount((list || []).length); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  // מזין את עורך-התיאור פעם אחת מהתיאור השמור (אחר-כך desc הוא מקור-האמת של העורך)
  useEffect(() => { if (m && typeof m === "object" && desc === null) setDesc(m.description || ""); }, [m, desc]);

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
  const q = m.positions?.quality || null;   // 🏆 מד-איכות שנצרב בשמירה (מונטה-קרלו + כוכבים)
  const mcTxt = q && (q.rarity || q.rarityCapped)
    ? (q.rarityCapped ? `נדיר מ־1 ל־${q.trials || 400}` : `נדיר בערך 1 ל־${q.rarity}`) + (q.percentile != null ? ` · חזק מ־${q.percentile}%` : "")
    : null;
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 14px 8px" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 3, textTransform: "uppercase" }}>דילוגי אותיות · ELS</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 800, margin: "4px 0 6px", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <img src="/els-icon.png" alt="" width="38" height="38" style={{ borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
            <span>{m.title || m.search_term}</span>
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
            <ShareActions type="code" url={`https://sod1820.co.il/codes/${encodeURIComponent(slug)}`}
              title={`🔠 צופן דילוג: «${m.title || m.search_term}» · דילוג ${m.skip_distance} — סוד 1820`} image={m.image_url || undefined} />
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🔍 חפשו צופן משלכם ←</Link>
          </div>
        </div>

        {/* 🔗 מחובר אל · 🎖️ רמת מחקר — הופך את העמוד לשער-מחקר (unified_graph_law). מינימלי, גדל עם הנתונים. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, margin: "14px 0 4px" }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 13, padding: "13px 15px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 9 }}>🎖️ רמת מחקר</div>
            <div style={{ display: "grid", gap: 6, color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.5 }}>
              {q && q.stars ? (
                <span style={{ color: P.accentText, fontSize: 15, letterSpacing: 1 }} title={q.verified ? "כוכבים נגזרים ממובהקות מונטה-קרלו מדודה" : "הערכה מהירה — לא הורצה מובהקות"}>
                  {"★".repeat(q.stars)}<span style={{ opacity: 0.35 }}>{"☆".repeat(5 - q.stars)}</span>
                  <span style={{ color: P.inkSoft, fontSize: 11.5, marginInlineStart: 7, fontFamily: F.body }}>{q.verified ? "מובהקות מדודה" : "הערכה"}</span>
                </span>
              ) : null}
              <span>✓ נמצא במנוע — דילוג {m.skip_distance} ב{m.scope === "tanakh" ? "תנ״ך" : "תורה"}</span>
              {mcTxt && <span>✓ מונטה-קרלו: {mcTxt}</span>}
              {q && q.axisOcc === 1 && <span>✓ הציר «{m.search_term}» — יחיד בתורה</span>}
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

        {/* 🛠️ ניהול הצופן (אדמין) — עורך-תיאור חופשי (כתוב/AI/מחק) + סטטוס (פרסם/טיוטה/הסתר) + מחיקה */}
        {isAdmin && (() => {
          const gemVal = ragil(m.search_term);
          const factsStr = [
            `המונח: ${m.search_term} · דילוג ${m.skip_distance} · ב${m.scope === "tanakh" ? "תנ״ך" : "תורה"}`,
            gemVal ? `גימטריה (רגיל): ${m.search_term} = ${gemVal}` : null,
            findings.length ? `המילים המוצלבות שנמצאו: ${findings.map(f => f.t).filter(Boolean).join(", ")}` : "המילים המוצלבות: (אין)",
            mcTxt ? `מובהקות מונטה-קרלו: ${mcTxt}` : (q && q.stars ? `איכות: ${q.stars} כוכבים (הערכה)` : null),
            q && q.axisOcc === 1 ? `הציר «${m.search_term}» יחיד בתורה` : null,
          ].filter(Boolean).join("\n");
          const genAI = async (again) => {
            setAiBusy(true); setAiMsg("");
            // getAiAnalysis מחזיר מחרוזת (או null) — ממלא את העורך; אפשר לערוך/למחוק אחרי.
            const r = await getAiAnalysis({ kind: "els", subject: m.search_term, facts: factsStr, again });
            setAiBusy(false);
            if (r && typeof r === "string") { setDesc(r.replace(/^#+\s.*$/gm, "").trim()); setSavedMsg(false); }
            else setAiMsg("המנוע עמוס כרגע — נסו שוב בעוד רגע");
          };
          const saveDesc = async () => {
            try { await supabase.rpc("set_els_meta", { p_id: m.id, p_description: desc || "" }); setSavedMsg(true); setAiMsg(""); }
            catch (e) { setAiMsg("שמירה נכשלה: " + (e?.message || "")); }
          };
          const setStatus = async (st) => {
            setAiMsg("");
            try { await supabase.rpc("moderate_els_matrix", { p_id: m.id, p_status: st }); setM(x => ({ ...x, status: st })); }
            catch (e) { setAiMsg("שינוי-סטטוס נכשל: " + (e?.message || "")); }
          };
          const del = async () => {
            if (typeof window !== "undefined" && !window.confirm(`למחוק לצמיתות את הצופן «${m.title || m.search_term}»? לא ניתן לשחזר.`)) return;
            try { await supabase.rpc("delete_els_matrix", { p_id: m.id }); navigate("/codes"); }
            catch (e) { setAiMsg("מחיקה נכשלה: " + (e?.message || "")); }
          };
          const st = m.status || "published";
          const stLabel = st === "published" ? "מפורסם (גלוי לכולם)" : st === "pending" ? "טיוטה — לא ציבורי" : "מוסתר";
          return (
            <div style={{ background: P.card, border: `1px dashed ${P.accent}`, borderRadius: 13, padding: "13px 15px", margin: "0 0 6px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🛠️ ניהול הצופן (אדמין)</span>
                <span style={{ color: st === "published" ? "#3fae5f" : "#d0a24a", fontSize: 11.5, fontWeight: 700 }}>● {stLabel}</span>
              </div>
              <textarea value={desc || ""} onChange={e => { setDesc(e.target.value); setSavedMsg(false); }}
                placeholder="כתוב כאן חופשי את הסבר הצופן — או תן ל-AI לנסח, ואז ערוך/מחק כרצונך…"
                style={{ width: "100%", minHeight: 118, background: P.pageBg, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 9, padding: 10, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, direction: "rtl", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => genAI(false)} disabled={aiBusy} style={aiBtn(P, false)}>{aiBusy ? "…מנסח" : "✨ נסח ב-AI"}</button>
                {desc && <button onClick={() => genAI(true)} disabled={aiBusy} style={aiBtn(P, false)}>↻ זווית אחרת</button>}
                <button onClick={() => { setDesc(""); setSavedMsg(false); }} style={aiBtn(P, false)}>🧹 נקה טקסט</button>
                <button onClick={saveDesc} style={aiBtn(P, true)}>💾 שמור תיאור</button>
                {savedMsg && <span style={{ color: "#3fae5f", fontSize: 12, fontWeight: 800 }}>✓ נשמר</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${P.border}`, paddingTop: 11 }}>
                {st !== "published" && <button onClick={() => setStatus("published")} style={statusBtn("#1c7a38", "#eafff0")}>✅ פרסם</button>}
                {st !== "pending" && <button onClick={() => setStatus("pending")} style={statusBtn(P.card, P.ink, P.border)}>📝 העבר לטיוטה</button>}
                {st !== "hidden" && <button onClick={() => setStatus("hidden")} style={statusBtn(P.card, P.ink, P.border)}>🙈 הסתר</button>}
                <button onClick={del} style={statusBtn("transparent", "#c0563f", "#c0563f")}>🗑 מחק לצמיתות</button>
                {aiMsg && <span style={{ color: "#c98a7a", fontSize: 12 }}>{aiMsg}</span>}
              </div>
            </div>
          );
        })()}
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
function aiBtn(P, primary) {
  return {
    cursor: "pointer", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, padding: "7px 14px", minHeight: 34,
    border: primary ? "none" : `1px solid ${P.border}`,
    background: primary ? P.accentBtn : "transparent",
    color: primary ? P.onAccent : P.accentDim,
  };
}
function statusBtn(bg, color, borderColor) {
  return {
    cursor: "pointer", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, padding: "7px 14px", minHeight: 34,
    border: `1px solid ${borderColor || bg}`, background: bg, color,
  };
}
