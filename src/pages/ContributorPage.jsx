import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { thumb } from "../lib/img.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QuickActions from "../components/QuickActions.jsx";
import { applySeo } from "../lib/seo.js";

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
  const P = usePalette();
  const { user, isAdmin } = useAuth(); // isAdmin: הכפתור מוצג רק לאדמין; השרת אוכף שוב בכל קריאה
  const [c, setC] = useState(null);
  const [err, setErr] = useState(false);
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
  useEffect(() => {
    let alive = true;
    supabase.from("contributors").select("slug,display_name,role,bio,notes,vip,media,avatar_url").eq("slug", slug).maybeSingle()
      .then(({ data, error }) => { if (!alive) return; if (error || !data) setErr(true); else setC(data); })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [slug]);

  // 📝 הפוסטים על שמו — עדשה על posts (author = השם הקנוני), לא עותק
  useEffect(() => {
    if (!c?.display_name) return;
    let alive = true;
    supabase.from("posts").select("slug,title,date,image_url").eq("author", c.display_name)
      .order("date", { ascending: false }).limit(30)
      .then(({ data }) => { if (alive && Array.isArray(data)) setPosts(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name]);

  // 🔗 שיתוף הדף — לכל משתמש (גם אנונימי)
  const sharePage = useCallback(async () => {
    const url = `https://sod1820.co.il/community/researcher/${slug}`;
    const title = `${c?.display_name || "חוקר"} — דף חוקר · סוד 1820`;
    try { if (navigator.share) return await navigator.share({ title, url }); } catch { /* בוטל */ }
    try { await navigator.clipboard.writeText(url); alert("הקישור הועתק 📋"); } catch { /* noop */ }
  }, [slug, c?.display_name]);

  // SEO קנוני לדף דינמי (כמו EntityPage/TopicPage) — כותרת + קנוניקל לפי החוקר
  useEffect(() => {
    if (!c) return;
    const firstImg = (Array.isArray(c.media) ? c.media : []).find(e => e.url)?.url;
    applySeo({
      title: `${c.display_name} — דף חוקר`,
      description: `הגילויים, האוצרות והרמזים של ${c.display_name} · ${c.role || "חוקר"} · סוד 1820`,
      path: `/community/researcher/${c.slug}`,
      image: firstImg,
    });
  }, [c]);

  const media = useMemo(() => (Array.isArray(c?.media) ? c.media : []), [c]);
  const digest = media.find(e => e.kind === "digest");
  const header = media.find(e => e.kind === "scan-header");
  const items = media.filter(e => e.kind !== "digest" && e.kind !== "scan-header");
  const cats = useMemo(() => {
    const s = new Map();
    items.forEach(e => { const k = e.category || "אחר"; s.set(k, (s.get(k) || 0) + 1); });
    return [...s.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  // 🏆 הטופ של החוקר — רק כרטיסים שסומנו top_rank (החלטת צוריאל, פר-חוקר; לא באתר הכללי)
  const topGold = items.filter(e => e.top_rank).sort((a, b) => a.top_rank - b.top_rank);
  const topKeys = new Set(topGold.map(e => e.f || e.msg_id));
  const visible = items.filter(e => !hidden.has(`contrib-${slug}-${e.f || e.msg_id || e.title}`) && !topKeys.has(e.f || e.msg_id));
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
  const hiddenCount = items.length - visible.length;

  // רקע-דף קנוני (light_mode_background_law): בבהיר — רקע אטום (קרם) מתחת לתוכן,
  // בכהה — שקוף (הקוסמוס נשאר). לעולם לא נשענים על תמונת-הרקע של האתר בבהיר.
  const pageWrap = { background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };

  if (err) return <div style={pageWrap}><div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>החוקר לא נמצא.</div></div>;
  if (!c) return <div style={pageWrap}><div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>טוען…</div></div>;

  return (
    <div style={pageWrap}>
    <div style={{ direction: "rtl", maxWidth: 860, margin: "0 auto", padding: "24px 14px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        {c.avatar_url && (
          <img src={c.avatar_url} alt={c.display_name} loading="lazy"
            style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${P.accent}`, boxShadow: `0 6px 22px ${P.glow}`, marginBottom: 10 }} />
        )}
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,34px)", fontWeight: 800 }}>
          {c.vip ? "👑 " : ""}{c.display_name}
        </div>
        {c.role && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginTop: 4 }}>{c.role}</div>}
        {header?.stats && (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>
            📚 {header.title} · {header.stats.images_scanned?.toLocaleString()} תמונות נסרקו · <b style={{ color: P.accentText }}>{header.stats.gold} זהב</b>
          </div>
        )}
        {/* 🔗 שיתוף הדף — לכל אחד */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={sharePage} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 20px", minHeight: 40 }}>
            🔗 שתפו את הדף
          </button>
          <a href="/community/researchers" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px" }}>
            📜 כל הכתבים ←
          </a>
        </div>
      </div>

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
            📝 הפוסטים של {c.display_name} ({posts.length})
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {posts.map(p => (
              <a key={p.slug} href={`/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 11, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 13px", textDecoration: "none" }}>
                {p.image_url && <img src={thumb(p.image_url, 96)} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45 }}>{p.title}</div>
                  {p.date && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>{String(p.date).slice(0, 10)}</div>}
                </div>
                <span style={{ marginInlineStart: "auto", color: P.accentDim, fontSize: 14 }}>←</span>
              </a>
            ))}
          </div>
        </div>
      )}

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
    </div>
    </div>
  );
}
function chip(P, on) {
  return { cursor: "pointer", borderRadius: 999, padding: "8px 14px", minHeight: 38, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800,
    border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : "none", color: on ? P.accentText : P.inkSoft };
}
