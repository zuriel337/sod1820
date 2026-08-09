import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { PALETTES, PaletteProvider } from "../lib/palette.js";
import { supabase, getUpdatesByReporterNames, getUpdatesByChannel } from "../lib/supabase.js";
import { thumb, galThumb } from "../lib/img.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QuickActions from "../components/QuickActions.jsx";
import ShareActions from "../components/ShareActions.jsx";
import RankCard from "../components/RankCard.jsx";
import FollowWriter from "../components/FollowWriter.jsx";
import ResearcherProfile from "../components/ResearcherProfile.jsx";
import { useDossierData, AboutResearcher, CurrentFocus, ResearchDomains, DossierMatrices, DossierFindings, Connections, MyResearchExplored, PersonalDataCard, OwnerControls, ResearcherStatsCard, ImpactBar, ResearchJournal } from "../components/dossier/DossierExtras.jsx";
import AskRaziel from "../components/AskRaziel.jsx";
import { genAvatar } from "../lib/avatar.js";
import DossierOnboarding from "../components/dossier/DossierOnboarding.jsx";
import Discourse from "../components/Discourse.jsx";
import { applySeo } from "../lib/seo.js";
import { timeAgoHe, stripHtml } from "../lib/format.js";
import { BRANDS, isVideoUrl, UpdateModal } from "../components/BrandTicker.jsx";
import { getResearcherProfile, intentMeta, getResearcherConvergences, getResearcherStats, getWriterWhatsappMessages, studioVerify } from "../lib/contributions.js";
import SpecialtyCenter from "../components/SpecialtyCenter.jsx";
import VerifiedGematrias from "../components/VerifiedGematrias.jsx";
import WriterMessage from "../components/WriterMessage.jsx";

// הסתרת-כרטיסים פר-משתמש (מקומי; מסונכרן דרך saved כשמעבירים למחקר)
const HIDE_KEY = "sod_hidden_contrib_cards_v1";
function loadHidden() { try { return new Set(JSON.parse(localStorage.getItem(HIDE_KEY)) || []); } catch { return new Set(); } }
function saveHidden(s) { try { localStorage.setItem(HIDE_KEY, JSON.stringify([...s])); } catch { /* noop */ } }

// 💬 קבוצת-הוואטסאפ הקנונית (זהה לפוטר/‏/join). לכתב on_whatsapp — «למי שלא בקבוצה וירצה להתחבר».
const WA_GROUP_URL = "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";
// 📞 וואטסאפ של צוריאל — כתב שרוצה להתחבר (להצטרף ל«הגילוי היומי») שולח הודעה אישית ומחוברים ידנית.
const ZURIEL_WA = "972556651237";
const ZURIEL_WA_LINK = `https://wa.me/${ZURIEL_WA}?text=${encodeURIComponent("שלום צוריאל 🙏 אני רוצה להתחבר לוואטסאפ / קבוצת «הגילוי היומי»")}`;
// כללי-ההצטרפות (חובה להצגה+אישור — wa onboarding, work_log «כלל הצטרפות הגילוי היומי»)
const WA_GROUP_RULES = [
  "הקבוצה מיועדת לעניינים כלליים, גילויים וחומר משותף. אין להשתמש בקבוצה לעניינים פרטיים או למחקר אישי על שמך.",
  "המערכת רשאית להגביל או לחסום את יכולת הכתיבה של כל משתתף בקבוצה, לפי שיקול דעתה, בכל עת.",
  "עצם ההצטרפות אינה מקנה זכות בלתי-מוגבלת לפרסם — חומר מהקבוצה נשאר כללי עד שהכתב מאשר אותו לדף שלו.",
];

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

// 🧱 מסגרת-מדור קנונית — אותה כותרת/מסגרת/empty-state לכל כתב (Canonical Writer Page).
//    מדור לעולם לא נעלם: אין תוכן → empty-state. ההבדל בין כתבים = הנתונים, לא השלד.
function WriterSlot({ P, emoji, title, tag, empty, emptyText, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>{title}</span>
        {tag && <span style={{ color: P.accentDim, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>✍️ {tag}</span>}
      </div>
      {empty
        ? <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, padding: "16px 12px", border: `1px dashed ${P.border}`, borderRadius: 12, textAlign: "center" }}>{emptyText}</div>
        : children}
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "20px 0 0" }} />
    </section>
  );
}

// 💬 שער-בעלים: חיבור קבוצת-הוואטסאפ האישית של הכתב/החוקר (owner-gateway set_my_wa_group).
//    מוצג רק לבעל-הדף. הבעלים מדביק לינק-הזמנה (chat.whatsapp.com/...) → הכפתור «קבוצת הוואטסאפ שלי»
//    עולה מיד. הפיד-באתר (channel=writer-<slug>) מופעל ע"י מנהל (הוספת הבוט לקבוצה) — הודעה מוצגת.
function OwnerWaConnect({ P, current, onConnected }) {
  const [open, setOpen] = useState(!current);
  const [url, setUrl] = useState(current || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function save(next) {
    setBusy(true); setErr("");
    try {
      const { data, error } = await supabase.rpc("set_my_wa_group", { p_invite_url: next });
      if (error || !data?.ok) {
        setErr(data?.error === "bad_invite_url" ? "לינק לא תקין — נדרש לינק-הזמנה של וואטסאפ (chat.whatsapp.com/...)" : "שמירה נכשלה, נסו שוב.");
      } else { onConnected(data.connected ? data.url : null); setOpen(false); }
    } catch { setErr("שגיאת רשת, נסו שוב."); }
    setBusy(false);
  }
  return (
    <div style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: "3px solid #25d366", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>💬 חבר את קבוצת הוואטסאפ שלך</div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginBottom: 11 }}>
        {current
          ? "הקבוצה שלך מחוברת — מבקרים יכולים להצטרף ולראות מה אתה כותב. אפשר לעדכן את הלינק או לנתק."
          : "אין לך עדיין קבוצת-וואטסאפ מחוברת. הדבק את לינק-ההזמנה של הקבוצה שלך — וכפתור «קבוצת הוואטסאפ שלי» יופיע בדף שלך מיד."}
      </div>
      {open ? (
        <div style={{ display: "grid", gap: 9 }}>
          <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" dir="ltr"
            placeholder="https://chat.whatsapp.com/..."
            style={{ width: "100%", boxSizing: "border-box", background: P.glow, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 13px", color: P.ink, fontFamily: F.body, fontSize: 16 }} />
          {err && <div style={{ color: "#c0453c", fontFamily: F.body, fontSize: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => save(url)} disabled={busy || !url.trim()}
              style={{ background: "#25d366", color: "#04321f", border: "none", borderRadius: 999, padding: "10px 20px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: busy ? "default" : "pointer", minHeight: 44, opacity: busy || !url.trim() ? .6 : 1 }}>
              {busy ? "שומר…" : (current ? "עדכן לינק" : "חבר את הקבוצה")}
            </button>
            {current && <button onClick={() => save("")} disabled={busy}
              style={{ background: "transparent", color: P.inkSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "10px 18px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: "pointer", minHeight: 44 }}>
              נתק קבוצה
            </button>}
          </div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, lineHeight: 1.55 }}>
            💡 כדי שההודעות מהקבוצה יופיעו גם כאן באתר (לא רק בוואטסאפ), המנהל מוסיף את הבוט לקבוצה — פנה אליו אחרי החיבור.
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          style={{ background: "transparent", color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, cursor: "pointer", minHeight: 40 }}>
          🔗 ערוך / נתק קבוצה
        </button>
      )}
    </div>
  );
}

// ✍️ הסטודיו/הספרייה האישית — רינדור בלוקי contributor_content (מפורסם+ציבורי) לפי סוג.
//    empty=לא מרונדר (הדף לא עמוס). כל בלוק = תוכן אישי של הכתב, מופרד ויזואלית מהמערכת הקנונית.
function StudioBlocks({ blocks, P }) {
  const pub = (Array.isArray(blocks) ? blocks : []).filter(b => b.is_public && !b.is_personal);
  if (!pub.length) return null;
  const card = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px" };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {pub.map(b => {
        if (b.kind === "heading") return <div key={b.id} style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginTop: 4 }}>{b.title}</div>;
        const gallery = Array.isArray(b.media) ? b.media.filter(m => m?.url) : [];
        return (
          <div key={b.id} style={card}>
            {(b.title || b.value != null) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: b.body ? 7 : 0 }}>
                {b.value != null && <span style={{ background: P.glow, color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 900 }}>🔢 {b.value}</span>}
                {b.title && <span style={{ color: P.ink, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>{b.title}</span>}
              </div>
            )}
            {b.kind === "quote"
              ? b.body && <blockquote style={{ margin: 0, borderInlineStart: `3px solid ${P.accent}`, paddingInlineStart: 12, color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>{b.body}</blockquote>
              : b.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{b.body}</div>}
            {b.image_url && !isVideoUrl(b.image_url) && (
              <img src={b.image_url} alt={b.title || ""} loading="lazy" style={{ display: "block", width: "100%", maxWidth: 420, borderRadius: 10, marginTop: b.body ? 10 : 0 }} />
            )}
            {gallery.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8, marginTop: 10 }}>
                {gallery.map((m, i) => <img key={i} src={m.url} alt={m.caption || ""} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 9 }} />)}
              </div>
            )}
            {b.link_url && (
              <a href={b.link_url} target={b.link_url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", padding: "7px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>
                🔗 {b.kind === "link" && b.title ? "פתח" : "לקישור"} ←
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 📤 העלאת תמונת-סטודיו ל-bucket 'gallery' תחת נתיב-הכתב → URL ציבורי (משתמש מחובר).
async function studioUpload(file, slug) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `sod1820/writers/${slug}/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
}

const STUDIO_KINDS = [
  { k: "text", icon: "📝", label: "טקסט/מידע" },
  { k: "heading", icon: "🔤", label: "כותרת" },
  { k: "quote", icon: "📜", label: "ציטוט" },
  { k: "image", icon: "🖼️", label: "תמונה" },
  { k: "gallery", icon: "🎞️", label: "גלריה" },
  { k: "link", icon: "🔗", label: "קישור/סרטון" },
  { k: "pin", icon: "📌", label: "הצמדה לעץ" },
];
// בונה p_entry מלא (studio_upsert דורסני — חייב את כל השדות שרוצים לשמור)
const studioEntry = (b, over = {}) => ({
  id: b?.id || undefined, kind: b?.kind || "text", title: b?.title ?? null, body: b?.body ?? null,
  value: b?.value ?? null, image_url: b?.image_url ?? null, link_url: b?.link_url ?? null,
  media: Array.isArray(b?.media) ? b.media : [], ref: b?.ref ?? null, ref_type: b?.ref_type ?? null,
  is_public: b?.is_public ?? false, is_personal: b?.is_personal ?? false, sort: b?.sort ?? 0, ...over,
});

// ✍️ עורך-הסטודיו (בעל-הדף) — פלטת-בלוקים, העלאת-תמונות, טיוטה/מוצג/אישי, סדר. כותב studio_upsert (auth.uid).
function StudioEditor({ slug, blocks, P, onChange, code = null }) {
  const [edit, setEdit] = useState(null);   // הבלוק בעריכה (חדש = {kind})
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const list = [...(blocks || [])].sort((a, b) => (a.sort - b.sort) || (a.created_at < b.created_at ? -1 : 1));

  async function call(fn, args) { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; }
  async function save(entry) {
    setBusy(true); setErr("");
    try { await call("studio_upsert", { p_slug: slug, p_code: code, p_entry: entry }); setEdit(null); await onChange(); }
    catch { setErr("שמירה נכשלה — נסו שוב."); }
    setBusy(false);
  }
  async function del(id) { try { await call("studio_delete", { p_slug: slug, p_code: code, p_id: id }); await onChange(); } catch { /* noop */ } }
  async function move(i, dir) {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    try { await call("studio_upsert", { p_slug: slug, p_code: code, p_entry: studioEntry(a, { sort: b.sort }) });
          await call("studio_upsert", { p_slug: slug, p_code: code, p_entry: studioEntry(b, { sort: a.sort }) });
          await onChange(); } catch { /* noop */ }
  }
  const statusOf = b => b.is_personal ? "אישי" : b.is_public ? "מוצג" : "טיוטה";
  const chip = { border: `1px solid ${P.border}`, borderRadius: 999, padding: "5px 10px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", background: P.card, color: P.ink, fontFamily: F.heading };

  return (
    <div style={{ border: `1px dashed ${P.accent}`, borderRadius: 14, padding: "14px 15px", background: P.glow }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>📚 הסטודיו שלי — עורך</div>
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>רק אתה רואה את הכלים האלה. «מוצג» = פומבי · «טיוטה»/«אישי» = פרטי.</div>
      </div>

      {list.length > 0 && (
        <div style={{ display: "grid", gap: 7, marginBottom: 12 }}>
          {list.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 7, background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "7px 10px" }}>
              <span style={{ fontSize: 15 }}>{STUDIO_KINDS.find(k => k.k === b.kind)?.icon || "📄"}</span>
              <span style={{ flex: 1, minWidth: 0, color: P.ink, fontFamily: F.body, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title || b.body?.slice(0, 40) || STUDIO_KINDS.find(k => k.k === b.kind)?.label}</span>
              <span style={{ ...chip, padding: "2px 8px", cursor: "default", color: b.is_public && !b.is_personal ? "#1a7f37" : P.accentDim }}>{statusOf(b)}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...chip, padding: "3px 8px", opacity: i === 0 ? .4 : 1 }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1} style={{ ...chip, padding: "3px 8px", opacity: i === list.length - 1 ? .4 : 1 }}>↓</button>
              <button onClick={() => setEdit(b)} style={{ ...chip, padding: "3px 9px" }}>✏️</button>
              <button onClick={() => del(b.id)} style={{ ...chip, padding: "3px 9px", color: "#c0453c" }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {edit ? (
        <StudioBlockForm block={edit} slug={slug} P={P} busy={busy} err={err}
          onCancel={() => { setEdit(null); setErr(""); }} onSave={save} />
      ) : (
        <div>
          <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginBottom: 7 }}>➕ הוסף בלוק</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {STUDIO_KINDS.map(k => (
              <button key={k.k} onClick={() => setEdit({ kind: k.k, is_public: false, is_personal: false })}
                style={{ ...chip, padding: "8px 12px", fontSize: 12.5 }}>{k.icon} {k.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// טופס בלוק-סטודיו — שדות לפי סוג + העלאת-תמונות + בורר טיוטה/מוצג/אישי.
function StudioBlockForm({ block, slug, P, busy, err, onCancel, onSave }) {
  const [b, setB] = useState(() => ({ ...block, media: Array.isArray(block.media) ? block.media : [] }));
  const [up, setUp] = useState(false);
  const set = (k, v) => setB(prev => ({ ...prev, [k]: v }));
  const status = b.is_personal ? "personal" : b.is_public ? "public" : "draft";
  const setStatus = s => setB(prev => ({ ...prev, is_public: s === "public", is_personal: s === "personal" }));
  const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: P.card, border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" };

  async function pickImage(e, multi) {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUp(true);
    try {
      if (multi) {
        const urls = [];
        for (const f of files) urls.push({ url: await studioUpload(f, slug) });
        setB(prev => ({ ...prev, media: [...(prev.media || []), ...urls] }));
      } else {
        set("image_url", await studioUpload(files[0], slug));
      }
    } catch { /* noop */ }
    setUp(false); e.target.value = "";
  }
  const kd = STUDIO_KINDS.find(k => k.k === b.kind);
  const needTitle = ["text", "heading", "image", "gallery", "link", "pin", "quote"].includes(b.kind);
  const btn = { border: "none", borderRadius: 999, padding: "10px 18px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: "pointer", minHeight: 44 };

  return (
    <div style={{ display: "grid", gap: 10, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "13px 14px" }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>{kd?.icon} {b.id ? "עריכת" : "בלוק חדש —"} {kd?.label}</div>

      {needTitle && b.kind !== "quote" && <input value={b.title || ""} onChange={e => set("title", e.target.value.slice(0, 200))} placeholder={b.kind === "heading" ? "הכותרת…" : "כותרת (לא חובה)"} style={input} />}

      {["text", "quote", "pin"].includes(b.kind) && (
        <textarea value={b.body || ""} onChange={e => set("body", e.target.value.slice(0, 20000))} rows={b.kind === "quote" ? 2 : 4}
          placeholder={b.kind === "quote" ? "הציטוט…" : b.kind === "pin" ? "תיאור קצר (לא חובה)…" : "הטקסט…"} style={{ ...input, resize: "vertical", minHeight: 60 }} />
      )}
      {b.kind === "text" && (
        <input value={b.value ?? ""} onChange={e => set("value", e.target.value.replace(/[^0-9]/g, "") || null)} inputMode="numeric" placeholder="ערך גימטריה (לא חובה, מציג באדג׳ 🔢)" style={input} />
      )}

      {b.kind === "image" && (
        <div>
          {b.image_url && <img src={b.image_url} alt="" style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginBottom: 8 }} />}
          <label style={{ ...btn, background: P.accentBtn, color: P.onAccent, display: "inline-block" }}>{up ? "מעלה…" : (b.image_url ? "החלף תמונה" : "📤 העלה תמונה")}<input type="file" accept="image/*" hidden onChange={e => pickImage(e, false)} /></label>
        </div>
      )}
      {b.kind === "gallery" && (
        <div>
          {(b.media || []).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginBottom: 8 }}>
              {b.media.map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={m.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={() => set("media", b.media.filter((_, k) => k !== i))} style={{ position: "absolute", top: 2, insetInlineEnd: 2, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: 999, width: 20, height: 20, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <label style={{ ...btn, background: P.accentBtn, color: P.onAccent, display: "inline-block" }}>{up ? "מעלה…" : "📤 הוסף תמונות"}<input type="file" accept="image/*" multiple hidden onChange={e => pickImage(e, true)} /></label>
        </div>
      )}
      {(b.kind === "link" || b.kind === "pin") && (
        <input value={(b.kind === "pin" ? b.ref : b.link_url) || ""} onChange={e => set(b.kind === "pin" ? "ref" : "link_url", e.target.value)} dir="ltr"
          placeholder={b.kind === "pin" ? "נתיב בעץ: /number/358 · /codes/<slug>" : "https://…"} style={input} />
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>מצב:</span>
        {[["public", "מוצג (פומבי)"], ["draft", "טיוטה"], ["personal", "אישי (פרטי)"]].map(([v, lbl]) => (
          <button key={v} onClick={() => setStatus(v)} style={{ border: `1px solid ${status === v ? P.accent : P.border}`, background: status === v ? P.glow : P.card, color: status === v ? P.accentText : P.inkSoft, borderRadius: 999, padding: "6px 12px", fontFamily: F.heading, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{lbl}</button>
        ))}
      </div>

      {err && <div style={{ color: "#c0453c", fontFamily: F.body, fontSize: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(studioEntry(b))} disabled={busy || up} style={{ ...btn, background: P.accentBtn, color: P.onAccent, opacity: busy || up ? .6 : 1 }}>{busy ? "שומר…" : "💾 שמור בלוק"}</button>
        <button onClick={onCancel} disabled={busy} style={{ ...btn, background: "transparent", color: P.inkSoft, border: `1px solid ${P.border}` }}>ביטול</button>
      </div>
    </div>
  );
}

// 🔢 האם עדכון נושא גימטריה? ביטוי = מספר (2-4 ספרות), «בגימטריא/גימטריה», או «מאומת במנוע».
//    משמש למיון: גימטריה תמיד ראשונה בדף-הכתב (בקשת צוריאל — הגימטריה למעלה בכל דף).
const GEM_UPDATE_RE = /=\s*\d{2,4}|\d{2,4}\s*=|בגימטרי|גימטריה|מאומת במנוע/;
const isGemUpdate = u => GEM_UPDATE_RE.test(u?.text || "");

export default function ContributorPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  // 📁 תיק המחקר = סביבת-מחקר → בהיר-נקי תמיד (research_workspace_law), כמו בית המדרש.
  const P = PALETTES.lab;
  const { user, isAdmin, loading: authLoading } = useAuth(); // isAdmin: הכפתור מוצג רק לאדמין; השרת אוכף שוב בכל קריאה
  const [searchParams] = useSearchParams();
  // 👁 «צפה כפי שהציבור רואה» (?view=public) — הבעלים/אדמין רואה את הדף בדיוק כמו מבקר רגיל:
  //    בלי כלי-בעלים, בלי כלי-אדמין, בלי אשף-הכנה. גישה לא נחסמת (הבעלים תמיד רשאי); רק התצוגה ציבורית.
  const asPublic = searchParams.get("view") === "public";
  const effIsAdmin = asPublic ? false : isAdmin;
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
  const [forumMsgs, setForumMsgs] = useState([]); // 💬 ההודעות האחרונות שלו בפורום (research_contributions)
  const [axisEvents, setAxisEvents] = useState([]); // 🗓️ אירועי-הציר שלו (nodes type=event) — «ציר ההתגלות» שלו
  const [studioBlocks, setStudioBlocks] = useState([]); // ✍️ הסטודיו/הספרייה האישית (contributor_content דרך studio_list)
  const [studioNonce, setStudioNonce] = useState(0);    // רענון-סטודיו אחרי עריכה
  const [studioCode, setStudioCode] = useState(null);   // 🔑 קוד-בעלים לסטודיו (?studio=<code>) — לכתב בלי חשבון (כריסטינה)
  const [studioCodeOwner, setStudioCodeOwner] = useState(false); // בעלים-דרך-קוד/אדמין (בנוסף ל-auth.uid)
  const [waLb, setWaLb] = useState(null);         // מסך-ידיעה לעדכון שנבחר
  const [waOpen, setWaOpen] = useState(false);    // 💬 תפריט-וואטסאפ נגלל (סגור כברירת-מחדל)
  const [waFindings, setWaFindings] = useState([]); // 💬 חומר «הגילוי היומי» של הכתב (RPC · עוקף RLS) — כשאין channel_updates
  // כתב עם feature_media (ציון) — התמונות מודגשות בראש, אז המקטע התחתון מציג רק עדכוני-טקסט (בלי כפילות)
  // 🔢 גימטריה תמיד ראשונה: עדכון שנושא גימטריה (ביטוי = מספר / «בגימטריא» / «מאומת במנוע») עולה לראש
  //    הדף לפני שאר העדכונים, ואז לפי חדש→ישן. בקשת צוריאל: בכל דף-כתב הגימטריה למעלה, ראשונה.
  const feedUpdates = (c?.feature_media ? waUpdates.filter(u => !u.image_url) : waUpdates)
    .slice()
    .sort((a, b) => (isGemUpdate(b) ? 1 : 0) - (isGemUpdate(a) ? 1 : 0)
      || (new Date(b.created_at || 0) - new Date(a.created_at || 0)));
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

  // 🪪 בעלות — מחושב מוקדם (לפני early-returns) כי useDossierData הוק שחייב לרוץ בכל render.
  //    c עשוי להיות null בתחילה (הוק מגן פנימית). effIsOwner=false בתצוגה-ציבורית (?view=public).
  const isOwner = !!(user?.id && c?.user_id && user.id === c.user_id);
  const effIsOwner = asPublic ? false : isOwner;
  const { matrices, joinedAt, settings, saveSettings, promoteMatrix } = useDossierData(c, effIsOwner, setDossierCount);

  useEffect(() => {
    let alive = true;
    setC(null); setErr(false); setLightName(null);   // איפוס בין slugs (כולל מעבר אצור↔קל)
    // כתובת קנונית לפי קוד-מספר (למשל 888) או slug — הקוד עדיף (בלי שמות-אנשים בכתובת)
    // ⛔ wa_names מוסר מהשליפה הציבורית (עמודה רגישה, חסומה ל-anon; הקוד נופל ל-display_name בלבד).
    // 📁 slug="me" → התיק של המשתמש המחובר (resolved לפי user_id, ואז ניווט לכתובת הקנונית).
    const cols = "slug,code,display_name,role,bio,notes,vip,trusted,media,avatar_url,locked,building,tags,feature_media,user_id,merged_into,dossier_settings,created_at,specialty,specialty_label,on_whatsapp,accent,emblem,engaged,page_config,wa_channel,wa_group_url";
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
        // me → נווט לכתובת הקנונית (URL נקי, deep-link יציב). שומרים query (למשל ?view=public) כדי
        //    ש«צפה כפי שהציבור רואה» יישמר גם אחרי הפנייה מ-«me» לכתובת הקנונית.
        if (resolveMe && data.slug && data.slug !== "me") { nav(`/community/researcher/${data.slug}${typeof window !== "undefined" ? window.location.search : ""}`, { replace: true }); return; }
        // 🌳 עץ אחד: דף-כותב שאוחד → הפניה לעמוד הקנוני
        if (data.merged_into && data.merged_into !== slug) { nav(`/community/researcher/${data.merged_into}`, { replace: true }); return; }
        setC(data);
      })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [slug, nav, user, authLoading]);

  // 🔑 זיהוי בעלים-דרך-קוד לסטודיו (?studio=<code> / localStorage) — לכתב בלי חשבון (כריסטינה) ולאדמין.
  //    בנוסף ל-auth.uid (effIsOwner); מאוחד — RPC אחד תומך בשני המסלולים.
  useEffect(() => {
    if (!slug || slug === "me") { setStudioCode(null); setStudioCodeOwner(false); return; }
    let alive = true;
    let k = null;
    try {
      k = new URL(window.location.href).searchParams.get("studio") || localStorage.getItem(`studio:${slug}`) || null;
    } catch { k = null; }
    if (!k) { setStudioCode(null); setStudioCodeOwner(false); return; }
    studioVerify(slug, k).then(v => {
      if (!alive) return;
      const ok = !!v?.ok;
      setStudioCodeOwner(ok); setStudioCode(ok ? k : null);
      if (ok) { try { localStorage.setItem(`studio:${slug}`, k); } catch { /* noop */ } }
    }).catch(() => { if (alive) { setStudioCodeOwner(false); setStudioCode(null); } });
    return () => { alive = false; };
  }, [slug]);

  // ✍️ הסטודיו/הספרייה האישית — עדשה על contributor_content דרך studio_list (SECURITY DEFINER).
  //    ציבורי מקבל רק בלוקים מפורסמים; בעל-הדף (auth.uid / code) מקבל גם טיוטות.
  useEffect(() => {
    if (!slug || slug === "me") { setStudioBlocks([]); return; }
    let alive = true;
    supabase.rpc("studio_list", { p_slug: slug, p_code: studioCode })
      .then(({ data }) => { if (alive) setStudioBlocks(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setStudioBlocks([]); });
    return () => { alive = false; };
  }, [slug, studioNonce, studioCode]);

  // 🌳 דרגת-החוקר שלו (מנוע-הגדילה) + סטטיסטיקה — לכרטיס-הדרגה. ציבורי (SECURITY DEFINER).
  const [level, setLevel] = useState(null);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!c?.user_id && !c?.display_name) return;
    let alive = true;
    if (c?.user_id) {
      supabase.rpc("research_level_of", { p_user: c.user_id })
        .then(({ data }) => { if (alive) setLevel(data || null); }).catch(() => {});
    }
    getResearcherStats(c?.user_id || null, c?.display_name || "")
      .then(d => { if (alive) setStats(d || null); }).catch(() => {});
    return () => { alive = false; };
  }, [c?.user_id, c?.display_name]);

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

  // 📡 העדכונים החיים שלו — קבוצת-וואטסאפ אישית (wa_channel) אם קיימת, אחרת עדשה לפי credit=display_name.
  //    עץ אחד: אותו channel_updates — או פיד הקבוצה שלו (channel=writer-<slug>) או סינון לפי שמותיו.
  useEffect(() => {
    if (!c?.display_name) { setWaUpdates([]); return; }
    let alive = true;
    const p = c.wa_channel
      ? getUpdatesByChannel(c.wa_channel, 60)
      : getUpdatesByReporterNames([c.display_name, ...(Array.isArray(c.wa_names) ? c.wa_names : [])], 60);
    p.then(r => { if (alive) setWaUpdates(Array.isArray(r) ? r : []); })
     .catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name, c?.wa_names, c?.wa_channel]);

  // 💬 חומר «הגילוי היומי» של הכתב — כשאין channel_updates, מזינים את 🟢 מ-writer_gematria_findings
  //    (RPC · SECURITY DEFINER, עוקף RLS ל-published). כך הפיד משקף את הפעילות בקבוצה. תצוגה בלבד — לא נוגע במאגר.
  useEffect(() => {
    if (!c?.display_name) { setWaFindings([]); return; }
    let alive = true;
    getWriterWhatsappMessages(c.display_name, c.user_id || null)
      .then(r => { if (alive) setWaFindings(Array.isArray(r) ? r : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name, c?.user_id]);

  // 💬 ההודעות האחרונות שלו בפורום — עדשה על research_contributions (מאושרות) לפי שם/uid.
  //    «לחיצה על השם → רואים את ההודעות האחרונות שלו». עץ אחד: מצביע לשרשור /forum/:id, לא עותק.
  useEffect(() => {
    if (!c?.display_name) { setForumMsgs([]); return; }
    let alive = true;
    getResearcherProfile(c.display_name, 12, c.user_id || null)
      .then(p => { if (alive) setForumMsgs(Array.isArray(p?.items) ? p.items : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.display_name, c?.user_id]);

  // 🗓️ אירועי-הציר של הכתב — nodes type=event שיוחסו אליו (metadata.contributor_slug).
  //    עדשה על אותם צמתים שמופיעים ב«ציר ההתגלות» הגלובלי (RevelationAxis/TimelinePage) — לא עותק.
  useEffect(() => {
    if (!c?.slug) { setAxisEvents([]); return; }
    let alive = true;
    supabase.from("nodes")
      .select("id,label,description,weight,hebrew_date,axis_theme,metadata,created_at")
      .eq("type", "event").eq("is_active", true)
      .eq("metadata->>contributor_slug", c.slug)
      .then(({ data }) => { if (alive) setAxisEvents(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [c?.slug]);

  // 📌 תיוגים + 🎯 התכנסויות — עדשה על posts.tags / topic_cards.search_terms לפי contributor.tags.
  // עץ אחד: לא עותק — מצביע לפוסט הקנוני ולעמוד ההתכנסות (/topic/:slug).
  useEffect(() => {
    const tags = Array.isArray(c?.tags) ? c.tags.filter(Boolean) : [];
    const name = c?.display_name;
    if (!tags.length && !name) { setTagged([]); setConvergences([]); return; }
    let alive = true;
    if (tags.length) {
      supabase.from("posts").select("slug,title,date,image_url,thumb_url,author")
        .overlaps("tags", tags).order("date", { ascending: false }).limit(60)
        .then(({ data }) => { if (alive && Array.isArray(data)) setTagged(data); })
        .catch(() => {});
    } else setTagged([]);
    // 🎯 מיזוג: התכנסויות שהכתב *יצר* (created_by, עם כוכב) + התכנסויות *על נושאיו* (tags).
    Promise.all([
      getResearcherConvergences(name),
      tags.length
        ? supabase.from("topic_cards").select("slug,title,subtitle,highlight_numbers")
            .eq("status", "approved").overlaps("search_terms", tags).limit(24)
            .then(({ data }) => data || []).catch(() => [])
        : Promise.resolve([]),
    ]).then(([authored, byTag]) => {
      if (!alive) return;
      const seen = new Set();
      const merged = [];
      (authored || []).forEach(t => { if (t.slug && !seen.has(t.slug)) { seen.add(t.slug); merged.push({ ...t, _authored: true }); } });
      (byTag || []).forEach(t => { if (t.slug && !seen.has(t.slug)) { seen.add(t.slug); merged.push(t); } });
      setConvergences(merged);
    }).catch(() => {});
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
    if (!asPublic && c && user?.id && c.user_id === user.id && !(c.dossier_settings?.onboarded)) setShowOnboard(true);
    else setShowOnboard(false);
  }, [c, user, asPublic]);

  const media = useMemo(() => (Array.isArray(c?.media) ? c.media : []), [c]);
  const digest = media.find(e => e.kind === "digest");
  const header = media.find(e => e.kind === "scan-header");
  const items = media.filter(e => e.kind !== "digest" && e.kind !== "scan-header");
  const cats = useMemo(() => {
    const s = new Map();
    (effIsAdmin ? items : items.filter(x => !x.sensitive)).forEach(e => { const k = e.category || "אחר"; s.set(k, (s.get(k) || 0) + 1); });
    return [...s.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, effIsAdmin]);
  // 🔒 תוכן רגיש (סומן בדאטה) — מוסתר מהציבור; אדמין רואה עם תג
  const safeItems = effIsAdmin ? items : items.filter(e => !e.sensitive);
  // 📦 האם לכתב יש בכלל חומר-כרטיסים ישן (media)? רק 3 כתבים (עמית/שמעון/ציון) — אצל השאר 0.
  //    לפי הכרעת ⚠️1B: החומר נשאר כ«חומר-גלם» בתוך 🔬 המחקר שלי (מקום אחד), הגירה-לעץ בהמשך.
  const hasMedia = safeItems.length > 0;
  // 🏆 הטופ של החוקר — רק כרטיסים שסומנו top_rank (החלטת צוריאל, פר-חוקר; לא באתר הכללי)
  const topGold = safeItems.filter(e => e.top_rank).sort((a, b) => a.top_rank - b.top_rank);
  const topKeys = new Set(topGold.map(e => e.f || e.msg_id));
  const visible = safeItems.filter(e => !hidden.has(`contrib-${slug}-${e.f || e.msg_id || e.title}`) && !topKeys.has(e.f || e.msg_id));
  // 🔎 חיפוש בתוך חומר-הגלם: מספר → התאמת מספר-שלם בכל השיטות/הכרטיסים; טקסט → הכלה חופשית
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

  // ─── מצבי-ריק + נתונים-נגזרים לסלוטים הקנוניים (Canonical Writer Page) ───
  const about = settings.about || c.bio || "";
  const highlights = Array.isArray(c.page_config?.highlights) ? c.page_config.highlights : [];
  const postSlugs = new Set(posts.map(p => p.slug));
  const taggedFeatured = tagged.filter(p => !postSlugs.has(p.slug));
  const galleryUpdates = waUpdates.filter(u => u.image_url);
  // 🔬 ריק רק כשאין באמת שום אות-מחקר — כולל waUpdates (חומר-גלם/ממצאים מקושרים), כדי לא להסתיר תוכן.
  const researchEmpty = matrices.length === 0 && convergences.length === 0 && posts.length === 0 && taggedFeatured.length === 0 && !hasMedia && forumMsgs.length === 0 && waUpdates.length === 0;
  const timelineEmpty = axisEvents.length === 0 && matrices.length === 0 && posts.length === 0;
  const featuredEmpty = highlights.length === 0 && topGold.length === 0 && !(c.feature_media && galleryUpdates.length > 0);
  // «על הכותב» עלה למעלה; כאן נותר current_focus + הסטודיו (contributor_content מפורסם). ריק=לא מוצג (לא עמוס).
  const studioPublicCount = studioBlocks.filter(b => b.is_public && !b.is_personal).length;
  const voiceEmpty = !effIsOwner && !studioCodeOwner && !settings.current_focus && studioPublicCount === 0;
  // כתב עם קבוצה אישית (wa_group_url) לא נחשב «ריק» (מציגים CTA-הצטרפות), וגם לא לבעל-הדף,
  // וגם לא כשיש חומר «הגילוי היומי» (waFindings) — כדי שתמיד יופיע משהו פעיל, לא טקסט-ריק.
  const waEmpty = !!c.on_whatsapp && !c.wa_group_url && !effIsOwner && feedUpdates.length === 0 && waFindings.length === 0;
  const dossierEmpty = !effIsOwner && !effIsAdmin && !level && matrices.length === 0;
  const rzFacts = [
    `כתב: ${c.display_name}`,
    c.specialty_label ? `התמחות: ${c.specialty_label}` : null,
    matrices.length ? `${matrices.length} צפנים בתיק` : null,
    posts.length ? `${posts.length} מחקרים/פוסטים` : null,
    level?.contrib ? `${level.contrib} חידושים מאושרים` : null,
    level?.label ? `דרגה: ${level.label}` : null,
  ].filter(Boolean).join(". ") + ".";

  return (
    <PaletteProvider value={PALETTES.lab}>
    <div style={pageWrap}>
    {showOnboard && (
      <DossierOnboarding P={P} name={c.display_name}
        onSkip={() => setShowOnboard(false)}
        onDone={(s) => { setShowOnboard(false); setC(prev => prev ? { ...prev, dossier_settings: { ...(prev.dossier_settings || {}), ...s } } : prev); }} />
    )}
    <div style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* 👁 באנר תצוגה-ציבורית — מוצג רק לבעלים/אדמין שנכנס דרך «צפה כפי שהציבור רואה» */}
      {asPublic && (isOwner || isAdmin) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center",
          background: P.glow, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 16px", marginBottom: 16 }}>
          <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>👁 תצוגה ציבורית — כך הדף נראה לכל מבקר</span>
          <a href={`/community/researcher/${c.code || c.slug}`} style={{ color: P.onAccent, background: P.accentBtn, textDecoration: "none", borderRadius: 999, padding: "7px 15px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>
            ✍️ חזרה למצב-הבעלים
          </a>
        </div>
      )}

      {/* ═══ סלוט 1 · 👤 כותרת הכתב ═══ (זהות · תמונה · תפקיד · trusted · דרגה · עקוב · הודעה) */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <img src={c.avatar_url || genAvatar(c.display_name)} alt={c.display_name} loading="lazy"
          style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${P.accent}`, boxShadow: `0 6px 22px ${P.glow}`, marginBottom: 10 }} />
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,34px)", fontWeight: 800 }}>
          {c.emblem ? c.emblem + " " : (c.vip ? "👑 " : "")}{c.display_name}
        </div>
        {c.role && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginTop: 4 }}>{c.role}</div>}
        {/* ✓ כתב מהימן — סימון-האמון של האתר (contributors.trusted); מסונכרן עם ה-✓ בפורום */}
        {c.trusted && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "3px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 900 }}>
            ✓ כתב מהימן
          </div>
        )}
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 6, maxWidth: 460, marginInline: "auto", lineHeight: 1.5 }}>כל הגילויים, החידושים והקשרים שנאספו לאורך הדרך.</div>
        {/* 🎖️ כרטיס-הדרגה המלא — מנוע-הגדילה + סטטיסטיקת-החוקר (דרגה, XP, פס-התקדמות, פירוט) */}
        <RankCard level={level} stats={stats} P={P} />
        {/* 🔗 שיתוף הדף — רכיב-השיתוף הקנוני (canonical_ui_components_law) */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          {/* 🔔 מעקב אחרי הכתב — הוחזר (subscription_funnel_law v9): מעקב-כתב הגיוני בדף-הכתב עצמו.
              (רק בתחתית-פוסט אין מעקב-כתב — שם עוקבים אחרי קטגוריה/פוסט.) */}
          <FollowWriter name={c.display_name} />
          <WriterMessage name={c.display_name} P={P} toUserId={c.user_id} />
          {/* 💬 קבוצת-הוואטסאפ האישית של הכתב — ליד «שלח הודעה»: התחברות + לראות מה הוא כותב */}
          {c.wa_group_url && (
            <a href={c.wa_group_url} target="_blank" rel="noopener noreferrer"
              title={`הצטרפו לקבוצת הוואטסאפ של ${c.display_name} וראו מה הוא כותב`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", background: "#25D366", textDecoration: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>
              💬 קבוצת הוואטסאפ שלי
            </a>
          )}
          <ShareActions type="researcher"
            url={`https://sod1820.co.il/community/researcher/${c?.code || c?.slug || slug}`}
            title={`${c?.display_name || "חוקר"} — דף חוקר · סוד 1820`}
            image={(Array.isArray(c?.media) ? c.media.find(e => e.url)?.url : undefined)} />
          <a href="/community/researchers" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>
            📜 כל הכתבים ←
          </a>
        </div>
      </div>

      {/* 🧑 על הכותב — למעלה אצל כולם (בקשת צוריאל): אינטרו קצר + גימטריית-השם, מיד אחרי הכותרת. */}
      <AboutResearcher P={P} name={c.display_name} about={about} isOwner={effIsOwner} onSave={t => saveSettings({ about: t })} />

      {/* ═══ סלוט 2 · 🧠 המרכז שלי ═══ (מנוע-המרכז לפי specialty; המסגרת זהה אצל כולם) */}
      <WriterSlot P={P} emoji="🧠" title="המרכז שלי" empty={!c.specialty_label} emptyText="המרכז בבנייה — יופיע כאן מנוע-המחקר הייחודי של הכתב.">
        {c.specialty_label && (
          <div style={{ textAlign: "center", margin: "0 auto 14px", maxWidth: 640,
            background: `linear-gradient(180deg, ${(c.accent || P.accent)}1f, transparent)`,
            border: `1px solid ${P.border}`, borderTop: `3px solid ${c.accent || P.accent}`,
            borderRadius: 15, padding: "13px 20px" }}>
            <div style={{ fontSize: 25, lineHeight: 1 }}>{c.emblem || "✦"}</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginTop: 3 }}>{c.specialty_label}</div>
          </div>
        )}
        <SpecialtyCenter c={c} />
      </WriterSlot>

      {/* ═══ סלוט 3 · 🔢 הגימטריות המאומתות שלי ═══ (מקור קנוני יחיד + empty-state עצמי) */}
      <VerifiedGematrias name={c.display_name} acc={c.accent} uid={c.user_id} />

      {/* ═══ סלוט 4 · 🔬 המחקר שלי ═══ (עדשות על עץ-הידע; מסגרת זהה, נתונים משתנים) */}
      <WriterSlot P={P} emoji="🔬" title="המחקר שלי" empty={researchEmpty} emptyText="אין עדיין מחקר מוצג לכתב הזה.">
        <ResearchDomains P={P} level={level} matrices={matrices} tags={c.tags} />
        {/* צפנים — אצל כתבי-צפנים זה כבר «המרכז» (SpecialtyCenter), לכן לא מוצג כאן (בלי כפילות) */}
        {c.specialty !== "els-ciphers" && <DossierMatrices P={P} name={c.display_name} matrices={matrices} isAdmin={effIsAdmin} onPromote={promoteMatrix} />}
        <DossierFindings P={P} name={c.display_name} uid={c.user_id} isAdmin={effIsAdmin} />
        <Connections P={P} matrices={matrices} />

        {/* 🎯 ההתכנסויות — מוסתר כשקיר-ההצלבות כבר המרכז (specialty=crosses) */}
        {convergences.length > 0 && c.specialty !== "crosses" && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              🎯 ההתכנסויות של {c.display_name} ({convergences.length})
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {convergences.map(t => {
                const nums = [...new Set([...(t.highlight_numbers || []), ...(t.numbers || [])])].slice(0, 5);
                return (
                  <a key={t.slug} href={`/topic/${t.slug}`} style={{ display: "block", background: P.card, border: `1px solid ${t._authored ? "#d4af37" : P.border}`, borderRadius: 12, padding: "11px 14px", textDecoration: "none", boxShadow: t._authored ? "0 0 0 1px #d4af37 inset" : "none" }}>
                    {t._authored && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, marginBottom: 5 }}>✦ יצר את ההתכנסות</span>}
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

        {/* 📝 הפוסטים על שמו — קישור לפוסט הקנוני, לא עותק */}
        {posts.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              📖 המחקרים של {c.display_name} ({posts.length})
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

        {/* 📌 מופיע גם בפוסטים אלו (תיוגים) — מצביע לפוסט הקנוני */}
        {taggedFeatured.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
              📌 מופיע גם בפוסטים אלו ({taggedFeatured.length})
            </div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginBottom: 10 }}>פוסטים המתויגים בשמו — לחיצה פותחת את הפוסט המלא.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {taggedFeatured.map(p => (
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
        )}

        {/* 🗂️ חומר-גלם (ארכיון) — מערכת ה-media הישנה (עמית/שמעון). ⚠️1B: מקום אחד.
            מוצג רק כשיש כרטיסים גלויים בפועל (visible) — לא רק media קיים: אצל ציון כל הכרטיסים
            הם top_rank → עברו ל-⭐ מובחרים, ולא נשאר גלם → לא מציגים אזור-חיפוש ריק. */}
        {visible.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>🗂️ חומר-גלם (ארכיון)</div>
            <div style={{ marginBottom: 12 }}>
              <input value={q} onChange={e => { setQ(e.target.value); setLimit(24); }} dir="auto"
                placeholder="🔎 חפשו מספר (למשל 888) או מילה — בכל הכרטיסים"
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, background: P.cardSoft, border: `1.5px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" }} />
              {nq && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>{searched.length} כרטיסים מכילים «{nq}»</span>
                  {isNum && <a href={`/number/${nq}`} style={{ color: P.onAccent, background: P.accentBtn, textDecoration: "none", borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🔢 לדף המספר {nq} ←</a>}
                  <button onClick={() => setQ("")} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.body, fontSize: 12, textDecoration: "underline" }}>נקה</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
              <button onClick={() => { setCat("all"); setLimit(24); }} style={chip(P, cat === "all")}>הכל ({searched.length})</button>
              {cats.map(([k, n]) => (
                <button key={k} onClick={() => { setCat(k); setLimit(24); }} style={chip(P, cat === k)}>{CAT_LABELS[k] || k} ({n})</button>
              ))}
            </div>
            <div style={{ columns: "2 300px", columnGap: 12 }}>
              {shown.map((e, i) => <Card key={e.f || e.msg_id || i} e={e} P={P} slug={slug} user={user} isAdmin={effIsAdmin} onHide={hide} onPromote={onPromote}
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
          </div>
        )}

        {/* 🤖 עוזר-AI — ⚠️5: בתוך המחקר, לכל כתב (לא רק לבעל-תיק/צפנים) — רזיאל מדבר על המחקר של כל כתב */}
        {(
          <AskRaziel kind="research" subject={c.display_name} facts={rzFacts} palette={P}
            title={effIsOwner ? "רזיאל · הסוכן שלך" : `רזיאל · שאל על המחקר של ${c.display_name}`}
            subtitle={effIsOwner ? "נחקור יחד — עובדה מהמנוע, לא נבואה" : "שאל את רזיאל על התיק הזה — עובדה מהמנוע, לא נבואה"}
            greeting={effIsOwner ? "עברתי על המחקר שלך, ומצאתי כמה נקודות שעשויות לעניין אותך." : `עברתי על המחקר של ${c.display_name}, ומצאתי כמה נקודות שעשויות לעניין אותך.`}
            waText={effIsOwner ? `שלום רזיאל 🌳 בקשר לתיק המחקר שלי — ` : `שלום רזיאל 🌳 בקשר לתיק המחקר של ${c.display_name} — `} />
        )}

        {/* 🔬 מה חקרתי — פרטי לבעלים בלבד (RLS) */}
        <MyResearchExplored P={P} isOwner={effIsOwner} />
      </WriterSlot>

      {/* ═══ סלוט 5 · ✍️ הקול שלי ═══ (תוכן אישי; «על הכותב» עלה למעלה, כאן «מה אני חוקר עכשיו» + עתידי contributor_content) */}
      <WriterSlot P={P} emoji="✍️" title="הקול שלי" tag="תוכן אישי של הכתב" empty={voiceEmpty} emptyText="הכתב עדיין לא הוסיף תוכן אישי.">
        <div style={{ display: "grid", gap: 14 }}>
          <CurrentFocus P={P} focus={settings.current_focus || ""} isOwner={effIsOwner} onSave={t => saveSettings({ current_focus: t })} />
          {/* 📚 הסטודיו/הספרייה האישית — מה שהכתב בחר להציג (מפורסם בלבד). ריק → לא מוצג. */}
          <StudioBlocks blocks={studioBlocks} P={P} />
          {/* ✍️ עורך-הסטודיו — רק לבעל-הדף (effIsOwner). מוסיף/עורך/מסדר בלוקים דרך studio_upsert. */}
          {(effIsOwner || studioCodeOwner) && c?.slug && <StudioEditor slug={c.slug} blocks={studioBlocks} P={P} code={studioCode} onChange={async () => setStudioNonce(n => n + 1)} />}
        </div>
      </WriterSlot>

      {/* ═══ סלוט 6 · 🟢 WhatsApp ═══ (תמיד נוכח: פיד לפי חומר-אמיתי · empty-state · CTA-הצטרפות)
          מפתח על feedUpdates (חומר בפועל), לא על הדגל on_whatsapp — כי יש כתבים עם חומר-וואטסאפ
          ו-on_whatsapp=false. יש חומר → פיד ; אין חומר + כתב-וואטסאפ → empty-state ; אחרת → CTA. */}
      <WriterSlot P={P} emoji="🟢" title="WhatsApp" empty={waEmpty} emptyText="אין מידע מהוואטסאפ כרגע.">
        {feedUpdates.length > 0 ? (
          (
            <div>
              <button onClick={() => setWaOpen(o => !o)} aria-expanded={waOpen}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", textAlign: "start",
                  background: "linear-gradient(135deg,#128c7e,#075e54)", color: "#fff", border: "none",
                  borderRadius: waOpen ? "14px 14px 0 0" : 14, padding: "12px 16px", minHeight: 54 }}>
                <span style={{ fontSize: 23, lineHeight: 1 }}>💬</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>וואטסאפ · {c.display_name}</div>
                  <div style={{ fontFamily: F.body, fontSize: 11.5, opacity: .85 }}>{feedUpdates.length} הודעות · מקור גולמי · הקש {waOpen ? "לסגירה" : "לפתיחה"}</div>
                </div>
                <span style={{ fontSize: 15, transform: waOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
              </button>
              {waOpen && (
                <div style={{ maxHeight: 520, overflowY: "auto", WebkitOverflowScrolling: "touch",
                  background: "#0b141a", border: `1px solid ${P.border}`, borderTop: "none", borderRadius: "0 0 14px 14px",
                  padding: "14px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                  {/* 📌 באנר-הצטרפות נעוץ — למי שלא בקבוצה וירצה להתחבר, עם כללי-הקבוצה */}
                  <div style={{ alignSelf: "center", width: "100%", maxWidth: 520, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.13)", borderRadius: 12, padding: "13px 15px", textAlign: "center", color: "#e9edef" }}>
                    <div style={{ fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 3 }}>📌 עוד לא בקבוצה?</div>
                    <div style={{ fontFamily: F.body, fontSize: 11.5, opacity: .82, lineHeight: 1.55, marginBottom: 11 }}>{c.wa_group_url ? `הצטרפו לקבוצת הוואטסאפ של ${c.display_name} — ותראו מה הוא כותב.` : "הצטרפו לקבוצת הגימטריה בוואטסאפ — רמזים חמים ודיונים."}</div>
                    <a href={c.wa_group_url || WA_GROUP_URL} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#25d366", color: "#04321f", textDecoration: "none", borderRadius: 999, padding: "10px 22px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, minHeight: 44 }}>
                      💬 הצטרפו לקבוצה ←
                    </a>
                    <details style={{ marginTop: 11, textAlign: "start" }}>
                      <summary style={{ cursor: "pointer", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, color: "#8fb3a8", listStyle: "none" }}>📋 כללי הקבוצה — חשוב לקרוא לפני הצטרפות ▾</summary>
                      <ol style={{ margin: "9px 0 0", paddingInlineStart: 18, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.65, color: "#c8d3d0", display: "grid", gap: 5 }}>
                        {WA_GROUP_RULES.map((r, i) => <li key={i}>{r}</li>)}
                      </ol>
                    </details>
                  </div>
                  {feedUpdates.map(u => {
                    const vid = u.image_url && isVideoUrl(u.image_url);
                    const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
                    return (
                      <div key={u.id} onClick={() => setWaLb(u)} title="הקש לפתיחה במסך מלא"
                        style={{ alignSelf: "flex-end", maxWidth: "85%", cursor: "pointer", background: "#005c4b", color: "#e9edef",
                          borderRadius: "12px 12px 3px 12px", padding: u.image_url ? 6 : "9px 13px", boxShadow: "0 1px 1.5px rgba(0,0,0,.35)" }}>
                        {u.image_url && (
                          vid
                            ? <div style={{ width: "100%", minWidth: 190, aspectRatio: "16/10", borderRadius: 9, background: "#0a0710", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, color: "#cbb6ff" }}><span style={{ fontSize: 27 }}>▶</span><span style={{ fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, opacity: .8 }}>וידאו · הקש לצפייה</span></div>
                            : <img src={galThumb(u, 460)} alt="" loading="lazy" style={{ display: "block", width: "100%", minWidth: 190, maxWidth: 300, borderRadius: 9, background: "#0a0710" }} />
                        )}
                        {showTxt && <p style={{ margin: u.image_url ? "8px 5px 2px" : 0, fontFamily: F.body, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{u.text}</p>}
                        <div style={{ textAlign: "end", marginTop: 3, fontFamily: F.heading, fontSize: 10, color: "#8fb3a8", paddingInline: 4 }}>🕒 {timeAgoHe(u.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : waFindings.length > 0 ? (
          /* 💬 חומר «הגילוי היומי» — כשאין channel_updates: מציגים את גימטריות-הכתב מהקבוצה כצ'אט (RPC, עוקף RLS). תצוגה בלבד. */
          <div>
            <button onClick={() => setWaOpen(o => !o)} aria-expanded={waOpen}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", textAlign: "start",
                background: "linear-gradient(135deg,#128c7e,#075e54)", color: "#fff", border: "none",
                borderRadius: waOpen ? "14px 14px 0 0" : 14, padding: "12px 16px", minHeight: 54 }}>
              <span style={{ fontSize: 23, lineHeight: 1 }}>💬</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>הגילוי היומי · {c.display_name}</div>
                <div style={{ fontFamily: F.body, fontSize: 11.5, opacity: .85 }}>{waFindings.length} הודעות מהקבוצה · הקש {waOpen ? "לסגירה" : "לפתיחה"}</div>
              </div>
              <span style={{ fontSize: 15, transform: waOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
            </button>
            {waOpen && (
              <div style={{ maxHeight: 520, overflowY: "auto", WebkitOverflowScrolling: "touch",
                background: "#0b141a", border: `1px solid ${P.border}`, borderTop: "none", borderRadius: "0 0 14px 14px",
                padding: "14px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                {waFindings.map(f => {
                  const bubbleStyle = { alignSelf: "flex-end", maxWidth: "88%", textDecoration: "none", background: "#005c4b", color: "#e9edef", borderRadius: "12px 12px 3px 12px", padding: "9px 13px", boxShadow: "0 1px 1.5px rgba(0,0,0,.35)" };
                  const inner = (<>
                    <p style={{ margin: 0, fontFamily: F.body, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{String(f.message || "").slice(0, 600)}</p>
                    <div style={{ textAlign: "end", marginTop: 4, fontFamily: F.heading, fontSize: 10.5 }}>
                      {f.value ? <span style={{ color: "#8ff0c0", fontWeight: 900 }}>🔢 {f.value}</span> : null}
                      {f.created_at && <span style={{ color: "#8fb3a8", marginInlineStart: 8 }}>🕒 {timeAgoHe(f.created_at)}</span>}
                    </div>
                  </>);
                  return f.value
                    ? <a key={f.id} href={`/number/${f.value}`} style={bubbleStyle}>{inner}</a>
                    : <div key={f.id} style={bubbleStyle}>{inner}</div>;
                })}
              </div>
            )}
          </div>
        ) : (() => {
          // אין channel_updates ואין waFindings → שכבת-הקבוצה-האישית (שלי): עדכון-מצב מקומי אחרי חיבור/ניתוק ע"י הבעלים
          const onConn = (u) => setC(prev => prev ? { ...prev, wa_group_url: u, on_whatsapp: u ? true : prev.on_whatsapp } : prev);
          if (c.wa_group_url) {
            // יש קבוצה: בעלים → ניהול (עריכה/ניתוק) · מבקר → הזמנה להצטרף ולראות מה הוא כותב
            return effIsOwner ? (
              <OwnerWaConnect P={P} current={c.wa_group_url} onConnected={onConn} />
            ) : (
              <div style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: `3px solid #25d366`, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginBottom: 10 }}>
                  לקבוצת הוואטסאפ של {c.display_name} יש מקום גם לכם. הצטרפו כדי לראות מה הוא כותב — ברגע שיעלה חומר חדש הוא יופיע גם כאן.
                </div>
                <a href={c.wa_group_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#25d366", color: "#04321f", textDecoration: "none", borderRadius: 999, padding: "10px 20px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, minHeight: 44 }}>
                  💬 הצטרפו לקבוצה של {c.display_name} ←
                </a>
              </div>
            );
          }
          // אין קבוצה: בעל-הדף → הצעה לחבר את הקבוצה שלו · מבקר → CTA-הצטרפות דרך צוריאל
          return effIsOwner ? (
            <OwnerWaConnect P={P} current={null} onConnected={onConn} />
          ) : (
            <div style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: `3px solid #25d366`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginBottom: 10 }}>
                הכתב עדיין לא מחובר לוואטסאפ. רוצים להתחבר ולהצטרף לקבוצת «הגילוי היומי»? שלחו לי הודעה ואחבר אתכם — ומה שתבחרו להציג יופיע כאן.
              </div>
              <a href={ZURIEL_WA_LINK} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#25d366", color: "#04321f", textDecoration: "none", borderRadius: 999, padding: "10px 20px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, minHeight: 44 }}>
                💬 שלחו לי הודעה בוואטסאפ ←
              </a>
            </div>
          );
        })()}
      </WriterSlot>
      {waLb && <UpdateModal u={waLb} brand={BRANDS[waLb.channel] || BRANDS["reality-code"]} onClose={() => setWaLb(null)} />}

      {/* ═══ סלוט 7 · 📅 ציר פעילות ואירועים ═══ (אירועים-אצורים + אבני-דרך אוטומטיות — ציר אחד) */}
      <WriterSlot P={P} emoji="📅" title="ציר פעילות ואירועים" empty={timelineEmpty} emptyText="אין עדיין אירועים בציר.">
        {axisEvents.length > 0 && (() => {
          const evs = [...axisEvents].sort((a, b) => (Number(b.metadata?.year) || 0) - (Number(a.metadata?.year) || 0) || (b.weight || 0) - (a.weight || 0));
          const postsByYear = (() => {
            const m = new Map();
            for (const p of posts) { const y = (p.date && String(p.date).slice(0, 4)) || "—"; if (!m.has(y)) m.set(y, []); m.get(y).push(p); }
            return [...m.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
          })();
          const theme = evs[0]?.axis_theme;
          return (
            <div style={{ marginBottom: 18 }}>
              {theme && <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>התכנסות תאריכים ורמזים — {theme}</div>}
              <div style={{ position: "relative", marginInlineStart: 10, paddingInlineStart: 22, borderInlineStart: `2px solid ${P.accent}55`, display: "grid", gap: 12 }}>
                {evs.map(ev => (
                  <div key={ev.id} style={{ position: "relative", background: P.card, border: `1px solid ${(ev.weight || 0) >= 4 ? P.accent : P.border}`, borderRadius: 14, padding: "13px 16px" }}>
                    <div style={{ position: "absolute", top: 18, insetInlineStart: -29, width: 12, height: 12, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #fff8e1, ${P.accentText} 60%)`, boxShadow: `0 0 10px ${P.accent}` }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 5 }}>
                      {ev.hebrew_date && <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>🕯 {ev.hebrew_date}</span>}
                      {ev.metadata?.greg_date && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>· {ev.metadata.greg_date}</span>}
                      {(ev.weight || 0) >= 5 && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>★ מרכזי</span>}
                    </div>
                    <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.5 }}>{ev.label}</div>
                    {ev.description && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65, marginTop: 5 }}>{ev.description}</div>}
                    {(ev.metadata?.gematria || (ev.metadata?.numbers || []).length) ? (
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                        {ev.metadata?.gematria && <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 11px" }}>🔢 {ev.metadata.gematria}</span>}
                        {(ev.metadata?.numbers || []).map(n => <a key={n} href={`/number/${n}`} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 12, color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 9px", textDecoration: "none" }}>{n}</a>)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {postsByYear.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>📝 המחקרים שלו לאורך השנים</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {postsByYear.map(([y, ps]) => (
                      <div key={y} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ flex: "0 0 auto", minWidth: 44, color: P.accentText, fontFamily: F.mono, fontSize: 14, fontWeight: 900 }}>{y}</span>
                        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                          {ps.map(p => (
                            <a key={p.slug} href={`/${p.slug}`} style={{ color: P.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.5, textDecoration: "none", borderBottom: `1px dotted ${P.border}` }}>{p.participated ? "🤝 " : ""}{stripHtml(p.title)}</a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <a href="/timeline" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: P.onAccent, background: P.accentBtn, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "10px 20px", minHeight: 44 }}>
                  🌅 הכל בציר ההתגלות של האתר ←
                </a>
              </div>
            </div>
          );
        })()}
        <ResearchJournal P={P} name={c.display_name} level={level} matrices={matrices} joinedAt={joinedAt} />
      </WriterSlot>

      {/* ═══ סלוט 8 · ⭐ מובחרים ═══ (הפניות + הזהב שנקבע) */}
      <WriterSlot P={P} emoji="⭐" title="מובחרים" empty={featuredEmpty} emptyText="אין מובחרים כרגע.">
        {topGold.length > 0 && (
          <div style={{ marginBottom: galleryUpdates.length ? 20 : 0 }}>
            <div style={{ columns: "2 300px", columnGap: 12 }}>
              {topGold.map((e, i) => (
                <div key={e.f || i} style={{ position: "relative", breakInside: "avoid" }}>
                  <span style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 2, background: P.accentBtn, color: P.onAccent, borderRadius: 999, fontFamily: F.mono, fontSize: 12, fontWeight: 900, padding: "3px 9px", boxShadow: `0 2px 10px ${P.glow}` }}>#{e.top_rank}</span>
                  <Card e={{ ...e, title: e.top_caption || e.title }} P={P} slug={slug} user={user} isAdmin={effIsAdmin} onHide={hide} onPromote={onPromote}
                    onNumClick={(n) => { setQ(String(n)); setCat("all"); setLimit(48); }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {c.feature_media && galleryUpdates.length > 0 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
              {galleryUpdates.map(u => {
                const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
                return (
                  <div key={u.id} onClick={() => setWaLb(u)} title="לחצו לפתיחה" style={{ cursor: "pointer", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <img src={galThumb(u, 460)} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block", background: "#0a0710" }} />
                    {showTxt && <div style={{ padding: "10px 12px", color: P.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.text}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </WriterSlot>

      {/* ═══ סלוט 9 · 💬 דיונים ופורום ═══ (שרשורי-הכתב + תגובות; Discourse תמיד נוכח) */}
      <WriterSlot P={P} emoji="💬" title="דיונים ופורום" empty={false}>
        {forumMsgs.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>ההודעות האחרונות בפורום — לחיצה פותחת את ההודעה והתגובות</div>
            <div style={{ display: "grid", gap: 9 }}>
              {forumMsgs.map(it => {
                const im = intentMeta(it.intent);
                const txt = stripHtml(it.title || it.body || "");
                const isWordplay = it.intent === "interpretation" && !it.target_id;
                const firstWord = isWordplay ? ((txt.match(/[֐-׿]{2,}/) || [""])[0]) : "";
                return (
                  <div key={it.id}>
                    <a href={`/forum/${it.id}`} style={{ display: "block", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 14px", textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800 }}>{im.emoji} {im.label}</span>
                        {it.target_id && <span style={{ color: P.accent, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{it.target_type === "number" ? "🔢" : it.target_type === "els" ? "🔠" : "🔖"} {it.target_id}</span>}
                        <span style={{ flex: 1 }} />
                        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5 }}>{timeAgoHe(it.created_at)}</span>
                      </div>
                      <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{txt}</div>
                    </a>
                    {firstWord.length >= 2 && (
                      <a href={`/research?tool=maftech&q=${encodeURIComponent(firstWord)}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, marginInlineStart: 4, color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>
                        🔠 נתח את «{firstWord}» בכלי משחקי-האותיות ←
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Discourse target={{ type: "contributor", id: slug }} origin="profile" archive={[]} />
      </WriterSlot>

      {/* ═══ סלוט 10 · 📁 תיק החוקר ═══ (מטא-מחקר · השפעה · בקרת-בעלים · נתונים-אישיים אדמין) */}
      <WriterSlot P={P} emoji="📁" title="תיק החוקר" empty={dossierEmpty} emptyText="התיק עדיין ריק.">
        {effIsOwner && <OwnerControls P={P} visibility={settings.visibility} onSave={v => saveSettings({ visibility: v })} />}
        <PersonalDataCard P={P} slug={c.slug} isAdmin={effIsAdmin} />
        <ResearcherStatsCard P={P} c={c} name={c.display_name} level={level} />
        <ImpactBar P={P} level={level} matrices={matrices} />
      </WriterSlot>
    </div>
    </div>
    </PaletteProvider>
  );
}
function chip(P, on) {
  return { cursor: "pointer", borderRadius: 999, padding: "8px 14px", minHeight: 38, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800,
    border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : "none", color: on ? P.accentText : P.inkSoft };
}
