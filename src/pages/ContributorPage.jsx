import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { thumb } from "../lib/img.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QuickActions from "../components/QuickActions.jsx";

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

function Card({ e, P, slug, user, onHide }) {
  const [open, setOpen] = useState(false);
  const claims = e.claims || (e.values ? Object.entries(e.values).map(([k, v]) => `${k}=${v}`) : []);
  const cardId = `contrib-${slug}-${e.f || e.msg_id || e.title}`;
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
            {claims.slice(0, 6).map((c, i) => (
              <span key={i} style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 8, padding: "2px 8px", fontFamily: F.mono, fontSize: 11.5, direction: "ltr" }}>{c}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {e.verified && <span style={{ color: "#2e9e5b", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>✓ מאומת במנוע</span>}
          {e.status === "pending-review" && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>⏳ סטייג׳ — ממתין לאישור</span>}
          {e.d && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, marginInlineStart: "auto" }}>{e.d}</span>}
        </div>
        {/* מחובר בלבד: הפעולות הקנוניות (➕ למחקר האישי · ⭐ שמור · שתף · AI) + הסתרה */}
        {user && (
          <QuickActions entity={entity} style={{ marginTop: 4 }}
            extra={<button onClick={() => onHide(cardId)} title="הסתר את הכרטיס הזה אצלי">🙈 הסתר</button>} />
        )}
      </div>
    </div>
  );
}

export default function ContributorPage() {
  const { slug } = useParams();
  const P = usePalette();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [err, setErr] = useState(false);
  const [cat, setCat] = useState("all");
  const [limit, setLimit] = useState(24);
  const [hidden, setHidden] = useState(loadHidden);
  const hide = useCallback((id) => setHidden(h => { const n = new Set(h); n.add(id); saveHidden(n); return n; }), []);
  const unhideAll = useCallback(() => { setHidden(new Set()); saveHidden(new Set()); }, []);

  useEffect(() => {
    let alive = true;
    supabase.from("contributors").select("slug,display_name,role,bio,notes,vip,media").eq("slug", slug).maybeSingle()
      .then(({ data, error }) => { if (!alive) return; if (error || !data) setErr(true); else setC(data); })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [slug]);

  const media = useMemo(() => (Array.isArray(c?.media) ? c.media : []), [c]);
  const digest = media.find(e => e.kind === "digest");
  const header = media.find(e => e.kind === "scan-header");
  const items = media.filter(e => e.kind !== "digest" && e.kind !== "scan-header");
  const cats = useMemo(() => {
    const s = new Map();
    items.forEach(e => { const k = e.category || "אחר"; s.set(k, (s.get(k) || 0) + 1); });
    return [...s.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const visible = items.filter(e => !hidden.has(`contrib-${slug}-${e.f || e.msg_id || e.title}`));
  const shown = (cat === "all" ? visible : visible.filter(e => (e.category || "אחר") === cat)).slice(0, limit);
  const totalInCat = cat === "all" ? visible.length : visible.filter(e => (e.category || "אחר") === cat).length;
  const hiddenCount = items.length - visible.length;

  if (err) return <div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>החוקר לא נמצא.</div>;
  if (!c) return <div style={{ direction: "rtl", textAlign: "center", padding: 60, color: P.inkSoft, fontFamily: F.body }}>טוען…</div>;

  return (
    <div style={{ direction: "rtl", maxWidth: 860, margin: "0 auto", padding: "24px 14px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,34px)", fontWeight: 800 }}>
          {c.vip ? "👑 " : ""}{c.display_name}
        </div>
        {c.role && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginTop: 4 }}>{c.role}</div>}
        {header?.stats && (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>
            📚 {header.title} · {header.stats.images_scanned?.toLocaleString()} תמונות נסרקו · <b style={{ color: P.accentText }}>{header.stats.gold} זהב</b>
          </div>
        )}
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

      {/* קטגוריות */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
        <button onClick={() => { setCat("all"); setLimit(24); }} style={chip(P, cat === "all")}>הכל ({items.length})</button>
        {cats.map(([k, n]) => (
          <button key={k} onClick={() => { setCat(k); setLimit(24); }} style={chip(P, cat === k)}>{CAT_LABELS[k] || k} ({n})</button>
        ))}
      </div>

      {/* גריד הכרטיסים */}
      <div style={{ columns: "2 300px", columnGap: 12 }}>
        {shown.map((e, i) => <Card key={e.f || e.msg_id || i} e={e} P={P} slug={slug} user={user} onHide={hide} />)}
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
  );
}
function chip(P, on) {
  return { cursor: "pointer", borderRadius: 999, padding: "8px 14px", minHeight: 38, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800,
    border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : "none", color: on ? P.accentText : P.inkSoft };
}
