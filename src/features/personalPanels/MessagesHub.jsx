// Shared personal-account messages panel (RPC bound). Owned here so 2029 does not load the Legacy UserCenter drawer shell.
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { genAvatar } from "../../lib/avatar.js";
import { dmInbox, dmThread, dmSend, repliesToMe, myContributions } from "../../lib/commandCenter.js";
import { personalMessagesReturnHref, writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";

const PERSONAL_REPLY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERSONAL_REPLY_COMMUNITY_ORIGINS = new Set(["openweb", "community_2029"]);

export function personalReplyContext(row, returnTo = "/2029/me/messages") {
  const origin = String(row?.origin || "");
  if (PERSONAL_REPLY_COMMUNITY_ORIGINS.has(origin) && PERSONAL_REPLY_UUID.test(row?.thread_root_id || "")) {
    const replyId = PERSONAL_REPLY_UUID.test(row?.id || "") ? row.id : "";
    const rawPath = Array.isArray(row?.thread_path) ? row.thread_path : [];
    const path = rawPath.filter((id) => PERSONAL_REPLY_UUID.test(id));
    const safePath = path[0] === row.thread_root_id && (!replyId || path[path.length - 1] === replyId) ? path : [row.thread_root_id, replyId].filter(Boolean);
    const query = new URLSearchParams({ preview: "community", data: "live", thread: row.thread_root_id, returnTo: personalMessagesReturnHref(returnTo) || "/2029/me/messages" });
    if (replyId) query.set("reply", replyId);
    if (safePath.length > 1) query.set("path", safePath.join(","));
    if (PUBLIC_READING_RELEASE) { query.delete("preview"); query.delete("data"); }
    return { kind: "community", label: origin === "openweb" ? "הצ׳אט הוותיק" : "הקהילה", href: `${PUBLIC_READING_RELEASE ? "/community/chat" : "/2029"}?${query}` };
  }
  if (row?.target_type === "number" && row?.target_id) return { kind: "research", label: "מספר ומחקר", href: `/number/${encodeURIComponent(row.target_id)}` };
  if (row?.convergence_slug) return { kind: "research", label: "נושא ומחקר", href: `/topic/${encodeURIComponent(row.convergence_slug)}` };
  return { kind: "research", label: "תרומה מחקרית", href: null };
}

// 📨 ההודעות שלי — שני טאבים: 💬 הודעות פרטיות (DM) · 🗣 תגובות לפוסטים ולתרומות.
export default function MessagesHub({ T, goto, initialDm = null, resolveWriterHref, messageNavigation = null }) {
  const [localTab, setLocalTab] = useState("dm");
  const tab = messageNavigation?.tab || localTab;
  const setTab = next => messageNavigation ? messageNavigation.onChange({ ...messageNavigation, tab: next }) : setLocalTab(next);
  const tabBtn = (active) => ({ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${active ? T.acc : T.line}`, background: active ? T.accSoft : T.card, color: active ? T.acc : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("dm")} style={tabBtn(tab === "dm")}>💬 הודעות</button>
        <button onClick={() => setTab("replies")} style={tabBtn(tab === "replies")}>🗣 תגובות אליי</button>
      </div>
      {tab === "dm" ? <InboxPanel T={T} initialDm={initialDm} resolveWriterHref={resolveWriterHref} /> : <RepliesPanel T={T} goto={goto} messageNavigation={messageNavigation} />}
    </div>
  );
}

// 🗣 תגובות אליי — תגובות של אחרים לפוסטים בקהילה ולתרומות מחקריות (RPC replies_to_me).
// §4, COMMAND_CENTER_ATTENTION_CLOSURE Pass 1: תיקון-נעלמות — LIMIT קבוע (50) בלי pagination
// היה חוסם כל תגובה מעבר לזה, בלי דרך לראות אותה. עכשיו: "טען עוד" עם cursor (p_before, אותה
// RPC replies_to_me מורחבת) — סדר חדש→ישן נשמר, שום store חדש.
const REPLIES_PAGE = 50;
function RepliesPanel({ T, goto, messageNavigation = null }) {
  const [rows, setRows] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);   // עמוד אחרון החזיר פחות מ-REPLIES_PAGE → אין עוד
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pages, setPages] = useState(1);
  const [restoring, setRestoring] = useState(true);
  const mounted = useRef(false);
  const listRef = useRef(null);
  const restored = useRef(false);
  const initialNavigation = useRef(messageNavigation);
  useEffect(() => {
    let alive = true; mounted.current = true; restored.current = false;
    setError(""); setRows(null); setRestoring(true); setPages(1);
    (async () => {
      let loaded = [], cursor = null;
      const wanted = initialNavigation.current?.replyPages || 1;
      for (let page = 1; page <= wanted; page++) {
        const more = await repliesToMe(REPLIES_PAGE, cursor, { strict: true });
        if (!alive) return;
        loaded = [...loaded, ...more.filter(row => !loaded.some(previous => previous.id === row.id))];
        setRows(loaded); setPages(page); setDone(more.length < REPLIES_PAGE);
        const next = more.at(-1)?.created_at;
        if (more.length < REPLIES_PAGE || !next || next === cursor) break;
        cursor = next;
      }
    })().catch(() => { if (alive) { setRows(previous => previous || []); setError("לא ניתן לטעון את התגובות כרגע."); } })
      .finally(() => { if (alive) setRestoring(false); });
    return () => { alive = false; mounted.current = false; };
  }, [attempt]);
  useEffect(() => {
    const navigation = initialNavigation.current;
    if (restoring || restored.current || !navigation?.replyAnchor || !rows?.length) return;
    restored.current = true;
    const target = listRef.current?.querySelector(`[data-reply-id="${navigation.replyAnchor}"]`);
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      window.scrollBy({ top: target.getBoundingClientRect().top - navigation.replyOffset, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [restoring, rows]);
  const loadMore = async () => {
    if (loadingMore || restoring || done || !rows?.length) return;
    setLoadingMore(true);
    try {
      const cursor = rows[rows.length - 1]?.created_at;
      const more = await repliesToMe(REPLIES_PAGE, cursor, { strict: true });
      if (!mounted.current) return;
      setRows(prev => [...(prev || []), ...(more || []).filter(row => !prev?.some(previous => previous.id === row.id))]);
      setPages(value => value + 1);
      messageNavigation?.onChange({ ...messageNavigation, tab: "replies", replyPages: pages + 1, replyAnchor: null });
      if ((more || []).length < REPLIES_PAGE) setDone(true);
    } catch { if (mounted.current) setError("לא ניתן לטעון תגובות נוספות כרגע."); } finally { if (mounted.current) setLoadingMore(false); }
  };
  const fmt = t => bilingualDateLabel(t) || "תאריך לא זמין";
  const contextNote = <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.65, margin: "0 0 12px" }}>כאן מופיעות תגובות לפוסטים שלך בקהילה ולתרומות מחקריות. תגובות מהצ׳אט הוותיק יוצגו אחרי חיבור מאומת של הפרופיל הישן לחשבון.</p>;
  if (rows === null) return <div style={{ color: T.sub, fontSize: 13, padding: "8px 0" }}>טוען…</div>;
  if (error && !rows.length) return <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>ניסיון נוסף</button></p>;
  if (!rows.length) return (
    <>{contextNote}<div style={{ textAlign: "center", padding: "26px 14px", color: T.sub }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🗣</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>אין עדיין תגובות לפוסטים או לתרומות שלך.<br />כשמישהו יגיב לפוסט שפרסמת בקהילה, לתגובה שלך או לתרומה מחקרית — זה יופיע כאן.</div>
    </div></>
  );
  return (
    <div ref={listRef} style={{ display: "grid", gap: 8 }}>
      {contextNote}
      {rows.map(r => {
        const context = personalReplyContext(r);
        const link = context.href;
        const inner = (<>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
            <span style={{ color: T.acc, border: `1px solid ${T.line}`, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{context.label}</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: T.ink }}>{r.author_name || "משתמש"}</span>
            <span style={{ color: T.sub, fontSize: 11 }}>הגיב/ה</span>
            {r.parent_title ? <span style={{ color: T.sub, fontSize: 11, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· על «{r.parent_title}»</span>
              : context.kind === "community" ? <span style={{ color: T.sub, fontSize: 11 }}>· תגובה בשיחה בקהילה</span> : null}
          </div>
          <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.body}</div>
          <div style={{ color: T.sub, fontSize: 10.5, marginTop: 3 }}>{fmt(r.created_at)}{link ? " · פתח ←" : ""}</div>
        </>);
        const style = { display: "block", textAlign: "right", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", color: T.ink, fontFamily: "inherit", width: "100%", boxSizing: "border-box", cursor: link ? "pointer" : "default" };
        return link
          ? <button key={r.id} data-reply-id={r.id} onClick={event => {
              const view = { tab: "replies", replyPages: pages, replyAnchor: r.id,
                replyOffset: Math.max(-2000, Math.min(2000, Math.round(event.currentTarget.getBoundingClientRect().top))) };
              const returnTo = messageNavigation ? writerPersonalHref("messages", { returnTo: messageNavigation.returnTo, ...view }) : undefined;
              if (returnTo) messageNavigation.onChange(view);
              goto(personalReplyContext(r, returnTo).href);
            }} style={style}>{inner}</button>
          : <div key={r.id} style={style}>{inner}</div>;
      })}
      {error ? <p role="alert">{error}</p> : null}
      {!done && (
        <button onClick={loadMore} disabled={loadingMore || restoring}
          style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.sub, borderRadius: 10, padding: "9px 14px", fontFamily: "inherit", fontSize: 12.5, cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1 }}>
          {loadingMore ? "טוען…" : "טען תגובות ותיקות יותר ↓"}
        </button>
      )}
    </div>
  );
}

// 🗨️ הפעילות שלי — התרומות והתגובות שאני-עצמי כתבתי (RPC my_contributions). לחיצה → הקשר בגרף/פורום.
export function MyContributionsList({ T, goto }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { myContributions(50).then(setRows).catch(() => setRows([])); }, []);
  const fmt = t => bilingualDateLabel(t) || "תאריך לא זמין";
  // תגובה → עמוד-השרשור (/forum/<אב>); תרומת-שורש → דף-המספר/הישות אם יש יעד, אחרת עמוד-התרומה.
  const linkFor = r => r.is_reply
    ? (r.parent_id ? `/forum/${r.parent_id}` : `/forum/${r.id}`)
    : (r.target_type === "number" && r.target_id ? `/number/${r.target_id}`
       : r.convergence_slug ? `/topic/${r.convergence_slug}` : `/forum/${r.id}`);
  const statusLabel = s => s === "pending" ? "⏳ ממתין לאישור" : s === "approved" ? "✓ פעיל" : s;
  if (rows === null) return <div style={{ color: T.sub, fontSize: 13, padding: "8px 0" }}>טוען…</div>;
  if (!rows.length) return (
    <div style={{ textAlign: "center", padding: "22px 14px", color: T.sub }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🗨️</div>
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>עדיין לא כתבת תרומות או תגובות.<br />כל רמז/תגובה שתכתוב בפורום או בדף-מספר יופיע כאן.</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
      {rows.map(r => {
        const label = (r.title && r.title.trim()) || (r.body && r.body.trim()) || (r.target_id || "תרומה");
        const ctx = r.is_reply
          ? `תגובה${r.parent_title ? ` · על «${r.parent_title}»` : (r.parent_author ? ` · ל${r.parent_author}` : "")}`
          : (r.intent || "תרומה");
        return (
          <button key={r.id} onClick={() => goto(linkFor(r))} style={{ display: "block", textAlign: "right", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", color: T.ink, fontFamily: "inherit", width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.gold, background: T.accSoft, borderRadius: 999, padding: "1px 8px" }}>{r.is_reply ? "💬" : "✦"} {ctx}</span>
              <span style={{ color: T.sub, fontSize: 10.5 }}>{statusLabel(r.status)}</span>
            </div>
            <div style={{ color: T.ink, fontSize: 13, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{label}</div>
            <div style={{ color: T.sub, fontSize: 10.5, marginTop: 3 }}>{fmt(r.created_at)} · פתח ←</div>
          </button>
        );
      })}
    </div>
  );
}

// 📨 ההודעות שלי — הודעות פרטיות (DM). רשימת-שיחות → שרשור → תשובה. RPCs: dm_inbox/thread/send.
function InboxPanel({ T, initialDm = null, resolveWriterHref }) {
  const { user } = useAuth();
  const [list, setList] = useState(null);       // שיחות (dm_inbox)
  const [active, setActive] = useState(null);   // {counterpart, name, avatar} בשיחה פתוחה
  const [msgs, setMsgs] = useState(null);        // שרשור פעיל
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoDone, setAutoDone] = useState(false);   // deep-link נפתח פעם אחת בלבד
  const [writerHref, setWriterHref] = useState(null), [sendError, setSendError] = useState("");
  const [readError, setReadError] = useState("");
  const scope = useRef(user?.id); scope.current = user?.id;
  const threadVersion = useRef(0), pendingSend = useRef(false);
  const fmt = t => bilingualDateLabel(t) || "תאריך לא זמין";

  const loadList = useCallback(() => {
    const actor = scope.current;
    dmInbox({ strict: true }).then((rows) => { if (actor === scope.current) { setList(rows); setReadError(""); } })
      .catch(() => { if (actor === scope.current) { setList([]); setReadError("לא ניתן לטעון את התיבה כרגע."); } });
  }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const openThread = useCallback(async (conv) => {
    const version = ++threadVersion.current, actor = scope.current;
    setActive(conv); setMsgs(null); setWriterHref(null); setSendError("");
    if (resolveWriterHref) Promise.resolve(resolveWriterHref(conv.counterpart)).then((href) => { if (version === threadVersion.current && actor === scope.current) setWriterHref(href); }).catch(() => {});
    let m;
    try { m = await dmThread(conv.counterpart, 80, { strict: true }); }
    catch { if (version === threadVersion.current && actor === scope.current) { setReadError("לא ניתן לטעון את השיחה כרגע."); setMsgs([]); } return; }
    if (version !== threadVersion.current || actor !== scope.current) return;
    setReadError(""); setMsgs(Array.isArray(m) ? m : []);
    loadList(); // רענון מונה לא-נקראו אחרי שסומן כנקרא
  }, [loadList, resolveWriterHref]);
  // 🔗 deep-link מהתראת-DM (?dm=<uid>) — פותחים ישר את השיחה עם השולח (פעם אחת, כשהרשימה מוכנה).
  useEffect(() => {
    if (!initialDm || autoDone || !Array.isArray(list)) return;
    setAutoDone(true);
    const conv = list.find(c => c.counterpart === initialDm) || { counterpart: initialDm, name: "שיחה" };
    openThread(conv);
  }, [initialDm, autoDone, list, openThread]);
  async function send() {
    const body = text.trim(); if (!body || !active || pendingSend.current) return;
    const actor = scope.current, version = threadVersion.current;
    pendingSend.current = true; setBusy(true); setSendError("");
    const r = await dmSend(active.counterpart, body);
    if (actor !== scope.current || version !== threadVersion.current) { pendingSend.current = false; setBusy(false); return; }
    if (r?.ok) { setText(""); try { const m = await dmThread(active.counterpart, 80, { strict: true }); if (actor === scope.current && version === threadVersion.current) setMsgs(Array.isArray(m) ? m : []); } catch { if (actor === scope.current) setReadError("ההודעה נשלחה, אך לא ניתן לרענן את השיחה כרגע."); } loadList(); }
    else setSendError("לא התקבל אישור שליחה. הטקסט נשאר כאן; בדקו את השיחה לפני ניסיון נוסף.");
    pendingSend.current = false; setBusy(false);
  }

  // ── שרשור פתוח ──
  if (active) {
    return (
      <div>
        <button onClick={() => { threadVersion.current++; setActive(null); setMsgs(null); setText(""); setSendError(""); }} style={{ background: "none", border: "none", color: T.acc, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "0 0 10px" }}>→ לכל השיחות</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <img src={active.avatar || genAvatar(active.name)} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
          <span style={{ fontWeight: 800, fontSize: 14.5, color: T.ink }}>{active.name}</span>
          {writerHref ? <a href={writerHref} style={{ color: T.acc }}>לדף הכותב</a> : null}
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 7, padding: "4px 2px", marginBottom: 10 }}>
          {readError ? <p role="alert">{readError}</p> : msgs === null ? <div style={{ color: T.sub, fontSize: 12.5 }}>טוען…</div>
            : msgs.length === 0 ? <div style={{ color: T.sub, fontSize: 12.5 }}>אין הודעות עדיין — כתוב הודעה ראשונה.</div>
            : msgs.map(m => {
              const mine = m.from_user === user?.id;
              return (
                <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", background: mine ? T.acc : T.card, color: mine ? "#fff" : T.ink, border: mine ? "none" : `1px solid ${T.line}`, borderRadius: mine ? "12px 12px 3px 12px" : "12px 12px 12px 3px", padding: "8px 12px" }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                  <div style={{ fontSize: 10, opacity: .7, marginTop: 3, textAlign: "end" }}>{fmt(m.created_at)}</div>
                </div>
              );
            })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea aria-label="ההודעה שלך" disabled={busy} value={text} onChange={e => setText(e.target.value.slice(0, 4000))} rows={1} placeholder="כתוב הודעה…" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{ flex: 1, boxSizing: "border-box", background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", color: T.ink, fontFamily: "inherit", fontSize: 16, resize: "none", outline: "none" }} />
          <button onClick={send} disabled={busy || !text.trim()} style={{ background: T.acc, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 800, fontSize: 14, cursor: busy || !text.trim() ? "default" : "pointer", opacity: busy || !text.trim() ? .6 : 1, fontFamily: "inherit" }}>שלח</button>
        </div>
        {sendError ? <p role="alert">{sendError}</p> : null}
      </div>
    );
  }

  // ── רשימת שיחות ──
  if (list === null) return <div style={{ color: T.sub, fontSize: 13, padding: "8px 0" }}>טוען…</div>;
  if (readError) return <p role="alert">{readError} <button type="button" onClick={loadList}>ניסיון נוסף</button></p>;
  if (!list.length) return (
    <div style={{ textAlign: "center", padding: "26px 14px", color: T.sub }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>📨</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>אין עדיין הודעות פרטיות.<br />אפשר לכתוב לכתב מדף-הכתב שלו («שלח הודעה»), וההתכתבות תופיע כאן.</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.map(conv => (
        <button key={conv.counterpart} onClick={() => openThread(conv)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "right", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", color: T.ink }}>
          <img src={conv.avatar || genAvatar(conv.name)} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{conv.name}</span>
              {conv.unread > 0 && <span style={{ background: T.acc, color: "#fff", borderRadius: 999, fontSize: 10.5, fontWeight: 800, padding: "1px 7px" }}>{conv.unread}</span>}
            </div>
            <div style={{ color: T.sub, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_body}</div>
          </div>
          <span style={{ color: T.sub, fontSize: 10.5, flex: "0 0 auto" }}>{fmt(conv.last_at)}</span>
        </button>
      ))}
    </div>
  );
}

// 🏠 «הבית» של המגירה — user_center_simplification_v0 (29.8.2026): 4 אריחי-זהות קבועים,
//    בהתאמה למושגי-הליבה (`user_center_simplification_v0`): החשבון שלי · הדף שלי ·
//    המחקר שלי (שער בלבד) · ההתקדמות שלי. «הודעות ועדכונים» מקבל כרטיס נפרד (InboxAttentionCard)
//    כי הוא איזור-קשב אחד עם שני יעדים פנימיים נפרדים (הודעות/התראות), לא נדחס למודול אחד.

export { MessagesHub };
