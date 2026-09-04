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

// 📚 /codes = שער ספריית הצפנים הקנוני.
// Reference Surface #2: שפה חדשה קדימה, בלי לשכתב את כל ה-legacy.
// מקור אחד: els_records; כל כרטיס מפנה ל-/codes/:slug. /code נשאר מנוע החיפוש הקנוני היחיד.
export default function CiphersLibraryPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  const [personalItems, setPersonalItems] = useState(null);
  const [filter, setFilter] = useState("all"); // all · system · community · personal
  const [query, setQuery] = useState("");

  // 🗂️ תיקיית-הניהול (אדמין) — טיוטות ומוסתרים, נטענת בלחיצה.
  const [drafts, setDrafts] = useState(null);
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
      setDrafts(list => (list || []).filter(x => x.id !== m.id));
      setItems(null);
      getSavedMatrices(200).then(setItems).catch(() => setItems([]));
      setPersonalItems(list => (list || []).filter(x => x.id !== m.id));
    } catch { /* נשאר בתיקיית-הניהול */ }
    setBusyId(null);
  };

  const setDraftStatus = async (m, status) => {
    setBusyId(m.id);
    try {
      await moderateMatrix(m.id, status);
      setDrafts(list => (list || []).map(x => x.id === m.id ? { ...x, status } : x));
      setPersonalItems(list => (list || []).map(x => x.id === m.id ? { ...x, status } : x));
    } catch { /* ignore */ }
    setBusyId(null);
  };

  const deleteForever = async (m) => {
    if (typeof window !== "undefined" && !window.confirm(`למחוק לצמיתות את «${m.title || m.search_term}»?\nהצופן יימחק מהמערכת ולא ניתן יהיה לשחזר אותו.`)) return;
    setBusyId(m.id);
    try {
      await deleteMatrix(m.id);
      setDrafts(list => (list || []).filter(x => x.id !== m.id));
      setPersonalItems(list => (list || []).filter(x => x.id !== m.id));
    } catch { /* ignore */ }
    setBusyId(null);
  };

  useEffect(() => {
    track("codes-library");
    applySeo({
      title: "ספריית הצפנים — דילוגי אותיות (ELS) בתורה ובתנ״ך",
      description: "ספריית הצפנים של סוד 1820: צפנים שפורסמו בספרייה, חומר קהילתי וממצאים מתיקים אישיים שמסומנים בבירור כטרם אומתו. מכל צופן ממשיכים לעמוד הקנוני שלו. עדות — לא ניבוי.",
      path: "/codes",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("ספריית הצפנים") + "&sub=" + encodeURIComponent("דילוגי אותיות · ELS") + "&cap=" + encodeURIComponent("לגלות · לחפש · להמשיך למחקר"),
    });
  }, []);

  useEffect(() => {
    getSavedMatrices(200).then(setItems).catch(() => setItems([]));

    // 👤 תיק אישי: self_published=true הוא פעולה מפורשת של המשתמש — «הצג בתיק שלי».
    // legacy visibility אינו משמש כאן כציר פרסום; אימות/פרסום קנוני נשארים צירים נפרדים.
    getDraftMatrices(500)
      .then(rows => setPersonalItems((rows || []).filter(
        m => m.self_published === true && m.status !== "published"
      )))
      .catch(() => setPersonalItems([]));
  }, []);

  const list = items || [];
  const personal = personalItems || [];
  const community = list.filter(m => m.source === "community");
  const systemC = list.filter(m => m.source !== "community");

  const selected = filter === "community"
    ? community
    : filter === "system"
      ? systemC
      : filter === "personal"
        ? personal
        : list;

  const normalizedQuery = query.trim().toLowerCase();
  const shown = normalizedQuery
    ? selected.filter(m => {
        const haystack = [
          m.title,
          m.search_term,
          m.author_name,
          m.skip_distance != null ? String(m.skip_distance) : "",
          m.scope,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : selected;

  // 💎 צפנים חזקים = published list בלבד. Personal/unverified לעולם לא נכנס לרצועה.
  const strong = list
    .filter(m => { const q = m.positions?.quality; return q && ((q.stars || 0) >= 4 || q.verified); })
    .sort((a, b) => {
      const qa = a.positions.quality, qb = b.positions.quality;
      return (qb.stars - qa.stars) || ((qb.verified ? 1 : 0) - (qa.verified ? 1 : 0))
        || ((qb.rarity || 0) - (qa.rarity || 0)) || ((qb.percentile || 0) - (qa.percentile || 0));
    })
    .slice(0, 8);

  const rarityTxt = q => q && (q.rarity || q.rarityCapped)
    ? (q.rarityCapped ? `נדיר מ־1 ל־${q.trials || 400}` : `נדיר ~1 ל־${q.rarity}`)
    : (q?.verified ? "מובהקות מדודה" : "");

  const cutoff = seenCutoff("codes-community");
  useEffect(() => { if (community.length) markSeenKey("codes-community"); }, [community.length]);

  const chip = (bg, col, txt) => (
    <span style={{
      background: bg, color: col, fontFamily: F.ui, fontSize: 11, fontWeight: 700,
      borderRadius: 999, padding: "4px 9px", whiteSpace: "nowrap", lineHeight: 1.2,
    }}>{txt}</span>
  );

  const cipherCard = (m) => {
    const isPersonal = filter === "personal" || (m.self_published === true && m.status !== "published");
    const isCommunity = !isPersonal && m.source === "community";
    const fresh = isCommunity && isNewSince(m, cutoff);
    const q = m.positions?.quality;

    return (
      <Link
        key={m.id}
        to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
        style={{
          background: P.card,
          border: `1px solid ${fresh ? P.accent : P.border}`,
          borderRadius: 16,
          overflow: "hidden",
          textDecoration: "none",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          transition: "border-color .15s, transform .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = fresh ? P.accent : P.border; e.currentTarget.style.transform = "none"; }}
      >
        <div style={{ position: "relative", background: P.cardSoft }}>
          {m.image_url ? (
            <img
              src={m.image_url}
              alt={m.title || m.search_term}
              loading="lazy"
              style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 9, background: P.cardGrad || P.cardSoft,
              color: P.accentText, fontFamily: F.ui, fontSize: 20, fontWeight: 700, textAlign: "center", padding: 16,
            }}>
              <img src="/els-icon.png" alt="" width="42" height="42" style={{ borderRadius: 10, objectFit: "cover" }} />
              {m.search_term || m.title}
            </div>
          )}
          <span style={{ position: "absolute", insetInlineStart: 9, top: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isPersonal
              ? <>
                  {chip("rgba(104,78,145,.92)", "#fff", "👤 תיק אישי")}
                  {chip("rgba(36,32,43,.90)", "#f2dba1", "טרם אומת")}
                </>
              : isCommunity
                ? chip("rgba(47,109,246,.90)", "#fff", "🙋 קהילה")
                : chip("rgba(212,175,55,.92)", "#1a0e00", "✦ מערכת")}
            {fresh && chip("rgba(214,64,74,.95)", "#fff", "חדש")}
          </span>
        </div>

        <div style={{ padding: "14px 15px 15px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
          <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>
            {m.title || m.search_term}
          </div>
          <div style={{ color: P.inkSoft, fontFamily: F.ui, fontSize: 13, lineHeight: 1.55 }}>
            {m.skip_distance ? `דילוג ${m.skip_distance}` : "צופן שמור"}
            {m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
          </div>

          {!isPersonal && q?.stars ? (
            <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 12.5 }} title={q.verified ? "מובהקות מונטה-קרלו מדודה" : "הערכת איכות"}>
              {"★".repeat(q.stars)}<span style={{ opacity: 0.28 }}>{"☆".repeat(5 - q.stars)}</span>
            </div>
          ) : null}

          {isPersonal && (
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.55 }}>
              ממצא שהחוקר בחר להציג בתיק האישי שלו. טרם אומת על־ידי סוד 1820.
            </div>
          )}

          <div style={{ color: P.inkSoft, fontFamily: F.ui, fontSize: 11.5, marginTop: "auto", paddingTop: 4 }}>
            {formatDateHe(m.created_at)}
            {(isCommunity || isPersonal) && m.author_name ? ` · ${publicAuthorName(m.author_name)}` : ""}
          </div>
          <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 12.5, fontWeight: 700, paddingTop: 2 }}>
            פתח את הצופן ←
          </div>
        </div>
      </Link>
    );
  };

  const featuredCard = (m) => {
    const q = m.positions.quality;
    const rt = rarityTxt(q);
    return (
      <Link
        key={`f${m.id}`}
        to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
        style={{
          flex: "0 0 auto", width: 220, scrollSnapAlign: "start", background: P.card,
          border: `1px solid ${P.borderStrong || P.accent}`, borderRadius: 16, overflow: "hidden",
          textDecoration: "none", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ position: "relative" }}>
          {m.image_url ? (
            <img src={m.image_url} alt={m.title || m.search_term} loading="lazy"
              style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", aspectRatio: "1200 / 630", display: "flex", alignItems: "center", justifyContent: "center",
              background: P.cardSoft, color: P.accentText, fontFamily: F.ui, fontSize: 18, fontWeight: 700, textAlign: "center", padding: 12,
            }}>{m.title || m.search_term}</div>
          )}
          <span style={{
            position: "absolute", insetInlineStart: 9, top: 9, background: "rgba(212,175,55,.95)",
            color: "#1a0e00", fontFamily: F.ui, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 9px",
          }}>💎 צופן בולט</span>
        </div>
        <div style={{ padding: "12px 13px", display: "grid", gap: 5 }}>
          <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 15.5, fontWeight: 700 }}>{m.title || m.search_term}</div>
          <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 12.5 }}>
            {"★".repeat(q.stars)}<span style={{ opacity: 0.28 }}>{"☆".repeat(5 - q.stars)}</span>
          </div>
          {rt && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>{q.verified ? "🎯 " : ""}{rt}</div>}
        </div>
      </Link>
    );
  };

  const filterTabs = [
    { k: "all", label: "הכל שפורסם", n: list.length },
    { k: "system", label: "מערכת", n: systemC.length },
    { k: "community", label: "קהילה", n: community.length },
    { k: "personal", label: "תיקים אישיים", n: personal.length },
  ];

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 96px" }}>
        {/* Reference Surface #2 — היררכיה פשוטה: מה זה → מה עושים → מה כבר נמצא. */}
        <header style={{ textAlign: "center", padding: "18px 0 24px" }}>
          <div style={{ color: P.accentDim, fontFamily: F.ui, fontSize: 12.5, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            צפנים בתורה · ELS
          </div>
          <h1 style={{
            color: P.ink, fontFamily: F.ui, fontSize: "clamp(30px,5vw,46px)", fontWeight: 700,
            letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.15,
          }}>ספריית הצפנים</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16, lineHeight: 1.75, maxWidth: 700, margin: "0 auto 16px" }}>
            לגלות מה כבר נמצא, לפתוח צופן לעומק, או לצאת לחיפוש חדש בכלי הדילוגים.
            ממצאים מתיקים אישיים מוצגים בנפרד ומסומנים בבירור כאשר הם טרם אומתו.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ElsPulseChip />
            <ShareActions type="codes" url="https://sod1820.co.il/codes" title="ספריית הצפנים — דילוגי אותיות בתורה · סוד 1820" />
          </div>
        </header>

        <section aria-label="מה עושים בעולם הצפנים" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 24,
        }}>
          <Link to="/code" style={gatewayCard(P, true)}>
            <span style={gatewayIcon}>🔠</span>
            <strong style={gatewayTitle(P)}>חפש צופן חדש</strong>
            <span style={gatewayText(P)}>כלי הדילוגים החי · תורה ותנ״ך</span>
            <span style={gatewayAction(P)}>פתח את הכלי ←</span>
          </Link>

          <div style={gatewayCard(P, false)}>
            <span style={gatewayIcon}>⌘</span>
            <strong style={gatewayTitle(P)}>גלה מה כבר נמצא</strong>
            <span style={gatewayText(P)}>צפני מערכת, קהילה וממצאים מתיקים אישיים מסומנים</span>
            <span style={{ ...gatewayAction(P), opacity: 0.75 }}>אתה כאן</span>
          </div>

          <Link to="/codes/מחקר" style={gatewayCard(P, false)}>
            <span style={gatewayIcon}>🔬</span>
            <strong style={gatewayTitle(P)}>היכנס למחקר</strong>
            <span style={gatewayText(P)}>מטריצות וממצאים שנשמרו במסלול המחקר</span>
            <span style={gatewayAction(P)}>לתיקיית המחקר ←</span>
          </Link>
        </section>

        <div style={{
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 18,
          padding: "14px 14px", marginBottom: 18, display: "grid", gap: 12,
        }}>
          <label htmlFor="cipher-library-search" style={{ color: P.ink, fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>
            חיפוש בתוך הספרייה
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span aria-hidden style={{ fontSize: 18 }}>⌕</span>
            <input
              id="cipher-library-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="מילה, שם, חוקר או מספר דילוג…"
              style={{
                flex: 1, minWidth: 0, minHeight: 46, boxSizing: "border-box", borderRadius: 12,
                border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink,
                fontFamily: F.ui, fontSize: 16, padding: "10px 13px", outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          {filterTabs.map(t => {
            const on = filter === t.k;
            const disabled = t.n === 0 && t.k !== "all";
            return (
              <button
                key={t.k}
                disabled={disabled}
                onClick={disabled ? undefined : () => setFilter(t.k)}
                style={{
                  cursor: disabled ? "default" : "pointer", minHeight: 44, borderRadius: 999, padding: "8px 15px",
                  fontFamily: F.ui, fontSize: 13, fontWeight: 700,
                  border: `1px solid ${on ? P.borderStrong : P.border}`,
                  background: on ? P.cardSoft : "transparent", color: on ? P.ink : P.inkSoft,
                  opacity: disabled ? 0.42 : 1,
                }}
              >
                {t.label} <span style={{ opacity: 0.65 }}>({t.n})</span>
              </button>
            );
          })}
        </div>

        {filter === "personal" && (
          <div style={{
            maxWidth: 760, margin: "0 auto 18px", padding: "12px 14px", borderRadius: 14,
            background: P.cardSoft, border: `1px solid ${P.border}`, color: P.inkSoft,
            fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, textAlign: "center",
          }}>
            ממצאים שחברי הקהילה בחרו להציג בתיק האישי שלהם. הם מוצגים כחומר למחקר ולדיון,
            <b style={{ color: P.ink }}> טרם אומתו על־ידי סוד 1820</b> ואינם מקבלים חותמת אימות או דירוג “צופן בולט”.
          </div>
        )}

        {filter === "community" && (
          <div style={{
            maxWidth: 700, margin: "0 auto 18px", color: P.inkSoft, fontFamily: F.body,
            fontSize: 13.5, lineHeight: 1.7, textAlign: "center",
          }}>
            צפנים שפורסמו דרך מסלול הקהילה. פרסום בספרייה אינו מחליף את ציר האימות; כשיש אימות או מובהקות הם מוצגים בנפרד.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <WatchButton topic="codes:new" source="codes_library" compact icon="🧩" label="עקוב אחרי צפנים חדשים" />
        </div>

        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: draftsOpen ? 12 : 22 }}>
            <button
              onClick={loadDrafts}
              style={{
                display: "inline-flex", alignItems: "center", minHeight: 44, cursor: "pointer",
                color: P.accentText, border: `1px solid ${draftsOpen ? P.borderStrong : P.border}`,
                background: "transparent", borderRadius: 999, fontFamily: F.ui, fontSize: 12.5,
                fontWeight: 700, padding: "9px 16px",
              }}
            >
              🗂️ טיוטות ומוסתרים {drafts?.length ? `(${drafts.length})` : ""} {draftsOpen ? "▲" : "▼"}
            </button>
          </div>
        )}

        {/* Admin capability נשמרת ללא שינוי סמנטי: pending↔hidden, publish, delete. */}
        {isAdmin && draftsOpen && (
          <div style={{ background: P.card, border: `1px dashed ${P.borderStrong}`, borderRadius: 16, padding: "14px 16px", margin: "0 0 24px" }}>
            <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
              🗂️ טיוטות ומוסתרים — “לראשי” מפרסם לספרייה
            </div>
            {drafts === null ? (
              <div style={{ color: P.inkSoft, fontFamily: F.body, padding: 14, textAlign: "center" }}>טוען…</div>
            ) : !drafts.length ? (
              <div style={{ color: P.inkSoft, fontFamily: F.body, padding: 14, textAlign: "center" }}>אין טיוטות או צפנים מוסתרים.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {drafts.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: P.pageBg,
                    border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px",
                  }}>
                    {m.image_url
                      ? <img src={m.image_url} alt="" style={{ width: 46, height: 26, objectFit: "cover", borderRadius: 5, border: `1px solid ${P.border}`, flexShrink: 0 }} />
                      : <span style={{ width: 46, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 5, background: P.cardSoft, flexShrink: 0 }}>🔠</span>}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={{
                        color: P.ink, fontFamily: F.ui, fontSize: 14.5, fontWeight: 700, textDecoration: "none",
                      }}>{m.title || m.search_term}</Link>
                      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5 }}>
                        {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}
                        {m.scope === "tanakh" ? " · תנ״ך" : m.skip_distance ? " · תורה" : ""}
                        {" · "}
                        <span style={{ fontWeight: 700 }}>{m.status === "pending" ? "טיוטה" : "מוסתר"}</span>
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

        {items === null || personalItems === null ? (
          <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>
        ) : !list.length && !personal.length ? (
          <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: "60px 20px", lineHeight: 1.8 }}>
            עדיין אין צפנים להצגה. אפשר להתחיל בחיפוש חדש בכלי הדילוגים.
          </div>
        ) : (
          <>
            {filter === "all" && !normalizedQuery && strong.length >= 3 && (
              <section style={{ marginBottom: 26 }}>
                <div style={{ marginBottom: 11 }}>
                  <h2 style={{ color: P.ink, fontFamily: F.ui, fontSize: 20, fontWeight: 700, margin: "0 0 3px" }}>צפנים בולטים</h2>
                  <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, margin: 0 }}>
                    עדשה מצומצמת על צפנים שפורסמו ונושאים מדדי איכות/מובהקות קיימים.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
                  {strong.map(featuredCard)}
                </div>
              </section>
            )}

            <section>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap", marginBottom: 12 }}>
                <h2 style={{ color: P.ink, fontFamily: F.ui, fontSize: 20, fontWeight: 700, margin: 0 }}>
                  {filter === "personal" ? "תיקים אישיים" : filter === "system" ? "צפני מערכת" : filter === "community" ? "צפני הקהילה" : "כל מה שפורסם"}
                </h2>
                <span style={{ color: P.inkSoft, fontFamily: F.ui, fontSize: 12.5 }}>
                  {shown.length} תוצאות
                </span>
              </div>

              {shown.length === 0 ? (
                <div style={{ color: P.inkSoft, fontFamily: F.body, textAlign: "center", padding: "42px 20px" }}>
                  {normalizedQuery ? "לא נמצאה התאמה בחלק הזה של הספרייה." : "אין כרגע צפנים בקטגוריה זו."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
                  {shown.map(cipherCard)}
                </div>
              )}
            </section>
          </>
        )}

        <section style={{
          marginTop: 38, padding: "22px 18px", borderRadius: 18, background: P.card,
          border: `1px solid ${P.border}`, textAlign: "center",
        }}>
          <div style={{ color: P.accentDim, fontFamily: F.ui, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>
            עולם הצפנים ממשיך להיבנות
          </div>
          <h2 style={{ color: P.ink, fontFamily: F.ui, fontSize: 21, fontWeight: 700, margin: "0 0 8px" }}>
            ממטריצה בודדת למחקר שמתחבר לשאר גוף הידע
          </h2>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, maxWidth: 720, margin: "0 auto 16px" }}>
            המפה הכללית כבר מגדירה את הכיוון: צפנים יתחברו בהדרגה למילים, שמות, מספרים, פסוקים, ספרים, אנשים וקשרים —
            בלי לבנות מערכת נפרדת לכל עדשה.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {["מטריצות רב־שכבתיות · בבנייה", "מחקר עם AI · רזיאל · בבנייה", "ELS 3D · בקרוב"].map(x => (
              <span key={x} style={{
                minHeight: 36, display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 12px",
                background: P.cardSoft, border: `1px solid ${P.border}`, color: P.inkSoft,
                fontFamily: F.ui, fontSize: 12.5, fontWeight: 600,
              }}>{x}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const gatewayIcon = { fontSize: 24, lineHeight: 1 };
const gatewayTitle = P => ({ color: P.ink, fontFamily: F.ui, fontSize: 16, fontWeight: 700 });
const gatewayText = P => ({ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.6 });
const gatewayAction = P => ({ color: P.accentText, fontFamily: F.ui, fontSize: 12.5, fontWeight: 700, marginTop: "auto" });
const gatewayCard = (P, primary) => ({
  minHeight: 142, boxSizing: "border-box", padding: "17px 16px", borderRadius: 16,
  background: primary ? P.cardGrad || P.card : P.card,
  border: `1px solid ${primary ? P.borderStrong : P.border}`,
  textDecoration: "none", display: "flex", flexDirection: "column", gap: 7,
  boxShadow: primary ? "0 12px 34px rgba(0,0,0,.16)" : "none",
});

// כפתור-פעולה קטן בתיקיית-הניהול.
function draftBtn(bg, color, border) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    color, background: bg, border: `1px solid ${border || bg}`, borderRadius: 999,
    fontFamily: F.ui, fontSize: 12, fontWeight: 700, padding: "7px 12px", minHeight: 38,
    textDecoration: "none", whiteSpace: "nowrap",
  };
}
