import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { setForcedMode } from "../lib/themeMode.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { stripHtml, youtubeId, youtubeUrl } from "../lib/format.js";
import Discourse from "../components/Discourse.jsx";
import CollectiveBadge from "../components/CollectiveBadge.jsx";
import { getContributionById } from "../lib/contributions.js";

// 📖 עמוד-תרומה בפורום (/forum/:id) — קריאת התרומה וחיבורה לגרף, בלי לצאת לדף-הישות.
// write-only: לא מגיבים בשרשור — מחברים דרך «🔗 מצאתי קשר» (edge). עץ אחד: שימוש חוזר ב-Discourse
// הקנוני עם focusId → הכרטיס, ריאקציות, «מצאתי קשר» ומודרציה. נפתח במצב בהיר כמו שאר הפורום.
export default function ForumThreadPage() {
  const { id } = useParams();
  const P = usePalette();
  const [c, setC] = useState(undefined); // undefined=טוען · null=לא-נמצא

  useEffect(() => { setForcedMode("light"); return () => setForcedMode(null); }, []);
  useEffect(() => {
    track("forum-thread");
    setC(undefined);
    getContributionById(id).then((x) => setC(x || null)).catch(() => setC(null));
  }, [id]);
  useEffect(() => {
    if (!c) return;
    const t = stripHtml(c.title || c.body || "דיון").slice(0, 60);
    applySeo({ title: `${t} — פורום המחקר · סוד 1820`, description: "דיון מחקר קהילתי בסוד 1820 — הצטרפו לדיון.", path: `/forum/${id}` });
  }, [c, id]);

  const wrap = { direction: "rtl", maxWidth: 780, margin: "0 auto", padding: "22px 16px 90px", position: "relative", zIndex: 1 };
  if (c === undefined) return <div style={wrap}><div style={{ textAlign: "center", padding: 60, color: P.accentDim, fontFamily: F.body }}>טוען דיון…</div></div>;
  if (!c) return (
    <div style={wrap}><div style={{ textAlign: "center", padding: "70px 20px", color: P.inkSoft, fontFamily: F.body, lineHeight: 1.9 }}>
      <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.7 }}>💬</div>
      הדיון לא נמצא, או ממתין לאישור.<br />
      <Link to="/forum" style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, textDecoration: "none" }}>← לפורום המחקר</Link>
    </div></div>
  );

  const hasTarget = !!c.target_id;
  // 🎬 קליפ מוטמע — אם גוף-התרומה מכיל קישור יוטיוב, מנגנים אותו בנגן ומסירים את ה-URL מהטקסט
  // (עץ אחד: אותו דפוס iframe קנוני כמו VideoGallery — youtube-nocookie, בלי לשכפל רכיב).
  const ytId = youtubeId(c.body || "");
  const bodyText = ytId ? stripHtml((c.body || "").replace(youtubeUrl(c.body || "") || "", "").trim()) : stripHtml(c.body || "");
  return (
    <div style={wrap}>
      <div style={{ marginBottom: 14 }}>
        <Link to="/forum" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>← פורום המחקר</Link>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(20px,4.5vw,28px)", fontWeight: 800, margin: "6px 0 2px" }}>📖 תרומת מחקר</h1>
        {hasTarget && (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5 }}>
            סביב <Link to={c.target_type === "els" ? `/codes/${encodeURIComponent(c.target_id)}` : `/number/${encodeURIComponent(c.target_id)}`} style={{ color: P.accentText, fontWeight: 700, textDecoration: "none" }}>{c.target_type === "number" ? "🔢" : c.target_type === "els" ? "🔠" : "🔖"} {c.target_id}</Link>
          </div>
        )}
      </div>
      {/* 🌳 עץ אחד — ספירת-קהילה מאוחדת (שמירות + חידושים) על ה-node, אותו רכיב כמו דף-המספר */}
      {hasTarget && <CollectiveBadge type={c.target_type} refv={c.target_id} label="את זה" />}
      {/* 🎬 נגן-וידאו מוטמע — מוצג כשגוף-התרומה מכיל קישור יוטיוב (גם עם יעד וגם בלי) */}
      {ytId && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", border: `1px solid ${P.border}`, background: "#000", marginBottom: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.35)" }}>
          <iframe title={stripHtml(c.title || "וידאו")} src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
        </div>
      )}
      {hasTarget ? (
        <Discourse target={{ type: c.target_type, id: c.target_id }} focusId={c.id} origin="forum" />
      ) : (
        <>
          {(bodyText || c.title) && (
            <div style={{ color: P.inkSoft, fontFamily: F.body, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 16, lineHeight: 1.85, whiteSpace: "pre-wrap", marginBottom: 16 }}>
              {c.title && <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{c.title}</div>}
              {bodyText}
            </div>
          )}
          {/* 💬 תגובות לפריט חסר-יעד — Discourse על יעד-פורום פר-פריט, כדי שאפשר יהיה להגיב לכל כתבה */}
          <Discourse target={{ type: "forum", id: c.id }} origin="forum" />
        </>
      )}
    </div>
  );
}
