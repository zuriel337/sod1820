import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { getSavedMatrices, getDraftMatrices, moderateMatrix, deleteMatrix } from "../lib/elsMatrices.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ShareActions from "../components/ShareActions.jsx";
import ElsPulseChip from "../components/ElsPulseChip.jsx";
import WatchButton from "../components/WatchButton.jsx";
import { formatDateHe } from "../lib/format.js";
import { publicAuthorName } from "../lib/publicIdentity.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";

// 📚 ספריית הצפנים — Projection אחד על els_records.
// published = ספריית המערכת/קהילה המאומתת לפרסום.
// self_published && status!==published = חומר מהדפים האישיים; גלוי לציבור אך מסומן במפורש "טרם אומת".
// Truth invariant: personal/self-published ≠ verified ≠ canonical ≠ published.
export default function CiphersLibraryPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  const [personalItems, setPersonalItems] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all"); // all · system · community · personal

  useEffect(() => {
    track("codes-library");
    applySeo({
      title: "ספריית הצפנים — דילוגי אותיות (ELS) בתורה ובתנ״ך",
      description: "ספריית הצפנים של סוד 1820 — צפנים שפורסמו ואומתו לפרסום, לצד חומר מחקר מהדפים האישיים שמסומן בבירור כטרם אומת. עדות — לא ניבוי.",
      path: "/codes",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("ספריית הצפנים") + "&sub=" + encodeURIComponent("דילוגי אותיות · ELS") + "&cap=" + encodeURIComponent("מאומתים + חומר מהקהילה"),
    });
  }, []);

  useEffect(() => {
    getSavedMatrices(200).then(setItems).catch(() => setItems([]));
    // אותה טבלה ואותו RLS. לציבור הפונקציה מחזירה רק rows שה-policy מתיר;
    // אצל אדמין מוחזרים יותר, ולכן מסננים כאן רק self_published שאינם published.
    getDraftMatrices(500)
      .then(rows => setPersonalItems((rows || []).filter(m => m.self_published === true && m.status !== "published")))
      .catch(() => setPersonalItems([]));
  }, []);

  const list = items || [];
  const personal = personalItems || [];
  const community = list.filter(m => m.source === "community");
  const systemC = list.filter(m => m.source !== "community");
  const shown = filter === "community" ? community
    : filter === "system" ? systemC
    : filter === "personal" ? personal
    : list;

  const cutoff = seenCutoff("codes-community");
  useEffect(() => { if (community.length) markSeenKey("codes-community"); }, [community.length]);

  // 💎 רק published יכולים להיכנס לרצועת "צפנים חזקים".
  const strong = list
    .filter(m => { const q = m.positions?.quality; return q && ((q.stars || 0) >= 4 || q.verified); })
    .sort((a, b) => {
      const qa = a.positions.quality, qb = b.positions.quality;
      return (qb.stars - qa.stars) || ((qb.verified ? 1 : 0) - (qa.verified ? 1 : 0))
        || ((qb.rarity || 0) - (qa.rarity || 0)) || ((qb.percentile || 0) - (qa.percentile || 0));
    })
    .slice(0, 10);

  const rarityTxt = q => q && (q.rarity || q.rarityCapped)
    ? (q.rarityCapped ? `נדיר מ־1 ל־${q.trials || 400}` : `נדיר ~1 ל־${q.rarity}`)
    : (q?.verified ? "מובהקות מדודה" : "");

  const chip = (bg, col, txt) => (
    <span style={{ background: bg, color: col, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{txt}</span>
  );

  const cipherCard = (m, personalCard = false) => {
    const isCommunity = m.source === "community";
    const fresh = !personalCard && isCommunity && isNewSince(m, cutoff);
    const author = m.author_name ? publicAuthorName(m.author_name) : "";
    return (
      <Link key={`${personalCard ? "p-" : ""}${m.id}`} to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
        style={{ background: P.card, border: `1px solid ${fresh ? P.accent : personalCard ? (P.borderStrong || P.border) : P.border}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column", transition: "border-color .15s, transform .12s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-3px)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = fresh ? P.accent : personalCard ? (P.borderStrong || P.border) : P.border; e.currentTarget.style.transform = "none"; }}>
        <div style={{ position: "relative" }}>
          {m.image_url ? (
            <img src={m.image_url} alt={m.title || m.search_term} loading="lazy" style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700", display: "block" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: P.cardGrad || P.cardSoft, color: P.accentText, fontFamily: F.regal, fontSize: 22, fontWeight: 800, textAlign: "center", padding: 12 }}>
              <img src="/els-icon.png" alt="" width="44" height="44" style={{ borderRadius: 10, objectFit: "cover" }} />{m.search_term}
            </div>
          )}
          <span style={{ position: "absolute", insetInlineStart: 8, top: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {personalCard ? <>
              {chip("rgba(81,87,104,.94)", "#fff", "👤 דף אישי")}
              {chip("rgba(169,91,44,.95)", "#fff", "⚠ טרם אומת")}
            </> : <>
              {isCommunity ? chip("rgba(47,109,246,.92)", "#fff", "🙋 גולש") : chip("rgba(212,175,55,.92)", "#1a0e00", "✦ מערכת")}
              {fresh && chip("rgba(214,64,74,.95)", "#fff", "🆕 חדש")}
            </>}
          </span>
        </div>
        <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{m.title || m.search_term}</div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>
            {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
          </div>
          {!personalCard && m.positions?.quality?.stars ? (
            <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5, letterSpacing: 0.5 }} title={m.positions.quality.verified ? "מובהקות מונטה-קרלו מדודה" : "הערכת איכות"}>
              {"★".repeat(m.positions.quality.stars)}<span style={{ opacity: 0.3 }}>{"☆".repeat(5 - m.positions.quality.stars)}</span>
            </div>
          ) : null}
          {personalCard && (
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.5 }}>
              חומר שפורסם בתיק האישי של החוקר · אינו נושא חותמת אימות של סוד 1820.
            </div>
          )}
          <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, marginTop: "auto", paddingTop: 4 }}>
            🕐 {formatDateHe(m.created_at)}{author ? ` · ✍️ ${author}` : ""}
          </div>
        </div>
      </Link>
    );
  };

  const featuredCard = m => {
    const q = m.positions.quality;
    const rt = rarityTxt(q);
    return (
      <Link key={`f${m.id}`} to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
        style={{ flex: "0 0 auto", width: 208, scrollSnapAlign: "start", background: P.card, border: `1px solid ${P.borderStrong || P.accent}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column", boxShadow: "0 3px 14px rgba(0,0,0,.32)" }}>
        {m.image_url ? <img src={m.image_url} alt={m.title || m.search_term} loading="lazy" style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700", display: "block" }} /> : null}
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15, fontWeight: 800 }}>💎 {m.title || m.search_term}</div>
          <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5 }}>{"★".repeat(q.stars)}<span style={{ opacity: 0.3 }}>{"☆".repeat(5 - q.stars)}</span></div>
          {rt && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>{q.verified ? "🎯 " : ""}{rt}</div>}
          <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 10.5 }}>🕐 {formatDateHe(m.created_at)}</div>
        </div>
      </Link>
    );
  };

  const loadDrafts = () => {
    setDraftsOpen(o => !o);
    if (drafts === null) getDraftMatrices(500).then(setDrafts).catch(() => setDrafts([]));
  };
  const publishDraft = async m => {
    setBusyId(m.id);
    try {
      await moderateMatrix(m.id, "published");
      setDrafts(rows => (rows || []).filter(x => x.id !== m.id));
      setPersonalItems(rows => (rows || []).filter(x => x.id !== m.id));
      getSavedMatrices(200).then(setItems).catch(() => {});
    } finally { setBusyId(null); }
  };
  const setDraftStatus = async (m, status) => {
    setBusyId(m.id);
    try {
      await moderateMatrix(m.id, status);
      setDrafts(rows => (rows || []).map(x => x.id === m.id ? { ...x, status } : x));
      setPersonalItems(rows => (rows || []).map(x => x.id === m.id ? { ...x, status } : x));
    } finally { setBusyId(null); }
  };
  const deleteForever = async m => {
    if (typeof window !== "undefined" && !window.confirm(`למחוק לצמיתות את «${m.title || m.search_term}»?\nהצופן יימחק מהמערכת ולא ניתן יהיה לשחזר אותו.`)) return;
    setBusyId(m.id);
    try {
      await deleteMatrix(m.id);
      setDrafts(rows => (rows || []).filter(x => x.id !== m.id));
      setPersonalItems(rows => (rows || []).filter(x => x.id !== m.id));
    } finally { setBusyId(null); }
  };

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, marginBottom: 6 }}>דילוגי אותיות · ELS</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, margin: "0 0 8px" }}>📚 ספריית הצפנים</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 650, margin: "0 auto 14px" }}>
            צפנים שפורסמו בסוד 1820, ולצדם חומר מהדפים האישיים של חברי הקהילה. חומר אישי מסומן תמיד כ־<b style={{ color: P.accentText }}>טרם אומת</b>. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b>
          </p>
          <div style={{ marginBottom: 12 }}><ElsPulseChip /></div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <ShareActions type="codes" url="https://sod1820.co.il/codes" title="📚 ספריית הצפנים — דילוגי אותיות בתורה · סוד 1820" />
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.onAccent, background: P.accentBtn, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 18px", minHeight: 40 }}>🔍 חפשו צופן משלכם ←</Link>
            <Link to="/codes/מחקר" style={{ display: "inline-flex", alignItems: "center", color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🔬 תיקיית מחקר ←</Link>
            {isAdmin && <button onClick={loadDrafts} style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", color: "#d0a24a", border: `1px solid ${draftsOpen ? "#d0a24a" : P.border}`, background: "transparent", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🗂️ ניהול טיוטות {draftsOpen ? "▲" : "▼"}</button>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <WatchButton topic="codes:new" source="codes_library" compact icon="🧩" label="עקוב אחרי צפנים חדשים" />
        </div>

        {isAdmin && draftsOpen && (
          <div style={{ background: P.card, border: `1px dashed #d0a24a`, borderRadius: 14, padding: "14px 16px", margin: "0 0 20px" }}>
            <div style={{ color: "#d0a24a", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>🗂️ ניהול טיוטות ומוסתרים — פעולות אדמין בלבד</div>
            {drafts === null ? <div style={{ color: P.accentDim, padding: 14, textAlign: "center" }}>טוען…</div> : !drafts.length ? <div style={{ color: P.accentDim, padding: 14, textAlign: "center" }}>אין טיוטות או מוסתרים.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {drafts.map(m => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: P.pageBg, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px" }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={{ color: P.accentText, fontFamily: F.regal, fontWeight: 800, textDecoration: "none" }}>{m.title || m.search_term}</Link>
                    <div style={{ color: P.accentDim, fontSize: 11.5 }}>{m.status} {m.self_published ? "· 👤 בתיק אישי" : ""}</div>
                  </div>
                  <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={draftBtn(P.card, P.ink, P.border)}>✏️ ערוך</Link>
                  <button onClick={() => publishDraft(m)} disabled={busyId === m.id} style={draftBtn("#1c7a38", "#eafff0")}>⬆️ לראשי</button>
                  {m.status === "hidden" ? <button onClick={() => setDraftStatus(m, "draft")} disabled={busyId === m.id} style={draftBtn(P.card, P.ink, P.border)}>📝 לטיוטה</button> : <button onClick={() => setDraftStatus(m, "hidden")} disabled={busyId === m.id} style={draftBtn(P.card, P.ink, P.border)}>🙈 הסתר</button>}
                  <button onClick={() => deleteForever(m)} disabled={busyId === m.id} style={draftBtn("transparent", "#c0563f", "#c0563f")}>🗑 מחק לנצח</button>
                </div>)}
              </div>
            )}
          </div>
        )}

        {items === null || personalItems === null ? <div style={{ color: P.accentDim, textAlign: "center", padding: 50 }}>טוען…</div> : <>
          {filter === "all" && strong.length >= 3 && <section style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 10 }}><span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>💎 צפנים חזקים</span><span style={{ color: P.inkSoft, fontSize: 12.5 }}>מתוך החומר שפורסם בלבד</span></div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>{strong.map(featuredCard)}</div>
          </section>}

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { k: "all", label: "הכל שפורסם", n: list.length },
              { k: "system", label: "✦ מערכת", n: systemC.length },
              { k: "community", label: "🙋 גולשים", n: community.length },
              { k: "personal", label: "👤 מהדפים האישיים", n: personal.length },
            ].map(t => {
              const on = filter === t.k, disabled = t.n === 0;
              return <button key={t.k} disabled={disabled} onClick={() => !disabled && setFilter(t.k)} style={{ cursor: disabled ? "default" : "pointer", borderRadius: 999, padding: "6px 15px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, border: `1px solid ${on ? P.borderStrong : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent", color: on ? P.accentText : P.accentDim, opacity: disabled ? 0.4 : 1 }}>{t.label} <span style={{ opacity: 0.7, fontSize: 11.5 }}>({t.n})</span></button>;
            })}
          </div>

          {filter === "community" && <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, textAlign: "center", margin: "-4px auto 16px", maxWidth: 650 }}>צפנים מהקהילה שכבר עברו למסלול הפרסום של הספרייה. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b></p>}
          {filter === "personal" && <div style={{ background: P.card, border: `1px solid ${P.borderStrong || P.border}`, borderRadius: 14, padding: "12px 16px", margin: "0 auto 18px", maxWidth: 760, color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, textAlign: "center" }}>
            <b style={{ color: P.accentText }}>👤 צפנים מהדפים האישיים</b><br />אלה צפנים שחברי הקהילה בחרו להציג בתיק האישי שלהם. הם חומר למחקר ולדיון, <b style={{ color: P.accentText }}>טרם אומתו על־ידי סוד 1820 ואינם מקבלים חותמת אימות או דירוג “צופן חזק”.</b>
          </div>}

          {shown.length === 0 ? <div style={{ color: P.accentDim, textAlign: "center", padding: "40px 20px" }}>אין צפנים בקטגוריה זו.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 15 }}>{shown.map(m => cipherCard(m, filter === "personal"))}</div>}
        </>}
      </div>
    </div>
  );
}

function draftBtn(bg, color, border) {
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color, background: bg, border: `1px solid ${border || bg}`, borderRadius: 999, fontFamily: "inherit", fontSize: 12, fontWeight: 800, padding: "7px 12px", minHeight: 36, textDecoration: "none", whiteSpace: "nowrap" };
}
