import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { F, calcGem } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getTopicCardBySlug, getGalleryImagesByIds, getConvergenceEntities, getElsForNumbers, setImageCuration } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { topicConvergenceToUniversalFinding, topicConvergenceContentSections } from "../lib/research/topicConvergence.js";
import { useSiteFlag } from "../components/MaintenanceLock.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import RealityStream from "../components/RealityStream.jsx";
import DocActions from "../components/DocActions.jsx";
import ShareActions from "../components/ShareActions.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import { track } from "../lib/tracking.js";
import { withRid } from "../lib/propagation.js";

// ===== מרכז ההתכנסות — עמוד כרטיס נושא (/topic/:slug) =====
// כאן נפגשים כל החוטים: מספרים, תמונות, חיבורים ורמזים — שער לעולם שלם של קשרים.
// 📜 גוף הכרטיס (findings) לא מרונדר כאן ישירות: הוא עובר דרך המתאם הקנוני
// Topic/Convergence → Universal Finding (topicConvergence.js) ומוצג ע״י הרנדרר המשותף
// TopicConvergenceContent — אותו read-model שה-Entity Hub / Research Viewer צורכים.
// (LEGACY_CONTENT_TO_ONE_RESEARCH_OS_BRIDGE_V1 · work_log 1af998d5). הדף הזה = משטח-תאימות.
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function TopicPage() {
  const P = usePalette();
  const box = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 20px" };
  const { slug } = useParams();
  const contentRef = useRef(null);   // מכל-התוכן להדפסה (DocActions)
  const [card, setCard] = useState(undefined); // undefined=loading, null=not found
  const [imgs, setImgs] = useState([]);
  const [ents, setEnts] = useState([]); // ישויות/חתימות מחוברות בגרף (דרך edges)
  const [ciphers, setCiphers] = useState([]); // 🔠 צפנים (ELS) שמתלכדים על מספרי ההתכנסות (round-trip)
  const { isAdmin } = useAuth();        // עריכת תמונה בדף ההתכנסויות — מנהל בלבד
  const research = useResearch();
  const crossLock = useSiteFlag("lock_cross");  // כפתורי «הצלבה» מובילים ל-/cross — מוסתרים כשהוא נעול
  const [editImg, setEditImg] = useState(null);

  // 💾 שמירת עריכת-תמונה (מנהל) — מעדכן במאגר + אופטימי ברשימה. אותו מנגנון של הגלריות (עץ אחד).
  function saveImgEdit(patch) {
    if (!editImg || !Object.keys(patch).length) { setEditImg(null); return; }
    const id = editImg.id;
    setImageCuration(id, patch)
      .then(() => { setImgs(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i)); setEditImg(null); })
      .catch(() => setEditImg(null));
  }

  useEffect(() => { if (slug) track("convergence", slug); }, [slug]);

  useEffect(() => {
    let live = true;
    setCard(undefined); setImgs([]); setEnts([]); setCiphers([]);
    getTopicCardBySlug(slug).then(async c => {
      if (!live) return;
      setCard(c);
      if (c) {
        applySeo({
          title: `${c.title} — מרכז ההתכנסות`,
          description: c.subtitle || "מפת הקשרים של SOD1820",
          path: `/topic/${slug}`, type: "article",
          publishedTime: c.created_at, modifiedTime: c.approved_at || c.created_at,
          tags: c.search_terms || [],
        });
        if ((c.image_ids || []).length) {
          try {
            const fetched = await getGalleryImagesByIds(c.image_ids);
            const byId = Object.fromEntries(fetched.map(i => [i.id, i]));
            // שמירה על הסדר שנקבע בכרטיס (image_ids) — לא סדר אקראי
            setImgs((c.image_ids || []).map(id => byId[id]).filter(Boolean));
          } catch { /* ignore */ }
        }
        if (c.node_id) {
          try { setEnts(await getConvergenceEntities(c.node_id)); } catch { /* ignore */ }
        }
        try { setCiphers(await getElsForNumbers(c.numbers || [])); } catch { /* ignore */ }
      }
    }).catch(() => live && setCard(null));
    return () => { live = false; };
  }, [slug]);

  // 🧭 Universal Research Context — Topic is a surface, not a new store.
  // If no inquiry exists, this Topic becomes the root subject. If one already exists (e.g. Number 1237),
  // preserve that root and only move the current selection/lens to this Topic.
  useEffect(() => {
    if (!card || !slug) return;
    const topicSubject = { id: String(slug), type: "topic", label: card.title, href: `/topic/${slug}` };
    const selection = { entityId: String(slug), entityType: "topic" };
    if (!research.context?.subject) {
      research.setResearchContext?.({ subject: topicSubject, selection, lens: "topic" });
    } else {
      research.updateResearchContext?.({ selection, lens: "topic" });
    }
    // Context changes are intentionally not a dependency: this effect represents entering a new topic route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, slug]);

  // 📜 הקרנה קנונית של הכרטיס (כולל findings) ל-Universal Finding — טהור, בלי שאילתה נוספת.
  // הגרף (node/edges) מוצג כאן דרך getConvergenceEntities הקיים; ה-Hub משתמש ב-fetchCanonicalTopicConvergenceFinding.
  const finding = useMemo(() => (card ? topicConvergenceToUniversalFinding({ card }) : null), [card]);
  const content = useMemo(() => topicConvergenceContentSections(finding), [finding]);

  if (card === undefined) return <Center>טוען…</Center>;
  if (!card) return <Center>הכרטיס לא נמצא. <Link to="/" style={{ color: P.accentText }}>חזרה →</Link></Center>;

  const hot = new Set(card.highlight_numbers || []);
  const nums = card.numbers || [];
  const crossHidden = crossLock.lock?.enabled && !isAdmin;   // /cross נעול → לא להראות כפתורי-הצלבה מתים
  const topicSubject = { id: String(slug), type: "topic", label: card.title, href: `/topic/${slug}` };
  const leaveTopic = (lens, selection = null) => {
    research.updateResearchContext?.({
      lens,
      selection,
      returnTo: { href: `/topic/${slug}`, label: card.title, subject: topicSubject },
    });
  };

  // convergence_evidence_law: עוצמת ההתכנסות = מספר השיטות/הראיות העצמאיות המתלכדות בעוגן.
  // הכוכבים נגזרים מהעוצמה האמיתית לפי העץ — לא מ-quality שהוזן ידנית.
  // מוזן מאותה הקרנה משותפת (שורות-הכרטיס + טענות-המספר של root-array) — אותה סמנטיקה כמו קודם:
  // תווית-השיטה של הכותב כלשונה (rows.note / element.method), לא שיטה שנפתרה מהמנוע.
  const evRows = content ? [...content.sections.rows, ...content.sections.numericClaims] : [];
  const evMethods = new Set();
  let evCount = 0;
  evRows.forEach(r => {
    if (r.valueRaw != null) evCount++;
    const m = r.methodLabel || r.note;
    if (m) String(m).split(/[·/]/).forEach(x => { const t = x.trim(); if (t && t !== "—") evMethods.add(t); });
  });
  ents.forEach(e => { if (e.edgeMethod) evMethods.add(e.edgeMethod); });
  if (ciphers.length) evMethods.add("דילוג ELS");   // convergence_evidence_law: צופן = ראיה עצמאית
  const meterStars = card.meter_score ? Math.round(card.meter_score / 20) : 0;
  const convStars = Math.max(1, Math.min(5, Math.max(evMethods.size, evCount >= 5 ? 5 : evCount, meterStars)));

  return (
    <div ref={contentRef} style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "40px 22px 90px", background: P.pageBg, color: P.inkSoft }}>
      {/* כותרת */}
      <div style={{ ...box, borderColor: P.borderStrong, marginBottom: 20 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>🧠 מרכז ההתכנסות</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>{card.title}</h1>
          <span style={{ color: P.accent, fontSize: 15, letterSpacing: 2 }}>{"★".repeat(convStars) + "☆".repeat(5 - convStars)}</span>
          {evMethods.size >= 2 && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5 }}>· {evMethods.size} שיטות עצמאיות</span>}
        </div>
        {card.subtitle && <p style={{ color: P.ink, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.7, margin: "10px 0 0" }}>{card.subtitle}</p>}
        {/* שיתוף ההתכנסות — רכיב-השיתוף הקנוני (canonical_ui_components_law), עם rid למעקב-התפשטות */}
        <div style={{ marginTop: 14 }}>
          <ShareActions type="topic"
            url={withRid(`${typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il"}/topic/${slug}`)}
            title={`${card.title} · התכנסות בסוד 1820 👑`} />
        </div>
        {/* 🖨️ הדפסה + 💾 שמירה פרטית לדף העבודה */}
        <div style={{ marginTop: 12 }}>
          <DocActions kind="convergence" refId={slug} title={`${card.title} — מרכז ההתכנסות`} link={`/topic/${slug}`} contentRef={contentRef} />
        </div>
        {/* מספרים → עמוד מספר */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {nums.map(n => (
            <Link key={n} to={`/number/${n}`} onClick={() => leaveTopic("number", { entityId: String(n), entityType: "number" })}
              style={{ textDecoration: "none", fontFamily: F.mono, fontWeight: 800,
              fontSize: hot.has(n) ? 16 : 13, padding: hot.has(n) ? "5px 14px" : "3px 10px", borderRadius: 999,
              border: `1px solid ${hot.has(n) ? P.accent : P.border}`, background: hot.has(n) ? P.glow : "transparent",
              color: hot.has(n) ? P.accentText : P.accentDim }}>{n}</Link>
          ))}
        </div>
        {/* גשר ל-/cross — הצלבת השיטות של המספרים המודגשים (מוסתר כל עוד /cross נעול) */}
        {!crossHidden && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {(card.highlight_numbers || nums.slice(0, 3)).map(n => (
            <Link key={`x${n}`} to={`/cross?n=${n}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
              border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px",
              color: P.ink, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>⟡ הצלבת {n} →</Link>
          ))}
        </div>
        )}
      </div>

      {/* 👑 ישויות מחוברות בגרף (חתימות זהב) */}
      {ents.length > 0 && (
        <div style={{ ...box, borderColor: P.borderStrong, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>👑 חתימות וישויות מחוברות</div>
          <div style={{ display: "grid", gap: 8 }}>
            {ents.map(e => {
              const gold = e.metadata?.tier === "gold";
              // convergence_number_method_law: מספר מוצג רק כשהוא ראיה אמיתית (שיטה שמתלכדת בעוגן),
              // ותמיד עם שם השיטה. הערך+השיטה ספציפיים להתכנסות ויושבים על ה-edge.
              // ישות-נושא (קשורה תמטית, לא בערך) — מוצגת בלי מספר, כדי לא להטעות.
              const stored = e.edgeValue ?? e.metadata?.value ?? null;
              const rag = calcGem(e.label) || null;
              const ragMatches = rag != null && (card.numbers || []).includes(rag);
              const val = stored ?? (ragMatches ? rag : null);
              // תווית שיטה: מה-edge, אחרת «רגיל» כשהערך המוצג שווה לרגיל — לעולם לא מספר בלי שיטה
              const method = e.edgeMethod || (val != null && val === rag ? "רגיל" : null);
              return (
                <Link key={e.label} to={`/number/${encodeURIComponent(val ?? e.label)}`}
                  onClick={() => leaveTopic("number", { entityId: String(val ?? e.label), entityType: val != null ? "number" : "phrase" })}
                  style={{ textDecoration: "none", display: "block", padding: "10px 13px", borderRadius: 10,
                  background: gold ? P.cardGrad : P.cardSoft,
                  border: `1px solid ${gold ? P.accent : P.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {gold && <span title="חתימת זהב">👑</span>}
                    <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700 }}>{e.metadata?.display || e.label}</span>
                    {val != null && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13 }}>= {val}{method ? ` (${method})` : ""}</span>}
                  </div>
                  {e.metadata?.claim_note && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>⚖️ {e.metadata.claim_note}</div>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔠 צפנים · ראיות ELS — צופן שמתלכד על מספר ההתכנסות (round-trip: צופן בדילוג N → מופיע כאן) */}
      <div style={{ ...box, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ciphers.length ? 10 : 6 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>🔠 צפנים · ראיות בתורה</div>
          <Link to={`/research?tool=els${hot.size ? `&skip=${[...hot][0]}` : ""}&from=topic:${encodeURIComponent(slug)}`}
            onClick={() => leaveTopic("els", { entityId: String(slug), entityType: "topic" })}
            style={{ textDecoration: "none", border: `1px solid ${P.accent}`, borderRadius: 999, background: P.glow, color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 13, padding: "7px 16px" }}>🔠 צור צופן →</Link>
        </div>
        {ciphers.length === 0 ? (
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>עדיין אין צופן שמתלכד על המספרים כאן. «צור צופן» יפתח את מנוע הדילוגים — וכשיישמר, יופיע כאן אוטומטית כראיה.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {ciphers.map(c => (
              <Link key={c.slug} to={`/codes/${encodeURIComponent(c.slug)}`}
                onClick={() => leaveTopic("els", { entityId: String(c.slug), entityType: "code" })}
                style={{ textDecoration: "none", display: "block", padding: "10px 13px", borderRadius: 10, background: P.cardSoft, border: `1px solid ${P.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>«{c.search_term || c.title}»</span>
                  <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13 }}>= {c.skip_distance} (דילוג ELS)</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 📜 גוף הכרטיס דרך ההקרנה המשותפת: רמז · ממצאים/שורות · ביטויים · חיבורים · מועמדים · הפניות · פוסטים.
          (ההסתייגות ושדות-לא-נתמכים מוצגים אחרי הגלריה — אותו סדר-עמוד כמו קודם.) */}
      <TopicConvergenceContent finding={finding} palette={P} imgs={imgs} onLeave={leaveTopic} showWithheld={isAdmin}
        exclude={["caveat", "unsupported"]} />

      {/* ✦ (הוסר בלוק-בלוק: hint/headline+bullets/rows/connections/posts — עכשיו מרונדרים מהמתאם, בלי כפילות) */}

      {/* ממצאים בגלריות — masonry, מספרים לינקים, תאריכים, lightbox מובנה */}
      {imgs.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🖼 ממצאים בגלריות ({imgs.length})</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>כל תמונה היא ממצא בציר — בסדר שמספר את הסיפור.</div>
          <RealityStream
            hints={imgs.map(im => ({ ...im, all_values: im.ocr_numbers || [], primary_value: (im.ocr_numbers || [])[0] ?? null }))}
            palette={P}
            onEdit={isAdmin ? (h => setEditImg(imgs.find(i => i.id === h.id) || h)) : undefined}
          />
        </div>
      )}

      {/* ✏️ עריכת תמונה — מנהל בלבד, גם כאן בדף ההתכנסויות (אותו מודל של הגלריות) */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onSave={saveImgEdit}
          onClose={() => setEditImg(null)}
          onDelete={id => { setImgs(prev => prev.filter(i => i.id !== id)); setEditImg(null); }}
          onRemoveFromStream={editImg.source === "update" ? async () => {
            await setImageCuration(editImg.id, { source: "manual" });
            setImgs(prev => prev.map(i => i.id === editImg.id ? { ...i, source: "manual" } : i));
            setEditImg(null);
          } : null}
        />
      )}

      {/* הסתייגות מחקרית + שדות-מקור שאינם נתמכים לתצוגה (נספרים בשם) — מאותה הקרנה */}
      <TopicConvergenceContent finding={finding} palette={P} onLeave={leaveTopic} showWithheld={isAdmin}
        only={["caveat", "unsupported"]} />

      {/* משפט הסיום — מפת הידע החיה */}
      <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 620, margin: "0 auto", fontStyle: "italic" }}>
        כאן נפגשים כל החוטים הקשורים ל{card.title}. ככל שהמאגר גדל, גם רשת הקשרים ממשיכה להתפתח ולהיחשף.
      </div>
    </div>
  );
}

function Center({ children }) {
  const P = usePalette();
  return <div style={{ direction: "rtl", textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: "120px 24px", fontSize: 16 }}>{children}</div>;
}
