import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { METHODS } from "../lib/gematria.js";
import ResearcherBadge from "./ResearcherBadge.jsx";
import ResearcherLink from "./ResearcherLink.jsx";
import ReactionBar from "./ReactionBar.jsx";
import {
  INTENTS, intentMeta, stateMeta, getContributions, addContribution,
  linkContribution, approveContribution, moderateContribution, editContribution, removeContribution,
  featureContribution, markAnswer, getForumFeed, forumItemMeta,
} from "../lib/contributions.js";

// 🔬 מחקר קהילתי — עדשה אחת על research_contributions לישות נתונה (מספר/פסוק/צופן/פוסט…).
// «מחקר קהילתי», לא «תגובות» (research_contribution_law). ידע מבוקר · רשת-קשרים.
// מקור-אמת אחד — אותו רכיב בכל דף. theme-aware דרך usePalette.
// 🌳 write-only רק בפורום (origin="forum", החלטת צוריאל 21.7.2026): שם כותבים תרומה עצמאית ולא
// מגיבים בשרשור — החיבור נעשה דרך «🔗 מצאתי קשר» (edge בגרף, עקבי עם unified_graph_law). בכל שאר
// המקומות (דפי-מספר/פסוק/צופן/פרופיל/בית-מדרש) — רדוד רגיל («💬 הגב») נשאר כרגיל.

function timeAgo(ts) {
  if (!ts) return "";
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return "";   // ⛔ תאריך חסר/שגוי → ריק, לא «Invalid Date»
  const d = (Date.now() - t) / 1000;
  if (d < 60) return "עכשיו";
  if (d < 3600) return `לפני ${Math.floor(d / 60)} דק׳`;
  if (d < 86400) return `לפני ${Math.floor(d / 3600)} שע׳`;
  if (d < 604800) return `לפני ${Math.floor(d / 86400)} ימים`;
  return new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}


// כרטיס תרומה בודד (+ ילדיו כתגובות, רמה אחת). writeOnly (פורום) → בלי «הגב»/רדוד, רק «מצאתי קשר».
function ContribCard({ c, kids, P, user, isAdmin, origin, target, onReply, onChanged, writeOnly = false }) {
  const im = intentMeta(c.intent), sm = stateMeta(c.research_state);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkVal, setLinkVal] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const pending = c.status === "pending";
  const mine = user && c.author_user_id === user.id;
  const canEdit = isAdmin || mine;   // ✏️ המחבר עורך את שלו · אדמין את של כולם (נאכף גם בשרת)

  async function saveEdit() { const t = editBody.trim(); if (!t) return; setBusy(true); try { await editContribution(c.id, t); setEditing(false); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function remove() { if (!window.confirm(mine ? "למחוק את התגובה שלך?" : "למחוק את התגובה?")) return; setBusy(true); try { await removeContribution(c.id); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function toggleFeature() { setBusy(true); try { await featureContribution(c.id, !c.is_featured); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function toggleAnswer() { setBusy(true); try { await markAnswer(c.id, !c.is_answer); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function approve() { setBusy(true); try { await approveContribution(c.id); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function hide() { setBusy(true); try { await moderateContribution(c.id, "hidden"); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function doLink() {
    const v = linkVal.trim(); if (!v) return;
    setBusy(true);
    try { await linkContribution({ fromId: c.id, targetType: "number", targetId: v, relation: "related" }); setLinking(false); setLinkVal(""); onChanged(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); }
  }

  const badge = (bg, col, txt) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: bg, color: col, borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>{txt}</span>
  );

  return (
    <div style={{ background: P.cardGrad, border: `1px solid ${c.is_featured ? "#d4af37" : pending ? P.borderStrong : P.border}`, borderRadius: 13, padding: "13px 15px", boxShadow: c.is_featured ? "0 0 0 1px #d4af37 inset" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
        {c.is_answer && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#1f8a4c", color: "#fff", borderRadius: 999, padding: "1px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>✅ תשובה מאושרת</span>}
        {c.is_featured && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>⭐ תגובה מובחרת</span>}
        {c.convergence_slug && <Link to={`/topic/${c.convergence_slug}`} title="נוצרה מכאן התכנסות" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999, padding: "1px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>✦ יצר התכנסות ←</Link>}
        {badge("transparent", P.accentText, `${im.emoji} ${im.label}`)}
        {badge("transparent", P.accentDim, `${sm.emoji} ${sm.label}`)}
        {pending && badge("rgba(212,175,55,0.16)", P.accentText, "⏳ ממתין לאישור")}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.created_at)}</span>
      </div>
      {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>}
      {editing ? (
        <div style={{ display: "grid", gap: 8 }}>
          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} autoFocus
            style={{ width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 9, padding: "10px 12px", color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, outline: "none" }} />
          <div style={{ display: "flex", gap: 7 }}>
            <button disabled={busy || !editBody.trim()} onClick={saveEdit} style={{ ...goldBtn(P), opacity: editBody.trim() ? 1 : 0.5 }}>💾 שמור</button>
            <button onClick={() => setEditing(false)} style={linkBtn(P)}>ביטול</button>
          </div>
        </div>
      ) : (
        c.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{c.body}</div>
      )}
      {/* 🌳 עדשה עשירה — תמונה/ריבוע-גימטריה/גשר/צופן/לינקי-מספר (תגובה מובחרת) */}
      <FeaturedExtras c={c} P={P} />
      {/* שורת-קרדיט — הכותב מופרד מהתוכן */}
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginTop: 8 }}>
        {c.author_name
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>✍️ <ResearcherBadge name={c.author_name} uid={c.author_user_id} size={22} /></span>
          : <>✍️ נכתב על ידי <b style={{ color: P.accentText }}>חבר הקהילה</b></>}
      </div>
      {/* 👍 ריאקציות */}
      <div style={{ marginTop: 9 }}><ReactionBar id={c.id} reactions={c.reactions} /></div>
      {/* פעולות — «הגב» (רדוד) בכל מקום רגיל; בפורום (writeOnly) מוסתר, מחברים דרך «מצאתי קשר» */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9, alignItems: "center" }}>
        {!writeOnly && <button onClick={() => onReply(c.id)} style={linkBtn(P)}>💬 הגב</button>}
        {user && <button onClick={() => setLinking(v => !v)} style={linkBtn(P)}>🔗 מצאתי קשר</button>}
        {canEdit && !editing && <button onClick={() => { setEditBody(c.body || ""); setEditing(true); }} style={linkBtn(P)}>✏️ ערוך</button>}
        {canEdit && <button disabled={busy} onClick={remove} style={linkBtn(P)}>🗑 מחק</button>}
        {isAdmin && c.parent_id && <button disabled={busy} onClick={toggleAnswer} style={linkBtn(P)}>{c.is_answer ? "✅ בטל תשובה" : "✅ סמן כתשובה"}</button>}
        {isAdmin && <button disabled={busy} onClick={toggleFeature} style={linkBtn(P)}>{c.is_featured ? "⭐ בטל מובחרת" : "⭐ מובחרת"}</button>}
        {isAdmin && pending && <button disabled={busy} onClick={approve} style={goldBtn(P)}>✅ אשר</button>}
        {isAdmin && !mine && <button disabled={busy} onClick={hide} style={linkBtn(P)}>✖ הסתר</button>}
      </div>
      {linking && (
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap", alignItems: "center" }}>
          <input value={linkVal} onChange={e => setLinkVal(e.target.value)} placeholder="מספר/עוגן לקישור (למשל 116)"
            style={{ flex: 1, minWidth: 140, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 8, padding: "7px 10px", color: P.ink, fontFamily: F.body, fontSize: 13, outline: "none" }} />
          <button disabled={busy} onClick={doLink} style={goldBtn(P)}>חבר לגרף</button>
        </div>
      )}
      {/* תגובות (רמה אחת) — לא בפורום (writeOnly) */}
      {!writeOnly && kids?.length > 0 && (
        <div style={{ marginTop: 11, paddingInlineStart: 12, borderInlineStart: `2px solid ${P.border}`, display: "grid", gap: 9 }}>
          {[...kids].sort((a, b) => (b.is_answer ? 1 : 0) - (a.is_answer ? 1 : 0)).map(k => (
            <ReplyItem key={k.id} k={k} P={P} user={user} isAdmin={isAdmin} origin={origin} target={target} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

// 💬 תגובה בודדת (רמה אחת). עשירה (מובחרת/תמונה/גימטריה) → כרטיס מלא; רגילה → שורה קומפקטית
// עם ריאקציות + מודרציית-אדמין (אישור/הסתרה) — כדי שאפשר יהיה לטפל בתגובות-אנונימי הממתינות לאישור.
function ReplyItem({ k, P, user, isAdmin, origin, target, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const pending = k.status === "pending";
  const kim = intentMeta(k.intent);
  const mineK = user && k.author_user_id === user.id;
  const canEdit = isAdmin || mineK;   // ✏️ המחבר/אדמין
  async function saveEdit() { const t = editBody.trim(); if (!t) return; setBusy(true); try { await editContribution(k.id, t); setEditing(false); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function remove() { if (!window.confirm(mineK ? "למחוק את התגובה שלך?" : "למחוק את התגובה?")) return; setBusy(true); try { await removeContribution(k.id); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function toggleAnswer() { setBusy(true); try { await markAnswer(k.id, !k.is_answer); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function toggleFeature() { setBusy(true); try { await featureContribution(k.id, !k.is_featured); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function approve() { setBusy(true); try { await approveContribution(k.id); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  async function hide() { setBusy(true); try { await moderateContribution(k.id, "hidden"); onChanged(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(false); } }
  // תגובה עשירה/מובחרת/תשובה → כרטיס מלא (writeOnly, בלי ילדים — רמה אחת). כולל עריכה (ContribCard).
  if (k.is_featured || k.is_answer || k.image_url || k.gematria_claim) {
    return <ContribCard c={k} kids={[]} P={P} user={user} isAdmin={isAdmin} origin={origin} target={target} writeOnly onReply={() => {}} onChanged={onChanged} />;
  }
  return (
    <div>
      {editing ? (
        <div style={{ display: "grid", gap: 7 }}>
          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} autoFocus
            style={{ width: "100%", boxSizing: "border-box", minHeight: 64, resize: "vertical", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 8, padding: "8px 10px", color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, outline: "none" }} />
          <div style={{ display: "flex", gap: 7 }}>
            <button disabled={busy || !editBody.trim()} onClick={saveEdit} style={{ ...goldBtn(P), padding: "4px 13px", fontSize: 12, opacity: editBody.trim() ? 1 : 0.5 }}>💾 שמור</button>
            <button onClick={() => setEditing(false)} style={{ ...linkBtn(P), padding: "4px 12px", fontSize: 12 }}>ביטול</button>
          </div>
        </div>
      ) : (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{kim.emoji} {k.body}</div>
      )}
      {!editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>— {k.author_name ? <ResearcherLink name={k.author_name} style={{ color: P.accentText, fontWeight: 700, textDecoration: "none" }} /> : "חבר הקהילה"} · {timeAgo(k.created_at)}{pending ? " · ⏳ ממתין" : ""}</span>
          <ReactionBar id={k.id} reactions={k.reactions} compact />
          {canEdit && <button onClick={() => { setEditBody(k.body || ""); setEditing(true); }} style={{ ...linkBtn(P), padding: "3px 11px", fontSize: 11.5 }}>✏️ ערוך</button>}
          {canEdit && <button disabled={busy} onClick={remove} style={{ ...linkBtn(P), padding: "3px 11px", fontSize: 11.5 }}>🗑 מחק</button>}
          {isAdmin && <button disabled={busy} onClick={toggleAnswer} style={{ ...linkBtn(P), padding: "3px 11px", fontSize: 11.5 }}>✅ סמן כתשובה</button>}
          {isAdmin && <button disabled={busy} onClick={toggleFeature} style={{ ...linkBtn(P), padding: "3px 11px", fontSize: 11.5 }}>⭐ מובחרת</button>}
          {isAdmin && pending && <button disabled={busy} onClick={approve} style={{ ...goldBtn(P), padding: "3px 11px", fontSize: 11.5 }}>✅ אשר</button>}
          {isAdmin && !mineK && <button disabled={busy} onClick={hide} style={{ ...linkBtn(P), padding: "3px 11px", fontSize: 11.5 }}>✖ הסתר</button>}
        </div>
      )}
    </div>
  );
}

function linkBtn(P) {
  return { cursor: "pointer", background: "transparent", border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 12px" };
}
function goldBtn(P) {
  return { cursor: "pointer", background: P.accentBtn, border: "none", color: P.onAccent || "#1a0e00", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "6px 15px" };
}

// 🌳 עדשה עשירה ל«תגובה מובחרת» — תמונה + ריבוע-גימטריה מאומת + גשר + לינק-צופן + לינקי-מספר.
//   הכל נשען על שדות מובנים (image_url + gematria_claim) — עץ אחד: הלינקים מצביעים לצמתים, לא משכפלים.
function FeaturedExtras({ c, P }) {
  const gc = c.gematria_claim || {};
  const rows = Array.isArray(gc.rows) ? gc.rows : [];
  const bridge = gc.bridge, els = gc.els;
  const links = Array.isArray(gc.links) ? gc.links : [];
  if (!c.image_url && !rows.length && !bridge && !els && !links.length) return null;
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 11 }}>
      {c.image_url && (
        <img src={c.image_url} alt="" loading="lazy"
          style={{ width: "100%", maxWidth: 320, borderRadius: 12, border: `1px solid ${P.border}`, display: "block" }} />
      )}
      {rows.length > 0 && (
        <div style={{ background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 12, padding: "11px 13px" }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 6 }}>🔢 גימטריה — עובדה מאומתת במנוע</div>
          <div style={{ display: "grid", gap: 4 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6 }}>
                <b style={{ color: P.accentText }}>{r.value}</b> = {r.method}{r.note ? <span style={{ color: P.accentDim }}> · {r.note}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {bridge && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>
          🌉 גשר: <Link to={bridge.href || `/number/${bridge.value}`} style={{ color: P.accentText, fontWeight: 700, textDecoration: "none", borderBottom: `1px dotted ${P.accentText}` }}>{bridge.phrase} = {bridge.value}</Link>
        </div>
      )}
      {els && (
        <Link to={els.href || "/research?tool=els"} style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
          🔠 בצופן: דילוג {els.skip} — פתחו בצופן ←
        </Link>
      )}
      {links.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {links.map(l => (
            <Link key={l} to={l} style={{ ...linkBtn(P), textDecoration: "none" }}>{String(l).split("/").pop()}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── מלחין: הוספת תרומה (רשומים + אנונימי) ──
function Composer({ P, origin, target, replyTo, onDone, anon = false }) {
  const [intent, setIntent] = useState(replyTo ? "תגובה" : (anon ? "תגובה" : "חידוש"));
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [st, setSt] = useState("idle");
  // 🔢 מיני-מחשבון גימטריה (מנוע רשמי) + 📷 העלאת תמונה — «תגובה = עדות-מחקר»
  const [gemOpen, setGemOpen] = useState(false);
  const [gemInput, setGemInput] = useState("");
  const [gemRows, setGemRows] = useState([]);   // 🔢 ערכי-גימטריה שנוספו — לתיוג-לעץ + סגנון-מאומת
  const [imageUrl, setImageUrl] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const live = anon ? false : intentMeta(intent).live;   // אנונימי → תמיד עובר אישור (לא מיידי)

  // ⚖️ ערך רגיל מהמנוע הרשמי (gematria_engine_law — לא ידני/זיכרון)
  const ragilFn = METHODS.find(m => m.key === "רגיל")?.fn;
  const gemVal = (gemInput.trim() && ragilFn) ? ragilFn(gemInput) : null;
  function insertGem() {
    const phrase = gemInput.trim();
    if (!phrase || gemVal == null) return;
    setBody(b => (b && !b.endsWith("\n") ? b + "\n" : b) + `«${phrase}» = ${gemVal}`);
    // 🌳 תיוג-לעץ: כל ערך שנוסף נשמר → התגובה תתחבר לצומת-המספר ותקבל סגנון-מאומת (כמו primary_value בתמונה)
    setGemRows(r => [...r, { value: gemVal, method: "רגיל", note: `«${phrase}»` }]);
    setGemInput(""); setGemOpen(false);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  async function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { alert("קובץ-תמונה בלבד"); return; }
    if (file.size > 8 * 1024 * 1024) { alert("תמונה עד 8MB"); return; }
    setImgBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `sod1820/replies/r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (error) throw error;
      setImageUrl(supabase.storage.from("gallery").getPublicUrl(path).data?.publicUrl || null);
    } catch (err) { alert("שגיאה בהעלאת התמונה: " + (err.message || err)); }
    finally { setImgBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function submit() {
    const t = body.trim();
    if (!t && imageUrl) { alert("הוסיפו שורת-הסבר קצרה לתמונה 🙂"); return; }
    if (!t) return;
    setSt("sending");
    try {
      // 🌳 תגובת-גימטריה → gematria_claim: (א) סגנון «🔢 עובדה מאומתת במנוע» אוטומטי (סגנון-לפי-סוג);
      //    (ב) links לצמתי-המספר = חיבור-לעץ (כמו all_values בתמונת-מציאות). numbers = תגי-המספר ללשונית.
      const nums = [...new Set(gemRows.map(r => r.value).filter(v => v > 0))];
      const gematriaClaim = gemRows.length
        ? { rows: gemRows, links: nums.map(n => `/number/${n}`), numbers: nums }
        : null;
      await addContribution({ intent, origin, body: t, targetType: target.type, targetId: target.id, parentId: replyTo || null,
        authorName: anon ? (name.trim() || null) : null, imageUrl, gematriaClaim });
      setBody(""); setImageUrl(null); setGemRows([]); setSt("done"); onDone?.(live);
      setTimeout(() => setSt("idle"), 2500);
    } catch (e) {
      setSt("idle");
      const m = String(e?.message || e);
      alert(m.includes("rate_limited") ? "שלחת כמה תגובות ברצף — נסה שוב בעוד שעה 🙂" : "שגיאה בשליחה: " + m);
    }
  }

  const iconBtn = { cursor: "pointer", background: "transparent", border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 12px" };

  return (
    <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 13, padding: "13px 15px" }}>
      {/* אנונימי — שם להצגה (לא חובה, ברירת-מחדל «אורח») */}
      {anon && (
        <input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך (לא חובה) — יוצג ליד התגובה"
          maxLength={40} style={{ width: "100%", boxSizing: "border-box", marginBottom: 9, background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 9, padding: "9px 12px", color: P.ink, fontFamily: F.body, fontSize: 13.5, outline: "none" }} />
      )}
      {!replyTo && !anon && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
          {INTENTS.map(i => (
            <button key={i.key} onClick={() => setIntent(i.key)} style={{
              cursor: "pointer", borderRadius: 999, padding: "4px 11px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${intent === i.key ? P.borderStrong : P.border}`,
              background: intent === i.key ? "rgba(212,175,55,0.15)" : "transparent",
              color: intent === i.key ? P.accentText : P.accentDim,
            }}>{i.emoji} {i.label}</button>
          ))}
        </div>
      )}
      <textarea ref={taRef} value={body} onChange={e => setBody(e.target.value)} autoFocus={!!replyTo}
        placeholder={replyTo ? "הוסיפו תגובה…" : anon ? "כתבו תגובה…" : `שתפו ${intentMeta(intent).label} — התרומה תיכנס ל«מחקר הקהילתי»`}
        style={{ width: "100%", boxSizing: "border-box", minHeight: replyTo ? 64 : 92, resize: "vertical",
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 13px",
          color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, outline: "none" }} />
      {/* 🔧 סרגל-כלים: 🔢 גימטריה מאומתת במנוע · 📷 תמונה */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <button onClick={() => setGemOpen(v => !v)} style={iconBtn}>🔢 גימטריה</button>
        <button onClick={() => fileRef.current?.click()} disabled={imgBusy} style={iconBtn}>{imgBusy ? "מעלה…" : "📷 תמונה"}</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
      </div>
      {/* מיני-מחשבון — חישוב במנוע והזרקת «ביטוי = ערך» מאומת לתגובה */}
      {gemOpen && (
        <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center", background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 11px" }}>
          <input value={gemInput} onChange={e => setGemInput(e.target.value)} placeholder="ביטוי לחישוב במנוע…" dir="rtl"
            style={{ flex: 1, minWidth: 150, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 8, padding: "7px 10px", color: P.ink, fontFamily: F.body, fontSize: 13.5, outline: "none" }} />
          {gemVal != null && <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 15, fontWeight: 900 }}>= {gemVal}</span>}
          <button onClick={insertGem} disabled={gemVal == null} style={{ ...goldBtn(P), opacity: gemVal != null ? 1 : 0.5, padding: "6px 13px" }}>הוסף לתגובה</button>
        </div>
      )}
      {/* תצוגת-תמונה מקדימה */}
      {imageUrl && (
        <div style={{ marginTop: 9, position: "relative", display: "inline-block" }}>
          <img src={imageUrl} alt="" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 10, border: `1px solid ${P.border}`, display: "block" }} />
          <button onClick={() => setImageUrl(null)} title="הסר תמונה" style={{ position: "absolute", top: 4, insetInlineEnd: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>✕</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, flex: 1 }}>
          {anon ? "🔒 כאורח — התגובה תופיע אחרי אישור מהיר" : live ? "💬 תגובה — עולה מיד" : "🔒 ידע — יעבור אישור לפני פרסום"}
        </span>
        {st === "done" && <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{live ? "✓ פורסם" : "✓ נשלח לאישור"}</span>}
        <button onClick={submit} disabled={st === "sending" || !body.trim()} style={{ ...goldBtn(P), opacity: body.trim() ? 1 : 0.5, padding: "8px 22px", fontSize: 13.5 }}>
          {st === "sending" ? "שולח…" : "✦ שלח"}
        </button>
      </div>
    </div>
  );
}

// focusId — מיקוד לתרומה אחת (עמוד-הפורום /forum/:id): מציג רק את התרומה הזו.
// writeOnly — נגזר מ-origin==="forum": בפורום כותבים בלבד (בלי רדוד), בשאר המקומות רדוד רגיל.
export default function Discourse({ target, origin = "number", archive = [], focusId = null, repliesOnly = false, onActivity = null }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  // 💬 החלטת צוריאל: מגיבים בתוך הפורום (רדוד רגיל בכל מקום). *מבחוץ* (בפיד) לא מציגים ספירת/סימן תגובות.
  const writeOnly = false;
  const [replyTo, setReplyTo] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [lastForum, setLastForum] = useState(null);   // ההודעה האחרונה בפורום (למצב-ריק)

  const load = useCallback(() => {
    if (!target?.id) return;
    getContributions(target.type, target.id).then(setItems).catch(() => setItems([]));
  }, [target?.type, target?.id]);
  useEffect(() => { load(); }, [load]);
  // מצב-ריק → מציג את ההודעה האחרונה בפורום (מצביע, לא משכפל)
  useEffect(() => { getForumFeed({ limit: 1 }).then(f => setLastForum(f && f[0])).catch(() => {}); }, []);

  if (!target?.id) return null;
  // 🛡️ רשת-ביטחון: מוסתר/נדחה = מחוק — לעולם לא מוצג (גם אם מקור כלשהו החזיר אותו).
  const list = (items || []).filter(c => c.status !== "hidden" && c.status !== "rejected");
  // מיקוד: רק התרומה הממוקדת (root יחיד). אחרת — כל ה-roots של הישות.
  const roots = focusId ? list.filter(c => c.id === focusId) : list.filter(c => !c.parent_id);
  const kidsOf = id => list.filter(c => c.parent_id === id);
  const n = intent => list.filter(c => c.intent === intent).length;
  const validated = list.filter(c => ["validated", "canonical"].includes(c.research_state)).length;

  // 💬 מצב «תגובות בלבד» — הרחבה inline מכרטיס-הפורום. הכרטיס עצמו כבר מוצג ע"י ההורה (ForumFeed),
  // ולכן כאן מציגים רק את התגובות (ילדי focusId לפי parent_id — לא תלוי ביעד) + מלחין-תגובה.
  // כך אין כפילות של הכרטיס, והתגובות נראות גם לפריט-פורום שאין לו יעד-מספר (target=forum:id).
  if (repliesOnly && focusId) {
    const replies = list.filter(c => c.parent_id === focusId).sort((a, b) => (b.is_answer ? 1 : 0) - (a.is_answer ? 1 : 0));
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {items === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13, padding: 4 }}>טוען תגובות…</div>
        ) : (
          <>
            {replies.length > 0 && (
              <div style={{ display: "grid", gap: 9 }}>
                {replies.map(k => (
                  <ReplyItem key={k.id} k={k} P={P} user={user} isAdmin={isAdmin} origin={origin} target={target} onChanged={load} />
                ))}
              </div>
            )}
            <Composer P={P} origin={origin} target={target} replyTo={focusId} anon={!user} onDone={() => { load(); onActivity?.(); }} />
          </>
        )}
      </div>
    );
  }

  const counts = [
    ["💡", n("חידוש"), "חידושים"], ["🧩", n("השערה"), "השערות"],
    ["📚", n("מקור"), "מקורות"], ["❓", n("שאלה"), "שאלות"], ["⭐", validated, "אושרו"],
  ].filter(c => c[1] > 0);

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: P.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>🔬 מחקר קהילתי</span>
        {counts.length > 0 && (
          <span style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {counts.map(([e, v, l]) => (
              <span key={l} style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{e} {v} {l}</span>
            ))}
          </span>
        )}
      </div>

      {/* מלחין — פתוח לכולם. אנונימי מקבל שדה-שם ומגיב מיד; רשומים מקבלים את כל סוגי-הידע.
          במצב-מיקוד (focusId, עמוד-פורום) מוסתר: שם קוראים ומחברים («מצאתי קשר»), לא כותבים תרומה חדשה. */}
      {!focusId && <Composer P={P} origin={origin} target={target} onDone={load} anon={!user} />}
      {!focusId && !user && (
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: -4 }}>
          מגיבים כאורח — או <Link to="/login" style={{ color: P.accentText, fontWeight: 700, textDecoration: "none" }}>התחברו לפרופיל קבוע ✨</Link>
        </div>
      )}

      {items === null ? (
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13, padding: 12 }}>טוען…</div>
      ) : !roots.length ? (
        // מצב-ריק: במקום «אין מחקר» — ההודעה האחרונה בפורום, לחיצה עוברת לפורום
        lastForum ? (() => {
          const meta = forumItemMeta(lastForum);
          const when = timeAgo(meta.when);
          const who = meta.who;
          const text = stripHtml(meta.text).slice(0, 120) || meta.label;
          return (
            <Link to={meta.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{ background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 13, padding: "12px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>🌐 מהפורום</span>
                  <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 9px" }}>{meta.em} {meta.label}</span>
                  <span style={{ flex: 1 }} />
                  {when && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>{when}</span>}
                </div>
                <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7 }}>{text}</div>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 5 }}>✍️ {who}</div>
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginTop: 7 }}>לפורום המחקר ←</div>
              </div>
            </Link>
          );
        })() : null
      ) : (
        <div style={{ display: "grid", gap: 11 }}>
          {roots.map(c => (
            <div key={c.id}>
              <ContribCard c={c} kids={writeOnly ? [] : kidsOf(c.id)} P={P} user={user} isAdmin={isAdmin} origin={origin} target={target}
                writeOnly={writeOnly} onReply={id => setReplyTo(replyTo === id ? null : id)} onChanged={load} />
              {!writeOnly && replyTo === c.id && (
                <div style={{ marginTop: 8, paddingInlineStart: 12 }}>
                  <Composer P={P} origin={origin} target={target} replyTo={c.id} anon={!user} onDone={() => { setReplyTo(null); load(); }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 💬 ארכיון דיוני-וורדפרס — מקופל בתוך אותו מדור (לא מערכת נפרדת; לא מועתק) */}
      {archive?.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setShowArchive(v => !v)} style={{ ...linkBtn(P), width: "100%", textAlign: "center", padding: "8px 12px" }}>
            {showArchive ? "▴ הסתר" : "▾ הצג"} 💬 דיונים מהארכיון (וורדפרס) · {archive.length}
          </button>
          {showArchive && (
            <div style={{ display: "grid", gap: 9, marginTop: 9 }}>
              {archive.map((c, i) => (
                <div key={c.wp_id || i} style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 11, padding: "11px 13px" }}>
                  <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{stripHtml(c.content).slice(0, 260)}</div>
                  {c.author_name && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 5 }}>— {c.author_name} · ארכיון</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
