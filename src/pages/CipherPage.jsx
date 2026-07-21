import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";
import { applySeo } from "../lib/seo.js";
import { getMatrixBySlug, getVariantsOf, mergeVariant } from "../lib/elsMatrices.js";
import { getContributions } from "../lib/contributions.js";
import { getAiAnalysis, supabase } from "../lib/supabase.js";
import { GEM } from "../lib/gematria.js";
import { thumb } from "../lib/img.js";
import { formatDateHe } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";
import TzofenEmbed from "../components/TzofenEmbed.jsx";
import SubscribeGate from "../components/SubscribeGate.jsx";
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
  const { isAdmin, verified } = useAuth();
  const [m, setM] = useState(undefined); // undefined=טוען · null=לא נמצא
  const [contribCount, setContribCount] = useState(0);
  const [desc, setDesc] = useState(null);       // תוכן-העורך (null עד טעינת הצופן → m.description)
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");        // שגיאה/סטטוס
  const [savedMsg, setSavedMsg] = useState(false);
  const [titleEdit, setTitleEdit] = useState(null);  // עורך-שם (null עד טעינה → m.title)
  const [metaMsg, setMetaMsg] = useState("");         // משוב שם/תמונה
  const [newFinding, setNewFinding] = useState("");   // 🎯 אדמין — הוספת ממצא (מילה מוצלבת) לצופן הקנוני
  const [findMsg, setFindMsg] = useState("");          // משוב ניהול-ממצאים
  const [variants, setVariants] = useState([]);        // 🔀 «גרסאות» שממתינות למיזוג (אדמין)
  const [mergeMsg, setMergeMsg] = useState("");        // משוב מיזוג-גרסה
  const [showTool, setShowTool] = useState(false);    // ⚡ הכלי (2.2MB תנ״ך) נטען רק בלחיצה — כניסה מהירה
  const [gate, setGate] = useState(false);            // 🔐 שער-הרשמה לחקירת מטריצת-מחקר חיה (לא-רשום)
  const uc = useUserCenter();                         // 🫧 floating_ui_yields_law: הכפתור הצף נעלם כשמגירת-המשתמש פתוחה
  const researchRef = useRef(null);                   // 🔬 עוגן ל«מחקר קהילתי» — כדי לגלול+למקד את המלחין בלחיצה אחת

  // 💬 «הוסף ממצא / הגב» — גם כשהמטריצה פתוחה: גולל לאזור-המחקר וממקד את תיבת-הכתיבה, בלי לצאת מהכלי.
  const goComment = () => {
    const el = researchRef.current;
    if (!el) return;
    try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { el.scrollIntoView(); }
    setTimeout(() => { const ta = el.querySelector("textarea"); if (ta) { ta.focus(); ta.scrollIntoView({ block: "center" }); } }, 480);
  };

  useEffect(() => {
    let alive = true;
    // ⚠️ איפוס מלא בין צפנים — אחרת עורך-האדמין (desc) של הצופן הקודם דולף לחדש
    //    ולחיצת-שמור דורסת את התיאור הנכון (השחתת-נתונים). מאפסים desc→null כדי שייזרע מחדש.
    setM(undefined); setContribCount(0); setDesc(null); setSavedMsg(false); setAiMsg("");
    setTitleEdit(null); setMetaMsg(""); setShowTool(false); setGate(false);
    setNewFinding(""); setFindMsg(""); setVariants([]); setMergeMsg("");
    getMatrixBySlug(slug).then(r => { if (alive) setM(r); }).catch(() => alive && setM(null));
    getContributions("els", slug).then(list => { if (alive) setContribCount((list || []).length); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  // 🔀 אדמין — שולף «גרסאות» שממתינות למיזוג לצופן זה (רק כשהצופן נטען). מפתח לפי m.id בלבד
  //    (לא כל שינוי-שדה) כדי לא לרוץ בלולאה על עדכון-ממצאים מקומי.
  useEffect(() => {
    if (!isAdmin || !m || typeof m !== "object" || !m.id) { setVariants([]); return; }
    let alive = true;
    getVariantsOf(m.id).then(v => { if (alive) setVariants(v || []); }).catch(() => {});
    return () => { alive = false; };
  }, [isAdmin, m?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // מזין את עורך-התיאור פעם אחת מהתיאור השמור (אחר-כך desc הוא מקור-האמת של העורך)
  useEffect(() => { if (m && typeof m === "object" && desc === null) setDesc(m.description || ""); }, [m, desc]);
  useEffect(() => { if (m && typeof m === "object" && titleEdit === null) setTitleEdit(m.title || m.search_term || ""); }, [m, titleEdit]);

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
            {m.created_at && <span>· 🕐 {formatDateHe(m.created_at)}</span>}
          </div>
          {m.description && <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 620, margin: "10px auto 0" }}>{m.description}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
            <ShareActions type="code" url={`https://sod1820.co.il/codes/${encodeURIComponent(slug)}`}
              title={`🔠 צופן דילוג: «${m.title || m.search_term}» · דילוג ${m.skip_distance} — סוד 1820`} image={m.image_url || undefined} />
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🔍 חפשו צופן משלכם ←</Link>
          </div>
        </div>

        {/* 🔍 מה נמצא בצופן — הצגת הממצא עצמו (המילים המוצלבות), כדי שאין צורך לפתוח את הכלי כדי לראות מה נמצא. */}
        {findings.length > 0 && (
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 13, padding: "14px 16px", margin: "12px 0 4px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>🔍 מה נמצא בצופן</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, marginBottom: 11 }}>
              על הציר <b style={{ color: P.accentText }}>«{m.search_term}»</b> (דילוג {m.skip_distance}, ב{m.scope === "tanakh" ? "תנ״ך" : "תורה"}) מצטלבות <b style={{ color: P.accentText }}>{findings.length}</b> המילים:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {findings.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: P.pageBg, border: `1px solid ${f.color || P.border}`, borderRadius: 999, padding: "5px 13px", fontFamily: F.body, fontSize: 15, fontWeight: 700 }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: f.color || P.accent, flexShrink: 0 }} />
                  <span style={{ color: P.ink }}>{f.t}</span>
                </span>
              ))}
            </div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10 }}>
              עדות — לא ניבוי. {m.image_url ? "התמונה למעלה מציגה את המטריצה." : "לצפייה במטריצה החיה (עם המילים מסומנות), פתחו את הכלי למטה."}
            </div>
          </div>
        )}

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
          // ⚠️ supabase.rpc אינו זורק על שגיאת-DB — הוא מחזיר {error}. בלי בדיקת error
          //    ה-catch לעולם לא תופס וכל שמירה "מצליחה" בשקט (✓ נשמר) גם כשה-DB דחה.
          const saveDesc = async () => {
            try {
              const { error } = await supabase.rpc("set_els_meta", { p_id: m.id, p_description: desc || "" });
              if (error) throw error;
              setM(x => ({ ...x, description: desc || "" })); setSavedMsg(true); setAiMsg("");
            } catch (e) { setSavedMsg(false); setAiMsg("שמירה נכשלה: " + (e?.message || "")); }
          };
          const setStatus = async (st) => {
            setAiMsg("");
            try {
              const { error } = await supabase.rpc("moderate_els_matrix", { p_id: m.id, p_status: st });
              if (error) throw error;
              setM(x => ({ ...x, status: st }));
            } catch (e) { setAiMsg("שינוי-סטטוס נכשל: " + (e?.message || "")); }
          };
          const del = async () => {
            if (typeof window !== "undefined" && !window.confirm(`למחוק לצמיתות את הצופן «${m.title || m.search_term}»? לא ניתן לשחזר.`)) return;
            try {
              const { error } = await supabase.rpc("delete_els_matrix", { p_id: m.id });
              if (error) throw error;
              navigate("/codes");
            } catch (e) { setAiMsg("מחיקה נכשלה: " + (e?.message || "")); }
          };
          // ✏️ שינוי-שם (title) · 🖼️ בחירת תמונת-תצוגה — דרך set_els_meta (SECURITY DEFINER, אדמין)
          const saveTitle = async () => {
            const t = (titleEdit || "").trim();
            if (!t) { setMetaMsg("שם ריק"); return; }
            try {
              const { error } = await supabase.rpc("set_els_meta", { p_id: m.id, p_title: t });
              if (error) throw error;
              setM(x => ({ ...x, title: t })); setMetaMsg("✓ שם נשמר");
            } catch (e) { setMetaMsg("שמירת-שם נכשלה: " + (e?.message || "")); }
          };
          // 🎴 כרטיס מרונדר = תמונת-שיתוף ממותגת (/api/card) · 🔲 תמונת הצופן = צורת-המטריצה הגולמית (positions.shapeUrl)
          const cardUrl = `https://sod1820.co.il/api/card?w=${encodeURIComponent(m.title || m.search_term)}&sub=${encodeURIComponent("דילוג " + m.skip_distance + (m.scope === "tanakh" ? " · תנ״ך" : " · תורה"))}&cap=${encodeURIComponent("דילוגי אותיות · ELS")}`;
          const shapeUrl = m.positions?.shapeUrl || null;
          const setImage = async (url, label) => {
            try {
              const { error } = await supabase.rpc("set_els_meta", { p_id: m.id, p_image_url: url });
              if (error) throw error;
              setM(x => ({ ...x, image_url: url })); setMetaMsg("✓ תמונה: " + label);
            } catch (e) { setMetaMsg("עדכון-תמונה נכשל: " + (e?.message || "")); }
          };
          // 🎯 ניהול-ממצאים — קידום מילה שגולש הציע לתוך הצופן הקנוני / הסרת ממצא שגוי (update_els_matrix, in-place).
          const FIND_COLORS = ["#2f9e5a", "#e0851b", "#0d9488", "#7c5cff", "#c0563f", "#2f6df6", "#d0a24a"];
          const saveFindings = async (nextFindings) => {
            try {
              const nextPos = { ...(m.positions || {}), findings: nextFindings };
              const { error } = await supabase.rpc("update_els_matrix", { p_id: m.id, p_positions: nextPos });
              if (error) throw error;
              setM(x => ({ ...x, positions: nextPos })); setFindMsg("✓ עודכן");
            } catch (e) { setFindMsg("עדכון נכשל: " + (e?.message || "")); }
          };
          const addFinding = () => {
            const t = (newFinding || "").trim().replace(/\s+/g, "");
            if (!t) return;
            if (findings.some(f => (f.t || "").replace(/\s+/g, "") === t)) { setFindMsg("הממצא כבר קיים"); return; }
            saveFindings([...findings, { t, color: FIND_COLORS[findings.length % FIND_COLORS.length] }]);
            setNewFinding("");
          };
          const removeFinding = (i) => saveFindings(findings.filter((_, idx) => idx !== i));
          // 🔀 מיזוג גרסה לצופן (#1) + התראה לתורם (#3) דרך RPC אטומי, ואז רענון הצופן והרשימה.
          const doMerge = async (v) => {
            setMergeMsg("");
            try {
              const r = await mergeVariant(v.id, m.id);
              const fresh = await getMatrixBySlug(slug); if (fresh) setM(fresh);
              setVariants(list => list.filter(x => x.id !== v.id));
              setMergeMsg(`✓ מוזג — ${r?.added ?? 0} ממצאים חדשים נוספו`);
            } catch (e) { setMergeMsg("מיזוג נכשל: " + (e?.message || "")); }
          };
          const st = m.status || "published";
          const stLabel = st === "published" ? "מפורסם (גלוי לכולם)" : st === "pending" ? "טיוטה — לא ציבורי" : "מוסתר";
          return (
            <div style={{ background: P.card, border: `1px dashed ${P.accent}`, borderRadius: 13, padding: "13px 15px", margin: "0 0 6px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🛠️ ניהול הצופן (אדמין)</span>
                <span style={{ color: st === "published" ? "#3fae5f" : "#d0a24a", fontSize: 11.5, fontWeight: 700 }}>● {stLabel}</span>
              </div>
              {/* ✏️ שינוי-שם הצופן */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={titleEdit || ""} onChange={e => { setTitleEdit(e.target.value); setMetaMsg(""); }} placeholder="שם הצופן"
                  style={{ flex: 1, minWidth: 150, background: P.pageBg, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 9, padding: "9px 11px", fontFamily: F.heading, fontSize: 14, fontWeight: 700, direction: "rtl" }} />
                <button onClick={saveTitle} style={aiBtn(P, true)}>✏️ שמור שם</button>
              </div>
              {/* 🖼️ תמונת-תצוגה: כרטיס מרונדר (שיתוף) / תמונת-הצופן */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: P.accentDim, fontSize: 12, fontWeight: 700 }}>🖼️ תצוגה:</span>
                {m.image_url && <img src={m.image_url} alt="" style={{ width: 54, height: 30, objectFit: "cover", borderRadius: 5, border: `1px solid ${P.border}` }} />}
                <button onClick={() => setImage(cardUrl, "כרטיס מרונדר")} style={aiBtn(P, false)}>🎴 כרטיס מרונדר</button>
                {shapeUrl && <button onClick={() => setImage(shapeUrl, "תמונת הצופן")} style={aiBtn(P, false)}>🔲 תמונת הצופן</button>}
                {metaMsg && <span style={{ color: metaMsg.startsWith("✓") ? "#3fae5f" : "#c98a7a", fontSize: 12, fontWeight: 700 }}>{metaMsg}</span>}
              </div>
              {/* 🎯 ניהול-ממצאים — קידום מילה שגולש הציע לתוך הצופן הקנוני, או הסרת ממצא שגוי (in-place) */}
              <div style={{ background: P.pageBg, border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ color: P.accentDim, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🎯 ממצאים מוצלבים ({findings.length}) — הוסף מילה שגולש הציע, או הסר שגוי</div>
                {findings.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                    {findings.map((f, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: P.card, border: `1px solid ${f.color || P.border}`, borderRadius: 999, padding: "4px 6px 4px 11px", fontFamily: F.body, fontSize: 13.5, fontWeight: 700 }}>
                        <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: f.color || P.accent, flexShrink: 0 }} />
                        <span style={{ color: P.ink }}>{f.t}</span>
                        <button onClick={() => removeFinding(i)} title="הסר ממצא" style={{ cursor: "pointer", border: "none", background: "transparent", color: "#c0563f", fontSize: 15, fontWeight: 800, lineHeight: 1, padding: "0 2px" }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={newFinding} onChange={e => { setNewFinding(e.target.value); setFindMsg(""); }}
                    onKeyDown={e => { if (e.key === "Enter") addFinding(); }} placeholder="מילה מוצלבת חדשה (למשל: ישלם נכרי)"
                    style={{ flex: 1, minWidth: 160, background: P.card, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 9, padding: "9px 11px", fontFamily: F.body, fontSize: 13.5, direction: "rtl" }} />
                  <button onClick={addFinding} style={aiBtn(P, true)}>➕ הוסף ממצא</button>
                  {findMsg && <span style={{ color: findMsg.startsWith("✓") ? "#3fae5f" : "#c98a7a", fontSize: 12, fontWeight: 700 }}>{findMsg}</span>}
                </div>
              </div>
              {/* 🔀 גרסאות שממתינות למיזוג (#2 → #1): גולש ששמר על צופן קיים. מיזוג מושך את ממצאיו + מתריע לו (#3). */}
              {variants.length > 0 && (
                <div style={{ background: P.pageBg, border: `1px solid ${P.accent}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ color: P.accentText, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>🔀 גרסאות שממתינות למיזוג ({variants.length})</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {variants.map(v => {
                      const vf = Array.isArray(v.positions?.findings) ? v.positions.findings : [];
                      return (
                        <div key={v.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 9, padding: "9px 11px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: vf.length ? 6 : 0 }}>
                            <span style={{ color: P.inkSoft, fontSize: 12, fontWeight: 700 }}>✍️ {v.author_name || "אורח"}</span>
                            <span style={{ color: P.accentDim, fontSize: 11 }}>· {vf.length} ממצאים</span>
                            <span style={{ flex: 1 }} />
                            <button onClick={() => doMerge(v)} style={aiBtn(P, true)}>🔀 מזג לצופן</button>
                          </div>
                          {vf.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {vf.map((f, i) => (
                                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: P.pageBg, border: `1px solid ${f.color || P.border}`, borderRadius: 999, padding: "3px 10px", fontFamily: F.body, fontSize: 12.5, fontWeight: 700, color: P.ink }}>{f.t}</span>
                              ))}
                            </div>
                          )}
                          {v.description && <div style={{ color: P.inkSoft, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{v.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {mergeMsg && <div style={{ color: mergeMsg.startsWith("✓") ? "#3fae5f" : "#c98a7a", fontSize: 12, fontWeight: 700, marginTop: 7 }}>{mergeMsg}</div>}
                </div>
              )}
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

      {/* 🔍 סטטי-קודם, מנוע-לפי-בקשה (כל הצפנים): כברירת-מחדל מציגים כרטיס-תצוגה, והמנוע הכבד
          (כל התנ״ך ~2.2MB) נטען רק בלחיצה על «חקור במטריצה החיה» — כניסה מיָידית, והעמוד לא תלוי
          בטעינת המטריצה כדי להראות צופן (תיקון: צופן בלי-תמונה כבר לא נופל למסך-פתיחה גנרי).
          צפני-מחקר: החקירה עדיין שמורה לרשומים (שער-הרשמה). 🏆 onQuality: צריבת-MC מעדכנת m מיד. */}
      {showTool ? (
        <TzofenEmbed matrix={m} onQuality={q => setM(prev => (prev && typeof prev === "object") ? { ...prev, positions: { ...(prev.positions || {}), quality: q } } : prev)} />
      ) : gate ? (
        <div style={{ maxWidth: 620, margin: "12px auto 4px", padding: "0 14px" }}>
          <SubscribeGate source="els-research" onUnlock={() => { setGate(false); setShowTool(true); }} />
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={() => setGate(false)} style={{ background: "transparent", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>← חזרה</button>
          </div>
        </div>
      ) : (() => {
        // 🔐 חקירת המטריצה החיה שמורה לרשומים ל: (א) צפני-מחקר, (ב) צפני-תנ״ך — כי חיפוש בכל
        //    התנ״ך הוא ממילא יכולת-רשומים (בקשת צוריאל: ברירת-המחדל תורה; תנ״ך רק למי שחיפש בתנ״ך,
        //    ורק לרשומים). צפייה בפוסטר פתוחה לכולם — רק החקירה החיה מגודרת. אדמין/מאומת עוברים.
        const needReg = (m.source === "research" || m.scope === "tanakh") && !verified && !isAdmin;
        // 🎬 פוסטר-קולנועי: תמונה מרונדרת באיכות בינונית (thumb ~900/60 — קלה למובייל/סוללה חלשה,
        //    במקום רזולוציה-מלאה שנטענת לאט) + זום-Ken-Burns עדין שנותן תחושת «סרט» בלי לטעון שום מנוע.
        //    המנוע הכבד (~2.2MB תנ״ך) נטען רק בלחיצה מפורשת — אין «הסתרכות» למטריצה. respect prefers-reduced-motion.
        const poster = m.image_url ? thumb(m.image_url, 900, 60) : null;
        return (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 14px 4px" }}>
            <style>{`
              @keyframes cipherKenBurns { 0%{transform:scale(1.005) translate3d(0,0,0)} 50%{transform:scale(1.075) translate3d(-1.2%,-1.4%,0)} 100%{transform:scale(1.005) translate3d(0,0,0)} }
              .cipher-poster-img{ animation:cipherKenBurns 22s ease-in-out infinite; will-change:transform; }
              @media (prefers-reduced-motion: reduce){ .cipher-poster-img{ animation:none } }
            `}</style>
            <button onClick={() => needReg ? setGate(true) : setShowTool(true)} aria-label="פתח את הכלי החי"
              style={{ position: "relative", cursor: "pointer", display: "block", width: "100%", padding: 0, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", background: "#0a0700" }}>
              {poster
                ? <img className="cipher-poster-img" src={poster} alt={m.title || m.search_term} loading="eager" style={{ width: "100%", display: "block", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700" }} />
                : <div style={{ width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: P.accentText, fontFamily: F.regal, fontWeight: 800, padding: 16, textAlign: "center", background: P.cardGrad || P.cardSoft }}>
                    <img src="/els-icon.png" alt="" width="52" height="52" style={{ borderRadius: 12, objectFit: "cover" }} />
                    <div style={{ fontSize: 26 }}>{m.title || m.search_term}</div>
                    <div style={{ fontSize: 13.5, color: P.inkSoft, fontFamily: F.body, fontWeight: 400 }}>דילוג {m.skip_distance} · {m.scope === "tanakh" ? "תנ״ך" : "תורה"}{findings.length ? ` · ${findings.length} ממצאים` : ""}</div>
                  </div>}
              {/* הצללה קולנועית מלמטה — נותנת עומק-פוסטר ומדגישה את כפתור-החקירה */}
              <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,4,14,0.18) 0%, rgba(6,4,14,0) 34%, rgba(6,4,14,0.12) 62%, rgba(6,4,14,0.6) 100%)" }} />
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "0 0 16px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: P.accentBtn, color: P.onAccent, borderRadius: 999, padding: "12px 24px", fontFamily: F.heading, fontSize: 15, fontWeight: 800, boxShadow: "0 6px 22px rgba(0,0,0,0.55)" }}>{needReg ? "🔒" : "🔬"} חקור במטריצה החיה</span>
              </span>
            </button>
            <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 12, marginTop: 6 }}>
              {needReg ? `חקירת המטריצה החיה של ${m.scope === "tanakh" ? "צפני-התנ״ך" : "צפני-המחקר"} שמורה לרשומים — הרשמה חינם פותחת.` : `🎬 תצוגת פוסטר מהירה — המטריצה החיה (ב${m.scope === "tanakh" ? "תנ״ך" : "תורה"}) נטענת רק בלחיצה.`}
            </div>
          </div>
        );
      })()}

      {/* 🔬 מחקר קהילתי — העמוד «חי»: חידושים/עדויות/הצלבות מצטברים על הצופן (research_contribution_law) */}
      <div ref={researchRef} id="cipher-research" style={{ maxWidth: 780, margin: "0 auto", padding: "22px 14px 70px", scrollMarginTop: 70 }}>
        <Discourse target={{ type: "els", id: slug }} origin="els" archive={[]} />
      </div>

      {/* 💬 כפתור צף — «הוסף ממצא / הגב» כשהמטריצה החיה פתוחה. נעלם כשמגירת-המשתמש פתוחה (floating_ui_yields_law). */}
      {showTool && !uc.isOpen && (
        <button onClick={goComment} aria-label="הוסף ממצא או הגב על הצופן"
          style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 3000,
            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", border: "none", borderRadius: 999,
            background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 800,
            padding: "12px 22px", minHeight: 46, boxShadow: "0 8px 26px rgba(0,0,0,0.55)" }}>
          💬 מצאת משהו? הוסף ממצא / הגב
        </button>
      )}

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
