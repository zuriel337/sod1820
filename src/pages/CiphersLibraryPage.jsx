import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { getSavedMatrices, getDraftMatrices, moderateMatrix, deleteMatrix } from "../lib/elsMatrices.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ShareActions from "../components/ShareActions.jsx";

// 📚 ספריית הצפנים — העדשה הקנונית על כל הצפנים המאושרים (els_records published).
// unified_graph_law: מקור אחד; כל צופן = כרטיס-תמונה שמפנה לעמוד הקנוני /codes/:slug (לא משכפל).
export default function CiphersLibraryPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  // 🗂️ תיקיית-הניהול (אדמין) — טיוטות ומוסתרים, נטענת בלחיצה
  const [drafts, setDrafts] = useState(null);   // null=לא-נטען · []=ריק · [...]=רשימה
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadDrafts = () => {
    setDraftsOpen(o => !o);
    if (drafts === null) getDraftMatrices(200).then(setDrafts).catch(() => setDrafts([]));
  };
  const publishDraft = async (m) => {
    setBusyId(m.id);
    try {
      await moderateMatrix(m.id, "published");
      setDrafts(list => (list || []).filter(x => x.id !== m.id));  // עזב את תיקיית-הניהול
      setItems(null); getSavedMatrices(200).then(setItems).catch(() => setItems([]));  // רענון הראשי
    } catch { /* ignore — נשאר בטיוטות */ }
    setBusyId(null);
  };
  // 🙈/📝 מעבר בין מוסתר לטיוטה — נשאר בתיקיית-הניהול, רק משנה סטטוס
  const setDraftStatus = async (m, status) => {
    setBusyId(m.id);
    try {
      await moderateMatrix(m.id, status);
      setDrafts(list => (list || []).map(x => x.id === m.id ? { ...x, status } : x));
    } catch { /* ignore */ }
    setBusyId(null);
  };
  // 🗑 מחיקה-לצמיתות — עם אישור כפול (לא ניתן לשחזר)
  const deleteForever = async (m) => {
    if (typeof window !== "undefined" && !window.confirm(`למחוק לצמיתות את «${m.title || m.search_term}»?\nהצופן יימחק מהמערכת ולא ניתן יהיה לשחזר אותו.`)) return;
    setBusyId(m.id);
    try {
      await deleteMatrix(m.id);
      setDrafts(list => (list || []).filter(x => x.id !== m.id));
    } catch { /* ignore */ }
    setBusyId(null);
  };

  useEffect(() => {
    track("codes-library");
    applySeo({
      title: "ספריית הצפנים — דילוגי אותיות (ELS) בתורה ובתנ״ך",
      description: "כל הצפנים שנחקרו ואומתו בסוד 1820 — דילוגי אותיות (ELS) עם המונח, הדילוג והממצאים. כל צופן בעמוד משלו, עם מחקר קהילתי ותצוגת תלת-מימד. עדות — לא ניבוי.",
      path: "/codes",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("ספריית הצפנים") + "&sub=" + encodeURIComponent("דילוגי אותיות · ELS") + "&cap=" + encodeURIComponent("כל הצפנים שנחקרו ואומתו"),
    });
  }, []);

  useEffect(() => { getSavedMatrices(200).then(setItems).catch(() => setItems([])); }, []);
  const list = items || [];

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>דילוגי אותיות · ELS</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, margin: "0 0 8px" }}>📚 ספריית הצפנים</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 580, margin: "0 auto 14px" }}>
            כל הצפנים שנחקרו ואומתו — כל אחד בעמוד משלו, עם מחקר קהילתי ותלת-מימד. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b>
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <ShareActions type="codes" url="https://sod1820.co.il/codes" title="📚 ספריית הצפנים — דילוגי אותיות בתורה · סוד 1820" />
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.onAccent, background: P.accentBtn, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 18px", minHeight: 40 }}>🔍 חפשו צופן משלכם ←</Link>
            {/* 🔬 כניסה לתיקיית-המחקר — אוסף נפרד, פתוח לכולם (לא מעורבב ברשימה הכללית) */}
            <Link to="/codes/מחקר" style={{ display: "inline-flex", alignItems: "center", color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🔬 תיקיית מחקר ←</Link>
            {/* 🗂️ תיקיית-הניהול — אדמין בלבד: טיוטות ומוסתרים */}
            {isAdmin && (
              <button onClick={loadDrafts} style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", color: "#d0a24a", border: `1px solid ${draftsOpen ? "#d0a24a" : P.border}`, background: "transparent", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>
                🗂️ טיוטות ומוסתרים {drafts?.length ? `(${drafts.length})` : ""} {draftsOpen ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>

        {/* 🗂️ תיקיית-הניהול (אדמין) — כל הטיוטות/מוסתרים, פרסום-לראשי בלחיצה */}
        {isAdmin && draftsOpen && (
          <div style={{ background: P.card, border: `1px dashed #d0a24a`, borderRadius: 14, padding: "14px 16px", margin: "0 0 20px" }}>
            <div style={{ color: "#d0a24a", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>🗂️ טיוטות ומוסתרים — לחיצה על «⬆️ לראשי» מפרסמת מיד לספרייה</div>
            {drafts === null ? (
              <div style={{ color: P.accentDim, fontFamily: F.body, padding: 14, textAlign: "center" }}>טוען…</div>
            ) : !drafts.length ? (
              <div style={{ color: P.accentDim, fontFamily: F.body, padding: 14, textAlign: "center" }}>אין טיוטות או צפנים מוסתרים.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {drafts.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: P.pageBg, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px" }}>
                    {m.image_url
                      ? <img src={m.image_url} alt="" style={{ width: 46, height: 26, objectFit: "cover", borderRadius: 5, border: `1px solid ${P.border}`, flexShrink: 0 }} />
                      : <span style={{ width: 46, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 5, background: P.cardSoft, flexShrink: 0 }}>🔠</span>}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={{ color: P.accentText, fontFamily: F.regal, fontSize: 14.5, fontWeight: 800, textDecoration: "none" }}>{m.title || m.search_term}</Link>
                      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>
                        {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · תנ״ך" : m.skip_distance ? " · תורה" : ""}
                        {" · "}<span style={{ color: m.status === "pending" ? "#d0a24a" : "#c98a7a", fontWeight: 700 }}>{m.status === "pending" ? "טיוטה" : "מוסתר"}</span>
                        {m.source && m.source !== "admin" ? ` · ${m.source}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={draftBtn(P.card, P.ink, P.border)}>✏️ ערוך</Link>
                      <button onClick={() => publishDraft(m)} disabled={busyId === m.id} style={draftBtn("#1c7a38", "#eafff0")}>
                        {busyId === m.id ? "…" : "⬆️ לראשי"}
                      </button>
                      {m.status === "pending"
                        ? <button onClick={() => setDraftStatus(m, "hidden")} disabled={busyId === m.id} style={draftBtn(P.card, P.ink, P.border)}>🙈 הסתר</button>
                        : <button onClick={() => setDraftStatus(m, "pending")} disabled={busyId === m.id} style={draftBtn(P.card, P.ink, P.border)}>📝 לטיוטה</button>}
                      <button onClick={() => deleteForever(m)} disabled={busyId === m.id} style={draftBtn("transparent", "#c0563f", "#c0563f")}>🗑 מחק לנצח</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {items === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>
        ) : !list.length ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "60px 20px", lineHeight: 1.8 }}>
            <div style={{ fontSize: 42, marginBottom: 8, opacity: 0.7 }}>🌱</div>
            עדיין אין צפנים בספרייה — היו הראשונים לחפש ולשמור צופן.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 15 }}>
            {list.map(m => (
              <Link key={m.id} to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
                style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column", transition: "border-color .15s, transform .12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; }}>
                {m.image_url ? (
                  <img src={m.image_url} alt={m.title || m.search_term} loading="lazy" style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: P.cardGrad || P.cardSoft, color: P.accentText, fontFamily: F.regal, fontSize: 22, fontWeight: 800, textAlign: "center", padding: 12 }}><img src="/els-icon.png" alt="" width="44" height="44" style={{ borderRadius: 10, objectFit: "cover" }} />{m.search_term}</div>
                )}
                <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{m.title || m.search_term}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>
                    {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
                  </div>
                  {m.positions?.quality?.stars ? (
                    <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5, letterSpacing: 0.5 }} title={m.positions.quality.verified ? "מובהקות מונטה-קרלו מדודה" : "הערכת איכות"}>
                      {"★".repeat(m.positions.quality.stars)}<span style={{ opacity: 0.3 }}>{"☆".repeat(5 - m.positions.quality.stars)}</span>
                    </div>
                  ) : null}
                  {m.author_name && <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, marginTop: "auto", paddingTop: 4 }}>✍️ {m.author_name}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// כפתור-פעולה קטן בתיקיית-הניהול (עקבי בין ✏️/⬆️/🙈/🗑)
function draftBtn(bg, color, border) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    color, background: bg, border: `1px solid ${border || bg}`, borderRadius: 999,
    fontFamily: "inherit", fontSize: 12, fontWeight: 800, padding: "7px 12px", minHeight: 36,
    textDecoration: "none", whiteSpace: "nowrap",
  };
}
