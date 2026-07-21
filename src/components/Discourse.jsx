import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ResearcherBadge from "./ResearcherBadge.jsx";
import ResearcherLink from "./ResearcherLink.jsx";
import ReactionBar from "./ReactionBar.jsx";
import {
  INTENTS, intentMeta, stateMeta, getContributions, addContribution,
  linkContribution, approveContribution, moderateContribution, getForumFeed, forumItemMeta,
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
  const pending = c.status === "pending";
  const mine = user && c.author_user_id === user.id;

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
    <div style={{ background: P.cardGrad, border: `1px solid ${pending ? P.borderStrong : P.border}`, borderRadius: 13, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
        {badge("transparent", P.accentText, `${im.emoji} ${im.label}`)}
        {badge("transparent", P.accentDim, `${sm.emoji} ${sm.label}`)}
        {pending && badge("rgba(212,175,55,0.16)", P.accentText, "⏳ ממתין לאישור")}
        <span style={{ flex: 1 }} />
        <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(c.created_at)}</span>
      </div>
      {c.title && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>}
      {c.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{c.body}</div>}
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
        {isAdmin && pending && <button disabled={busy} onClick={approve} style={goldBtn(P)}>✅ אשר</button>}
        {isAdmin && <button disabled={busy} onClick={hide} style={linkBtn(P)}>✖ הסתר</button>}
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
          {kids.map(k => {
            const kim = intentMeta(k.intent);
            return (
              <div key={k.id}>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{kim.emoji} {k.body}</div>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 3 }}>— {k.author_name ? <ResearcherLink name={k.author_name} style={{ color: P.accentText, fontWeight: 700, textDecoration: "none" }} /> : "חבר הקהילה"} · {timeAgo(k.created_at)}{k.status === "pending" ? " · ⏳" : ""}</div>
              </div>
            );
          })}
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

// ── מלחין: הוספת תרומה (רשומים + אנונימי) ──
function Composer({ P, origin, target, replyTo, onDone, anon = false }) {
  const [intent, setIntent] = useState(replyTo ? "תגובה" : (anon ? "תגובה" : "חידוש"));
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [st, setSt] = useState("idle");
  const live = anon ? false : intentMeta(intent).live;   // אנונימי → תמיד עובר אישור (לא מיידי)

  async function submit() {
    const t = body.trim(); if (!t) return;
    setSt("sending");
    try {
      await addContribution({ intent, origin, body: t, targetType: target.type, targetId: target.id, parentId: replyTo || null,
        authorName: anon ? (name.trim() || null) : null });
      setBody(""); setSt("done"); onDone?.(live);
      setTimeout(() => setSt("idle"), 2500);
    } catch (e) {
      setSt("idle");
      const m = String(e?.message || e);
      alert(m.includes("rate_limited") ? "שלחת כמה תגובות ברצף — נסה שוב בעוד שעה 🙂" : "שגיאה בשליחה: " + m);
    }
  }

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
      <textarea value={body} onChange={e => setBody(e.target.value)} autoFocus={!!replyTo}
        placeholder={replyTo ? "הוסיפו תגובה…" : anon ? "כתבו תגובה…" : `שתפו ${intentMeta(intent).label} — התרומה תיכנס ל«מחקר הקהילתי»`}
        style={{ width: "100%", boxSizing: "border-box", minHeight: replyTo ? 64 : 92, resize: "vertical",
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 13px",
          color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, outline: "none" }} />
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
export default function Discourse({ target, origin = "number", archive = [], focusId = null }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState(null);
  const writeOnly = origin === "forum";   // 🌳 פורום = write-only; דפי-מספר/פסוק/צופן/פרופיל = רדוד רגיל
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
  const list = items || [];
  // מיקוד: רק התרומה הממוקדת (root יחיד). אחרת — כל ה-roots של הישות.
  const roots = focusId ? list.filter(c => c.id === focusId) : list.filter(c => !c.parent_id);
  const kidsOf = id => list.filter(c => c.parent_id === id);
  const n = intent => list.filter(c => c.intent === intent).length;
  const validated = list.filter(c => ["validated", "canonical"].includes(c.research_state)).length;

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
