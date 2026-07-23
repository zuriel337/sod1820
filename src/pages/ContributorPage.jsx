import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { PALETTES, PaletteProvider } from "../lib/palette.js";
import { supabase, getUpdatesByReporterNames } from "../lib/supabase.js";
import { thumb, galThumb } from "../lib/img.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QuickActions from "../components/QuickActions.jsx";
import ShareActions from "../components/ShareActions.jsx";
import ResearcherProfile from "../components/ResearcherProfile.jsx";
import DossierExtras from "../components/dossier/DossierExtras.jsx";
import { genAvatar } from "../lib/avatar.js";
import DossierOnboarding from "../components/dossier/DossierOnboarding.jsx";
import Discourse from "../components/Discourse.jsx";
import { applySeo } from "../lib/seo.js";
import { timeAgoHe, stripHtml } from "../lib/format.js";
import { BRANDS, isVideoUrl, UpdateModal } from "../components/BrandTicker.jsx";

// הסתרת-כרטיסים פר-משתמש (מקומי; מסונכרן דרך saved כשמעבירים למחקר)
const HIDE_KEY = "sod_hidden_contrib_cards_v1";
function loadHidden() { try { return new Set(JSON.parse(localStorage.getItem(HIDE_KEY)) || []); } catch { return new Set(); } }
function saveHidden(s) { try { localStorage.setItem(HIDE_KEY, JSON.stringify([...s])); } catch { /* noop */ } }

// 👤 דף תורם/חוקר — /community/:slug (identity_architecture_law · research_gold_hints_law)
// מרנדר את contributors.media: כרטיסי-זהב בסטייג׳, דייג׳סט, קטגוריות. עדשה על מקור אחד — לא עותק.
const CAT_LABELS = {
  "identity-888": "👑 זהות · 888",
  "hebrew-gematria": "🔤 גימטריה עברית",
  "languages": "🌍 שפות",
  "calculator": "🧮 מחשבון",
  "verses": "📖 פסוקים",
  "english": "🇺🇸 אנגלית",
  "reality": "🌊 מציאות",
  "number-pattern": "🔢 תבניות",
  "signature-verse": "✍️ חתימה",
};

// חילוץ הביטויים העבריים מתוך ה-claims ("ישועת אלהינו=888" → "ישועת אלהינו") לקידום לרשימה הכללית
function claimPhrases(claims) {
  return [...new Set((claims || []).map(c => (c.split("=")[0] || "").trim()).filter(p => /[א-ת]/.test(p) && p.length <= 60))];
}

// המספר שבסוף claim ("ישועת אלהינו=888" → 888) — ללחיצת-סינון
function claimNumber(c) { const m = String(c).match(/=\s*(\d+)\s*$/); return m ? m[1] : null; }

function Card({ e, P, slug, user, isAdmin, onHide, onPromote, onNumClick }) {
  const [open, setOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(null);
  const claims = e.claims || (e.values ? Object.entries(e.values).map(([k, v]) => `${k}=${v}`) : []);
  const cardId = `contrib-${slug}-${e.f || e.msg_id || e.title}`;
  const approved = e.status === "approved" || promoted?.ok;
  async function promote() {
    setPromoting(true);
    try { setPromoted(await onPromote(e.f || e.msg_id, claimPhrases(claims))); }
    finally { setPromoting(false); }
  }
  // ישות קנונית ל-Research Bus — «העבר לממצא אישי» = ➕ הוסף למחקר / ⭐ שמור
  const entity = {
    id: cardId, type: "hint-card",
    title: e.title || e.txt || `כרטיס של ${slug}`,
    image: e.url, claims, source: e.source, contributor: slug,
  };
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", breakInside: "avoid", marginBottom: 12 }}>
      {e.url && (
        <img src={thumb(e.url, 560)} alt={e.title || e.txt || ""} loading="lazy" decoding="async"
          onClick={() => setOpen(o => !o)}
          style={{ width: "100%", display: "block", cursor: "zoom-in", maxHeight: open ? "none" : 340, objectFit: open ? "contain" : "cover" }} />
      )}
      <div style={{ padding: "10px 12px", display: "grid", gap: 6 }}>
        {(e.title || e.txt) && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.55 }}>{e.title || e.txt}</div>}
        {claims.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {claims.slice(0, 6).map((c, i) => {
              const n = claimNumber(c);
              return (
                <button key={i} onClick={() => n && onNumClick(n)} disabled={!n}
                  title={n ? `הצג את כל הכרטיסים של הכותב עם ${n}` : undefined}
                  style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 8, padding: "2px 8px",
                    fontFamily: F.mono, fontSize: 11.5, direction: "ltr", cursor: n ? "pointer" : "default" }}>
                  {c}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {e.verified && <span style={{ color: "#2e9e5b", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>✓ מאומת במנוע</span>}
          {e.sensitive && <span style={{ color: "#c46a5a", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }} title="מוסתר מהציבור — אדמין בלבד">🔒 רגיש</span>}
          {approved
            ? <span style={{ color: "#2e9e5b", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>👑 ברשימה הכללית</span>
            : e.status === "pending-review" && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>🔬 חומר-מחקר</span>}
          {e.d && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, marginInlineStart: "auto" }}>{e.d}</span>}
        </div>
        {/* מחובר בלבד: הפעולות הקנוניות (➕ למחקר האישי · ⭐ שמור · שתף · AI) + הסתרה */}
        {user && (
          <QuickActions entity={entity} style={{ marginTop: 4 }}
            extra={<>
              <button onClick={() => onHide(cardId)} title="הסתר את הכרטיס הזה אצלי">🙈 הסתר</button>
              {/* 👑 אדמין בלבד — קידום הביטויים לרשימה הכללית (מוגן גם בשרת) */}
              {isAdmin && !approved && claimPhrases(claims).length > 0 && (
                <button onClick={promote} disabled={promoting} style={{ borderColor: "#c9a227" }}
                  title={`יוסיף לרשימה הכללית: ${claimPhrases(claims).join(" · ")}`}>
                  {promoting ? "מעביר…" : "👑 אשר לרשימה הכללית"}
                </button>
              )}
            </>} />
        )}
        {promoted && !promoted.ok && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 11 }}>שגיאה: {promoted.error || "נסה שוב"}</div>}
        {promoted?.ok && <div style={{ color: "#2e9e5b", fontFamily: F.body, fontSize: 11 }}>נוספו {promoted.added} ביטויים ({promoted.skipped_existing} כבר היו)</div>}
      </div>
    </div>
  );
}

export default function ContributorPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  // 📁 תיק המחקר = סביבת-מחקר → בהיר-נקי תמיד (research_workspace_law), כמו בית המדרש.
  const P = PALETTES.lab;
  const { user, isAdmin, loading: authLoading } = useAuth(); // isAdmin: הכפתור מוצג רק לאדמין; השרת אוכף שוב בכל קריאה
  const [c, setC] = useState(null);
  const [err, setErr] = useState(false);
  const [lightName, setLightName] = useState(null);   // 👤 שם לפרופיל-חוקר קל (כשאין שורת-contributor אצורה)
  const [cat, setCat] = useState("all");
  const [limit, setLimit] = useState(24);
  const [hidden, setHidden] = useState(loadHidden);
  const [q, setQ] = useState("");
  const hide = useCallback((id) => setHidden(h => { const n = new Set(h); n.add(id); saveHidden(n); return n; }), []);
  const unhideAll = useCallback(() => { setHidden(new Set()); saveHidden(new Set()); }, []);
  const onPromote = useCallback(async (cardKey, phrases) => {
    try {
      const { data, error } = await supabase.rpc("admin_promote_contrib_card", { p_slug: slug, p_card_key: cardKey, p_phrases: phrases });
      return error ? { ok: false, error: error.message } : data;
    } catch { return { ok: false, error: "network" }; }
  }, [slug]);

  const [posts, setPosts] = useState([]);
  const [dossierCount, setDossierCount] = useState(null);   // כמות הצפנים בתיק (לשומר-האיכות-הרך של SEO)
  const [showOnboard, setShowOnboard] = useState(false);    // 🧙 אשף הכנת-תיק (כניסה ראשונה של הבעלים)
  const [tagged, setTagged] = useState([]);       // 📌 פוסטים המתויגים בשמו (מופיע בהם, לא בהכרח כתב)
  const [convergences, setConvergences] = useState([]); // 🎯 ההתכנסויות שלו (topic_cards)
  const [waUpdates, setWaUpdates] = useState([]); // 📡 העדכונים החיים שלו מהוואטסאפ (channel_updates לפי credit)
  const [waLb, setWaLb] = useState(null);         // מסך-ידיעה לעדכון שנבחר
  // כתב עם feature_media (ציון) — התמונות מודגשות בראש, אז המקטע התחתון מציג רק עדכוני-טקסט (בלי כפילות)
  const feedUpdates = (c?.feature_media ? waUpdates.filter(u => !u.image_url) : waUpdates);
  // 🔑 שער-סיסמה (locked): לכולם, אימות בשרת (contrib_unlock) — הסיסמה לא נחשפת ב-API.
  const [unlocked, setUnlocked] = useState(() => { try { return sessionStorage.getItem(`sod_unlock_${slug}`) === "1"; } catch { return false; } });
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const tryUnlock = useCallback(async (e) => {
    e?.preventDefault?.();
    setPwErr(false);
    try {
      const { data } = await supabase.rpc("contrib_unlock", { p_key: slug, p_code: pw.trim() });
      if (data === true) { try { sessionStorage.setItem(`sod_unlock_${slug}`, "1"); } catch { /* noop */ } setUnlocked(true); }
      else setPwErr(true);
    } catch { setPwErr(true); }
  }, [slug, pw]);

  useEffect(() => {
    let alive = true;
    setC(null); setErr(false); setLightName(null);   // איפוס בין slugs (כולל מעבר אצור↔קל)
    // כתובת קנונית לפי קוד-מספר (למשל 888) או slug — הקוד עדיף (בלי שמות-אנשים בכתובת)
    // ⛔ wa_names מוסר מהשליפה הציבורית (עמודה רגישה, חסומה ל-anon; הקוד נופל ל-display_name בלבד).
    // 📁 slug="me" → התיק של המשתמש המחובר (resolved לפי user_id, ואז ניווט לכתובת הקנונית).
    const cols = "slug,code,display_name,role,bio,notes,vip,media,avatar_url,locked,building,tags,feature_media,user_id,merged_into,dossier_settings,created_at";
    const resolveMe = slug === "me";
    // 📁 «me» = התיק שלי. מחכים שהאימות ייטען; לא-מחובר → כניסה. אין תיק עדיין → יוצרים ומנווטים.
    if (resolveMe && authLoading) return;
    if (resolveMe && !user?.id) { nav("/login", { replace: true }); return; }
    const q = resolveMe
      ? supabase.from("contributors").select(cols).eq("user_id", user.id).maybeSingle()
      : supabase.from("contributors").select(cols).or(`code.eq.${slug},slug.eq.${slug}`).maybeSingle();
    q.then(({ data, error }) => {
        if (!alive) return;
        if (error) { setErr(true); return; }
        if (!data) {
          // 📁 «me» בלי תיק → יוצרים תיק (update_my_dossier יוצר-אוטומטית) ומנווטים לכתובת הקנונית.
          if (resolveMe) {
            supabase.rpc("update_my_dossier", { p_settings: {} })
              .then(({ data: r }) => { if (!alive) return; if (r?.slug) nav(`/community/researcher/${r.slug}`, { replace: true }); else setErr(true); })
              .catch(() => alive && setErr(true));
            return;
          }
          // אין שורת-תיק אצורה → פרופיל-חוקר קל לפי שם (identity_architecture_law)
          let nm = slug; try { nm = decodeURIComponent(slug); } catch { /* raw */ } setLightName(nm); return;
        }
        // me → נווט לכתובת הקנונית (URL נקי, deep-link יציב)
        if (resolveMe && data.slug && data.slug !== "me") { nav(`/community/researcher/${data.slug}`, { replace: true }); return; }
        // 🌳 עץ אחד: דף-כותב שאוחד → הפניה לעמוד הקנוני
        if (data.merged_into && data.merged_into !== slug) { nav(`/community/researcher/${data.merged_into}`, { replace: true }); return; }
        setC(data);
      })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [slug, nav, user, authLoading]);

  // 🌳 דרגת-החוקר שלו (מנוע-הגדילה) — מוצג כתג בדף. ציבורי (research_level_of).
  const [level, setLevel] = useState(null);
  useEffect(() => {
    if (!c?.user_id) return;
    let alive = true;
    supabase.rpc("research_level_of", { p_user: c.user_id })
      .then(({ data }) => { if (alive) setLevel(data || null); }).catch(() => {});
    return () => { alive = false; };
  }, [c?.user_id]);

  // נעול / בבנייה / לא-רשום/פרטי / תיק-ריק → לא נכנס לאינדקס.
  // שומר-איכות רך (researcher_dossier_law): תיק בלי צפנים/מדיה/מחקרים = noindex עד שיש תוכן —
  // פתיחות לכולם בלי להציף את גוגל באלפי דפים-דלים. (אין סף-דרגה — «חוקר»=תג-כבוד בלבד.)
  useEffect(() => {
    const vis = c?.dossier_settings?.visibility || "public";
    const mediaCount = Array.isArray(c?.media) ? c.media.length : 0;
    const hasContent = (dossierCount || 0) > 0 || mediaCount > 0 || posts.length > 0;
    if (!c?.locked && !c?.building && vis === "public" && hasContent) return;
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex";
    document.head.appendChild(m);
    return () => { try { document.head.removeChild(m); } catch { /* noop */ } };
  }, [c?.locked, c?.building, c?.dossier_settings?.visibility, c?.media, dossierCount, posts.length]);

  // 📝 הפוסטים על שמו — עדשה על posts. כולל פוסטים שכתב (author) וגם שהשתתף בהם (authors[]).
  // «participated» = הכתב הראשי הוא מישהו אחר → מסומן «בהשתתפות».
  useEffect(() => {
    if (!c?.display_name) return;
    const name = c.display_name;
    let alive = true;
    Promise.all([
      supabase.from("posts").select("slug,title,date,image_url,thumb_url,author").eq("author", name).order("date", { ascending: false }).limit(40),
      supabase.from("posts").select("slug,title,date,image_url,thumb_url,author").contains("authors", [name]).order("date", { ascending: false }).limit(40),
    ]).then(([a, b]) => {
      if (!alive) return;
      const bySlug = new Map();
      [...(a.data || []), ...(b.data || [])].forEach(p => { if (!bySlug.has(p.slug)) bySlug.set(p.slug, { ...p, participated: p.author !== name }); });
      const merged = [...bySlug.values()].sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")));
      setPosts(merged);
    }).catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name]);

  // 📡 העדכונים החיים שלו — עדשה על channel_updates לפי credit=display_name (עץ אחד, לא עותק)
  useEffect(() => {
    if (!c?.display_name) { setWaUpdates([]); return; }
    let alive = true;
    const names = [c.display_name, ...(Array.isArray(c.wa_names) ? c.wa_names : [])];
    getUpdatesByReporterNames(names, 60)
      .then(r => { if (alive) setWaUpdates(Array.isArray(r) ? r : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name, c?.wa_names]);

  // 📌 תיוגים + 🎯 התכנסויות — עדשה על posts.tags / topic_cards.search_terms לפי contributor.tags.
  // עץ אחד: לא עותק — מצביע לפוסט הקנוני ולעמוד ההתכנסות (/topic/:slug).
  useEffect(() => {
    const tags = Array.isArray(c?.tags) ? c.tags.filter(Boolean) : [];
    if (!tags.length) { setTagged([]); setConvergences([]); return; }
    let alive = true;
    supabase.from("posts").select("slug,title,date,image_url,thumb_url,author")
      .overlaps("tags", tags).order("date", { ascending: false }).limit(60)
      .then(({ data }) => { if (alive && Array.isArray(data)) setTagged(data); })
      .catch(() => {});
    supabase.from("topic_cards").select("slug,title,subtitle,occurred_at,highlight_numbers,numbers")
      .eq("status", "approved").overlaps("search_terms", tags)
      .order("occurred_at", { ascending: false, nullsFirst: false }).limit(24)
      .then(({ data }) => { if (alive && Array.isArray(data)) setConvergences(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.tags]);


  // SEO קנוני לדף דינמי (כמו EntityPage/TopicPage) — כותרת + קנוניקל לפי החוקר
  useEffect(() => {
    if (!c) return;
    const firstImg = (Array.isArray(c.media) ? c.media : []).find(e => e.url)?.url;
    applySeo({
      title: `${c.display_name} — דף חוקר`,
      description: `הגילויים, האוצרות והרמזים של ${c.display_name} · ${c.role || "חוקר"} · סוד 1820`,
      path: `/community/researcher/${c.code || c.slug}`,
      image: firstImg,
    });
  }, [c]);

  // 🧙 כניסה ראשונה של הבעלים לתיק (בלי onboarded) → אשף הכנת-תיק במקום דף ריק
  useEffect(() => {
    if (c && user?.id && c.user_id === user.id && !(c.dossier_settings?.onboarded)) setShowOnboard(true);
    else setShowOnboard(false);
  }, [c, user]);

  const media = useMemo(() => (Array.isArray(c?.media) ? c.media : []), [c]);
  const digest = media.find(e => e.kind === "digest");
  const header = media.find(e => e.kind === "scan-header");
  const items = media.filter(e => e.kind !== "digest" && e.kind !== "scan-header");
  const cats = useMemo(() => {
    const s = new Map();
    (isAdmin ? items : items.filter(x => !x.sensitive)).forEach(e => { const k = e.category || "אחר"; s.set(k, (s.get(k) || 0) + 1); });
    return [...s.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, isAdmin]);
  // 🔒 תוכן רגיש (סומן בדאטה) — מוסתר מהציבור; אדמין רואה עם תג
  const sensitiveCount = items.filter(e => e.sensitive).length;
  const safeItems = isAdmin ? items : items.filter(e => !e.sensitive);
  // 🏆 הטופ של החוקר — רק כרטיסים שסומנו top_rank (החלטת צוריאל, פר-חוקר; לא באתר הכללי)
  const topGold = safeItems.filter(e => e.top_rank).sort((a, b) => a.top_rank - b.top_rank);
  const topKeys = new Set(topGold.map(e => e.f || e.msg_id));
  const visible = safeItems.filter(e => !hidden.has(`contrib-${slug}-${e.f || e.msg_id || e.title}`) && !topKeys.has(e.f || e.msg_id));
  // 🔎 חיפוש בתוך הדף: מספר → התאמת מספר-שלם בכל השיטות/הכרטיסים; טקסט → הכלה חופשית
  const nq = q.trim();
  const isNum = /^\d+$/.test(nq);
  const numRe = useMemo(() => (isNum ? new RegExp(`(^|[^\\d])${nq}([^\\d]|$)`) : null), [nq, isNum]);
  const matchQ = useCallback((e) => {
    if (!nq) return true;
    const hay = [e.title, e.txt, ...(e.claims || []), ...(e.values ? Object.entries(e.values).map(([k, v]) => `${k}=${v}`) : [])].filter(Boolean).join(" | ");
    return isNum ? numRe.test(hay) : hay.includes(nq);
  }, [nq, isNum, numRe]);
  const searched = visible.filter(matchQ);
  const shown = (cat === "all" ? searched : searched.filter(e => (e.category || "אחר") === cat)).slice(0, limit);
  const totalInCat = cat === "all" ? searched.length : searched.filter(e => (e.category || "אחר") === cat).length;
  const hiddenCount = safeItems.filter(e => !topKeys.has(e.f || e.msg_id)).length - visible.length;

  // רקע-דף קנוני (light_mode_background_law): בבהיר — רקע אטום (קרם) מתחת לתוכן,
  // בכהה — שקוף (הקוסמוס נשאר). לעולם לא נשענים על תמונת-הרקע של האתר בבהיר.
  const pageWrap = { background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };

  // 👤 אין שורת-contributor אצורה → פרופיל-חוקר קל לפי שם. onNotFound (אין חידושים) → נופל לשגיאה.
  if (!c && lightName) return <ResearcherProfile name={lightName} onNotFound={() => { setLightName(null); setErr(true); }} />;
  if (err) return <div style={pageWrap}><div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>החוקר לא נמצא.</div></div>;
  if (!c) return <div style={pageWrap}><div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>טוען…</div></div>;

  // 🚧 דף בבנייה — placeholder בלבד, התוכן חסום (building)
  if (c.building) return (
    <div style={pageWrap}>
      <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "90px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🚧</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 26, fontWeight: 800 }}>{c.vip ? "👑 " : ""}{c.display_name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "12px 0 20px" }}>
          הדף בבנייה — בקרוב ייחשפו כאן הגילויים והרמזים.
        </div>
        <a href="/community/researchers" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "10px 18px" }}>
          📜 כל הכתבים ←
        </a>
      </div>
    </div>
  );

  // 🔑 דף נעול וטרם נפתח — שער-הסיסמה (לכולם)
  if (c.locked && !unlocked) return (
    <div style={pageWrap}>
      <div style={{ direction: "rtl", maxWidth: 420, margin: "0 auto", padding: "80px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🔑</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800 }}>{c.vip ? "👑 " : ""}{c.display_name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, margin: "10px 0 18px" }}>
          הדף הזה פתוח למוזמנים — הזינו את קוד-הכניסה.
        </div>
        <form onSubmit={tryUnlock} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input value={pw} onChange={e => { setPw(e.target.value); setPwErr(false); }} inputMode="numeric" autoFocus
            placeholder="קוד" dir="auto"
            style={{ width: 130, textAlign: "center", padding: "12px", borderRadius: 12, background: P.cardSoft, border: `1.5px solid ${pwErr ? "#c0564a" : P.border}`, color: P.ink, fontFamily: F.mono, fontSize: 15, letterSpacing: pw ? 3 : 0, outline: "none" }} />
          <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 12, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "0 22px" }}>כניסה</button>
        </form>
        {pwErr && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12.5, marginTop: 10 }}>קוד שגוי — נסו שוב</div>}
      </div>
    </div>
  );

  const isOwner = !!(user?.id && c.user_id && user.id === c.user_id);
  const vis = c?.dossier_settings?.visibility || "public";
  // 🔒 תיק פרטי — רק הבעלים/אדמין רואים
  if (vis === "private" && !isOwner && !isAdmin) return (
    <div style={pageWrap}>
      <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "90px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 46, marginBottom: 12 }}>🔒</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800 }}>תיק מחקר פרטי</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, margin: "12px 0 20px" }}>החוקר בחר לשמור את התיק הזה פרטי כרגע.</div>
        <a href="/community/researchers" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "10px 18px" }}>📜 כל הכתבים ←</a>
      </div>
    </div>
  );

  return (
    <PaletteProvider value={PALETTES.lab}>
    <div style={pageWrap}>
    {showOnboard && (
      <DossierOnboarding P={P} name={c.display_name}
        onSkip={() => setShowOnboard(false)}
        onDone={(s) => { setShowOnboard(false); setC(prev => prev ? { ...prev, dossier_settings: { ...(prev.dossier_settings || {}), ...s } } : prev); }} />
    )}
    <div style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <img src={c.avatar_url || genAvatar(c.display_name)} alt={c.display_name} loading="lazy"
          style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${P.accent}`, boxShadow: `0 6px 22px ${P.glow}`, marginBottom: 10 }} />
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,34px)", fontWeight: 800 }}>
          {c.vip ? "👑 " : ""}{c.display_name}
        </div>
        {c.role && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginTop: 4 }}>{c.role}</div>}
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 6, maxWidth: 460, marginInline: "auto", lineHeight: 1.5 }}>כל הגילויים, החידושים והקשרים שנאספו לאורך הדרך.</div>
        {/* 🌳 דרגת-החוקר — מנוע-הגדילה */}
        {level?.level && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 14px" }}>
            <span style={{ fontSize: 16 }}>{["🌱", "🌿", "🔬", "🎓", "👑"][level.level - 1] || "🌱"}</span>
            <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>{level.label}</span>
            <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>
              {[level.posts > 0 ? `📝 ${level.posts}` : null, level.whatsapp > 0 ? `💬 ${level.whatsapp.toLocaleString("he-IL")}` : null].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}
        {header?.stats && (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>
            📚 {header.title} · {header.stats.images_scanned?.toLocaleString()} תמונות נסרקו · <b style={{ color: P.accentText }}>{header.stats.gold} זהב</b>
          </div>
        )}
        {/* 🔗 שיתוף הדף — רכיב-השיתוף הקנוני (canonical_ui_components_law) */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <ShareActions type="researcher"
            url={`https://sod1820.co.il/community/researcher/${c?.code || c?.slug || slug}`}
            title={`${c?.display_name || "חוקר"} — דף חוקר · סוד 1820`}
            image={(Array.isArray(c?.media) ? c.media.find(e => e.url)?.url : undefined)} />
          <a href="/community/researchers" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>
            📜 כל הכתבים ←
          </a>
        </div>
      </div>

      {/* 📁 אזורי תיק-המחקר (researcher_dossier_law) — כרגע-אני-חוקר · השפעה · תחומים · צפנים · יומן. המחקר במרכז. */}
      <DossierExtras P={P} c={c} level={level} isOwner={!!(user?.id && c.user_id && user.id === c.user_id)} onCount={setDossierCount} />

      {/* 🎨 גלריה מודגשת בראש — כתב עם feature_media (contributor_featured_media_law · כרגע ציון). תמונות+טקסט ראשונים למעלה. */}
      {c.feature_media && waUpdates.filter(u => u.image_url).length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
            🎨 הכרטיסים של {c.display_name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {waUpdates.filter(u => u.image_url).map(u => {
              const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
              return (
                <div key={u.id} onClick={() => setWaLb(u)} title="לחצו לפתיחה" style={{ cursor: "pointer", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <img src={galThumb(u, 460)} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block", background: "#0a0710" }} />
                  {showTxt && <div style={{ padding: "10px 12px", color: P.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.text}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
        </div>
      )}

      {/* אימותי-מנוע מהסריקה */}
      {header?.engine_verified && (
        <div style={{ background: P.surface, border: `1.5px solid ${P.borderStrong}`, borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>🔢 עובדות שאומתו במנוע</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {header.engine_verified.map((v, i) => (
              <span key={i} style={{ color: P.ink, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.body, fontSize: 12 }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* 📡 העדכונים החיים שלו — מהוואטסאפ (channel_updates לפי שמו). עץ אחד: אותו מקור של הטיקר. */}
      {feedUpdates.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>
            📡 העדכונים החיים של {c.display_name}
          </div>
          <div style={{ color: "#25d366", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
            💬 {feedUpdates.length} עדכונים · לייב מהוואטסאפ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, alignItems: "start" }}>
            {feedUpdates.map(u => {
              const b = BRANDS[u.channel] || BRANDS["reality-code"];
              const vid = u.image_url && isVideoUrl(u.image_url);
              const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
              return (
                <div key={u.id} onClick={() => setWaLb(u)} title="לחצו לפתיחה במסך מלא"
                  style={{ display: "flex", flexDirection: "column", background: P.card, border: `1px solid ${P.border}`,
                    borderTop: `3px solid ${b.accent}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", textAlign: "start" }}>
                  {u.image_url && (
                    <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", background: "#0a0710", overflow: "hidden" }}>
                      {vid
                        ? <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#cbb6ff" }}><span style={{ fontSize: 30 }}>▶</span><span style={{ fontFamily: F.heading, fontSize: 11, fontWeight: 800, opacity: .8 }}>וידאו · הקש לצפייה</span></div>
                        : <img src={galThumb(u, 420)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    </div>
                  )}
                  <div style={{ padding: "10px 12px 11px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                    <span style={{ alignSelf: "flex-start", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, color: b.accent, background: `color-mix(in srgb,${b.accent} 15%,transparent)`, borderRadius: 999, padding: "2px 9px" }}>{b.emoji} {b.title}</span>
                    {showTxt && <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.text}</p>}
                    <div style={{ marginTop: "auto", color: P.inkSoft, fontFamily: F.heading, fontSize: 10.5 }}>🕒 {timeAgoHe(u.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "16px 0 2px" }} />
        </div>
      )}
      {waLb && <UpdateModal u={waLb} brand={BRANDS[waLb.channel] || BRANDS["reality-code"]} onClose={() => setWaLb(null)} />}

      {/* 🏆 הזהב — הטופ שצוריאל קבע, בראש הדף של החוקר בלבד */}
      {topGold.length > 0 && !nq && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 10 }}>
            🏆 הזהב של {c.display_name}
          </div>
          <div style={{ columns: "2 300px", columnGap: 12 }}>
            {topGold.map((e, i) => (
              <div key={e.f || i} style={{ position: "relative", breakInside: "avoid" }}>
                <span style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 2, background: P.accentBtn, color: P.onAccent, borderRadius: 999, fontFamily: F.mono, fontSize: 12, fontWeight: 900, padding: "3px 9px", boxShadow: `0 2px 10px ${P.glow}` }}>#{e.top_rank}</span>
                <Card e={{ ...e, title: e.top_caption || e.title }} P={P} slug={slug} user={user} isAdmin={isAdmin} onHide={hide} onPromote={onPromote}
                  onNumClick={(n) => { setQ(String(n)); setCat("all"); setLimit(48); }} />
              </div>
            ))}
          </div>
          <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "6px 0 2px" }} />
        </div>
      )}

      {/* 🔎 חיפוש בתוך הדף — מספר בכל השיטות, או טקסט חופשי */}
      <div style={{ marginBottom: 14 }}>
        <input value={q} onChange={e => { setQ(e.target.value); setLimit(24); }} dir="auto"
          placeholder="🔎 חפשו מספר (למשל 888) או מילה — בכל הכרטיסים והשיטות"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: 12, background: P.cardSoft, border: `1.5px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" }} />
        {nq && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>
              {searched.length} כרטיסים מכילים «{nq}»
            </span>
            {isNum && (
              <a href={`/number/${nq}`} style={{ color: P.onAccent, background: P.accentBtn, textDecoration: "none", borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>
                🔢 לדף המספר {nq} ←
              </a>
            )}
            <button onClick={() => setQ("")} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.body, fontSize: 12, textDecoration: "underline" }}>נקה</button>
          </div>
        )}
      </div>

      {/* קטגוריות */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
        <button onClick={() => { setCat("all"); setLimit(24); }} style={chip(P, cat === "all")}>הכל ({searched.length})</button>
        {cats.map(([k, n]) => (
          <button key={k} onClick={() => { setCat(k); setLimit(24); }} style={chip(P, cat === k)}>{CAT_LABELS[k] || k} ({n})</button>
        ))}
      </div>

      {/* גריד הכרטיסים */}
      <div style={{ columns: "2 300px", columnGap: 12 }}>
        {shown.map((e, i) => <Card key={e.f || e.msg_id || i} e={e} P={P} slug={slug} user={user} isAdmin={isAdmin} onHide={hide} onPromote={onPromote}
          onNumClick={(n) => { setQ(String(n)); setCat("all"); setLimit(48); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* noop */ } }} />)}
      </div>
      {hiddenCount > 0 && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={unhideAll} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.body, fontSize: 12, textDecoration: "underline" }}>
            🙈 {hiddenCount} כרטיסים מוסתרים אצלך — הצג הכל מחדש
          </button>
        </div>
      )}
      {shown.length < totalInCat && (
        <button onClick={() => setLimit(l => l + 24)}
          style={{ display: "block", margin: "14px auto 0", cursor: "pointer", background: "none", border: `1px dashed ${P.border}`, color: P.accentText, borderRadius: 12, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, padding: "11px 26px", minHeight: 44 }}>
          עוד גילויים ({totalInCat - shown.length}) ▾
        </button>
      )}

      {/* 📝 הפוסטים על שמו — קישור לפוסט הקנוני, לא עותק */}
      {posts.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
            🔬 המחקרים של {c.display_name} ({posts.length})
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {posts.map(p => (
              <a key={p.slug} href={`/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 11, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 13px", textDecoration: "none" }}>
                {p.image_url && <img src={galThumb(p, 96)} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>
                    {p.participated && <span style={{ color: P.accentDim, fontWeight: 600 }}>🤝 בהשתתפות · </span>}{stripHtml(p.title)}
                  </div>
                  {p.date && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>{String(p.date).slice(0, 10)}</div>}
                </div>
                <span style={{ marginInlineStart: "auto", color: P.accentDim, fontSize: 14 }}>←</span>
              </a>
            ))}
          </div>
          <a href={`/post?author=${encodeURIComponent(c.display_name)}`} style={{ display: "inline-block", marginTop: 10, color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none", borderBottom: `1px dotted ${P.accentDim}` }}>
            📖 כל המחקרים של {c.display_name} ←
          </a>
        </div>
      )}

      {/* 🎯 ההתכנסויות שלו — עדשה על topic_cards, מצביע לעמוד הקנוני /topic/:slug */}
      {convergences.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
            🎯 ההתכנסויות של {c.display_name} ({convergences.length})
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {convergences.map(t => {
              const nums = [...new Set([...(t.highlight_numbers || []), ...(t.numbers || [])])].slice(0, 5);
              return (
                <a key={t.slug} href={`/topic/${t.slug}`} style={{ display: "block", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 14px", textDecoration: "none" }}>
                  <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, lineHeight: 1.45 }}>{stripHtml(t.title)}</div>
                  {t.subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{stripHtml(t.subtitle)}</div>}
                  {nums.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                      {nums.map(n => <span key={n} style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 9px", fontFamily: F.mono, fontSize: 11.5 }}>{n}</span>)}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 📌 מופיע גם בפוסטים אלו (תיוגים) — לא בהכרח כתב, מצביע לפוסט הקנוני */}
      {(() => {
        const authoredSlugs = new Set(posts.map(p => p.slug));
        const featured = tagged.filter(p => !authoredSlugs.has(p.slug));
        if (!featured.length) return null;
        return (
          <div style={{ marginTop: 26 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
              📌 מופיע גם בפוסטים אלו ({featured.length})
            </div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginBottom: 10 }}>פוסטים המתויגים בשמו — לחיצה פותחת את הפוסט המלא.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {featured.map(p => (
                <a key={p.slug} href={`/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 11, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 13px", textDecoration: "none" }}>
                  {p.image_url && <img src={galThumb(p, 96)} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{stripHtml(p.title)}</div>
                    <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5 }}>
                      {p.author ? `${p.author} · ` : ""}{p.date ? String(p.date).slice(0, 10) : ""}
                    </div>
                  </div>
                  <span style={{ marginInlineStart: "auto", color: P.accentDim, fontSize: 14 }}>←</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* דייג׳סט-טקסט */}
      {digest?.data && (
        <div style={{ marginTop: 26 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>📇 {digest.title}</div>
          {Object.entries(digest.data).map(([k, arr]) => Array.isArray(arr) && (
            <details key={k} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
              <summary style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                {{ identity: "👑 זהות", languages: "🌍 שפות", eight88: "✨ 888", foundations: "🏛 יסודות", best_standalone: "💎 פנינים" }[k] || k} ({arr.length})
              </summary>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {arr.map((e, i) => (
                  <div key={i} style={{ borderInlineStart: `2px solid ${P.border}`, paddingInlineStart: 10 }}>
                    <div style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>{e.claim}</div>
                    {e.quote && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.55, marginTop: 2 }}>«{e.quote}»</div>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>
        הכרטיסים בעמוד זה = חומר-מחקר בסטייג׳ (research_gold_hints_law) · גימטריה מאומתת מסומנת ✓
      </div>

      {/* 💬 תגובות על החוקר/הכתב — מבנה-התגובות הקנוני (Discourse). «להגיב על משתמש». */}
      <div style={{ marginTop: 36 }}>
        <Discourse target={{ type: "contributor", id: slug }} origin="profile" archive={[]} />
      </div>
    </div>
    </div>
    </PaletteProvider>
  );
}
function chip(P, on) {
  return { cursor: "pointer", borderRadius: 999, padding: "8px 14px", minHeight: 38, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800,
    border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : "none", color: on ? P.accentText : P.inkSoft };
}
