import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { deleteMyMatrix, getMatrixLibraryPage, renameMyMatrix, selfPublishMatrix } from "../../lib/elsMatrices.js";
import { hasExactSavedMatrix, savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { thumb } from "../../lib/img.js";
import CanonicalProgress from "../CanonicalProgress.jsx";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import "./elsSavedLibrary2029.css";

const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" });

// The library and its compact folder consume the same authorized reader and card.
// This is local request state, not another saved-record store.
function useCipherLibrary({ view, query = "", pageSize = 24, enabled = true, revision = 0 }) {
  const { user, loading: authLoading } = useAuth();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ rows: [], loading: true, more: false, error: false });
  const generation = useRef(0);
  const personal = view === "mine";
  const scopeKey = `${view}|${user?.id || ""}|${query}|${pageSize}|${revision}|${retry}`;
  const scopeReady = state.scopeKey === scopeKey;
  const rows = scopeReady && !authLoading ? state.rows : [];
  const loading = enabled && (authLoading || !scopeReady || state.loading);
  const load = async (offset, append, epoch) => {
    setState(current => ({ ...current, loading: true, error: false }));
    try {
      const result = await getMatrixLibraryPage({ view, userId: user?.id, query, offset, pageSize });
      if (epoch !== generation.current) return;
      setState(current => ({ rows: append ? [...current.rows, ...result.rows.filter(row => !current.rows.some(old => old.id === row.id))] : result.rows, more: result.more, loading: false, error: false, scopeKey }));
    } catch {
      if (epoch === generation.current) setState(current => ({ ...current, loading: false, error: true, scopeKey }));
    }
  };
  useEffect(() => {
    const epoch = ++generation.current;
    if (!enabled || authLoading) return;
    setState({ rows: [], loading: true, more: false, error: false, scopeKey });
    if (!personal || user) load(0, false, epoch);
    else setState({ rows: [], loading: false, more: false, error: false, scopeKey });
    return () => { ++generation.current; };
  }, [scopeKey, authLoading, enabled]);
  return { user, authLoading, rows, loading, error: scopeReady && state.error, more: scopeReady && state.more,
    retry: () => rows.length ? load(rows.length, true, generation.current) : setRetry(value => value + 1),
    next: () => load(rows.length, true, generation.current),
    reload: () => setRetry(value => value + 1) };
}

const OWNER_ERRORS = {
  published_locked: "צופן שאושר לפרסום נשמר כראיה ואי אפשר לשנות או למחוק אותו כאן.",
  not_owner: "אפשר לנהל רק צפנים שאתם שמרתם.",
  not_authenticated: "נדרשת התחברות לחשבון.",
  not_found: "הצופן כבר לא קיים.",
  invalid_title: "כתבו שם של עד 160 תווים.",
};

// Owner-only management of one saved cipher. Every action goes through its own authorized RPC;
// the visible state is re-read from the library after a successful change.
function CipherOwnerActions({ row, onChanged }) {
  const [mode, setMode] = useState(null);
  const [title, setTitle] = useState(row.title || row.search_term || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const approved = row.status === "published";
  const alreadyPublic = approved && row.visibility === "public";
  const run = async (action, done) => {
    if (busy) return;
    setBusy(true);setMessage(null);
    try {
      const result = await action();
      if (result?.ok === false) setMessage({ error: true, text: OWNER_ERRORS[result.error] || "הפעולה לא הושלמה. נסו שוב." });
      else { setMode(null);setMessage({ error: false, text: done });onChanged?.(); }
    } catch {
      setMessage({ error: true, text: "הפעולה לא הושלמה. נסו שוב." });
    } finally { setBusy(false); }
  };
  return <div className="els29-library-owner">
    <div className="els29-library-owner-row">
      {approved ? null : <button type="button" className="sod29-action" disabled={busy} aria-expanded={mode === "rename"} onClick={() => { setTitle(row.title || row.search_term || "");setMode(mode === "rename" ? null : "rename"); }}>שנה שם</button>}
      {alreadyPublic ? null : <button type="button" className="sod29-action" disabled={busy} aria-pressed={!!row.self_published}
        onClick={() => mode === "publish" || row.self_published
          ? run(() => selfPublishMatrix(row.id, !row.self_published), row.self_published ? "הצופן הוסר מהתיק הציבורי." : "הצופן מוצג בתיק הציבורי שלך.")
          : setMode("publish")}>{row.self_published ? "הסר מהתיק הציבורי" : "הצג בתיק הציבורי"}</button>}
      {approved ? null : <button type="button" className="sod29-action is-danger" disabled={busy} aria-expanded={mode === "delete"} onClick={() => setMode(mode === "delete" ? null : "delete")}>מחק</button>}
    </div>
    {mode === "rename" ? <form className="els29-library-owner-form" onSubmit={event => { event.preventDefault();run(() => renameMyMatrix(row.id, title), "השם עודכן."); }}>
      <label>שם הצופן<input value={title} maxLength={160} onChange={event => setTitle(event.target.value)} disabled={busy} /></label>
      <button type="submit" className="sod29-action primary" disabled={busy || !title.trim()}>{busy ? "שומר…" : "שמור שם"}</button>
    </form> : null}
    {mode === "publish" ? <div className="els29-library-owner-form" role="group" aria-label="אישור הצגה בתיק הציבורי">
      <p>הצגה בתיק הציבורי תאפשר לכל מבקר לראות את הצופן, את ההסבר ואת הממצאים שלו. אפשר להסיר אותו משם בכל עת.</p>
      <button type="button" className="sod29-action primary" disabled={busy} onClick={() => run(() => selfPublishMatrix(row.id, true), "הצופן מוצג בתיק הציבורי שלך.")}>הצג בתיק הציבורי</button>
      <button type="button" className="sod29-action" disabled={busy} onClick={() => setMode(null)}>ביטול</button>
    </div> : null}
    {mode === "delete" ? <div className="els29-library-owner-form" role="group" aria-label="אישור מחיקה">
      <p>למחוק את הצופן „{row.title || row.search_term}”? המחיקה סופית ואי אפשר לשחזר אותו.</p>
      <button type="button" className="sod29-action is-danger" disabled={busy} onClick={() => run(() => deleteMyMatrix(row.id), "הצופן נמחק.")}>{busy ? "מוחק…" : "מחק לצמיתות"}</button>
      <button type="button" className="sod29-action" disabled={busy} onClick={() => setMode(null)}>ביטול</button>
    </div> : null}
    {message ? <p role={message.error ? "alert" : "status"} className="els29-library-owner-message">{message.text}</p> : null}
  </div>;
}

function CipherCard({ row, personal, compact = false, onOpen, onChanged }) {
  const exact = hasExactSavedMatrix(row);
  const [failedImage, setFailedImage] = useState(null);
  const imageUrl = row.visibility === "public" && row.image_url ? thumb(row.image_url, compact ? 240 : 480) : null;
  const date = row.created_at ? new Date(row.created_at) : null;
  const validDate = date && Number.isFinite(date.getTime());
  return <article className={`els29-library-card${compact ? " is-compact" : ""}`}>
    <a href={savedMatrixWorkspaceHref(row)} onClick={event => {
      if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault();onOpen(row); }
    }}>
      <div className="els29-library-preview">
        {imageUrl && imageUrl !== failedImage ? <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailedImage(imageUrl)} />
          : <div className="els29-library-placeholder" aria-hidden="true"><NavigationIcon2029 name="els" /><span>{row.search_term}</span></div>}
      </div>
      <div className="els29-library-card-body">
        <h3>{row.title || row.search_term}</h3>
        {row.title && row.title !== row.search_term ? <p className="els29-library-term">{row.search_term}</p> : null}
        <p className="els29-library-meta">{row.scope === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{row.direction === "back" ? "−" : ""}{row.skip_distance}</bdi></p>
        {!compact && row.description ? <p className="els29-library-description">{row.description}</p> : null}
        <div className="els29-library-tags"><span>{exact ? "מיקום שמור" : "צופן ותיק · חיפוש מחדש"}</span>
          {personal ? <span>{row.status === "published" && row.visibility === "public" ? "פורסם" : row.self_published ? "בתיק הציבורי" : "אישי"}</span> : null}</div>
        {validDate ? <time dateTime={date.toISOString()}>נשמר ב־{dateFormat.format(date)}</time> : null}
        <span className="els29-library-open">{exact ? "המשך מחקר" : "פתח למחקר"}<span aria-hidden="true">←</span></span>
      </div>
    </a>
    {personal && !compact && onChanged ? <CipherOwnerActions row={row} onChanged={onChanged} /> : null}
  </article>;
}

function LibraryStatus({ data, personal, query }) {
  if (personal && !data.user && !data.authLoading) return <p>כדי לראות את הצפנים שלך, <a href="/login">היכנסו לחשבון</a>.</p>;
  if (data.error) return <div role="alert">הספרייה לא נטענה. <button type="button" className="sod29-action" onClick={data.retry}>נסה שוב</button></div>;
  if (data.loading) return <CanonicalProgress compact title="טוען צפנים…" phase="פותח את הספרייה" />;
  if (!data.rows.length) return <p className="els29-library-empty">{query ? "לא נמצאו צפנים לחיפוש הזה." : personal ? "עדיין אין כאן צפנים. שמרו ממצא מהמטריצה והוא יופיע כאן להמשך מחקר." : "אין כרגע צפנים שפורסמו להצגה."}</p>;
  return null;
}

export function ElsRecentCiphers2029({ onOpen, onLibrary, collapseSignal = 0, revision = 0, enabled = true }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(() => {
    const review = import.meta.env.VITE_INTEGRATED_PREVIEW === "true"
      && /^[1-8]$/.test(new URLSearchParams(window.location.search).get("visual") || "");
    return !review && !window.matchMedia("(max-width:600px)").matches;
  });
  const view = user ? "mine" : "public";
  const data = useCipherLibrary({ view, pageSize: 4, enabled: enabled && open, revision });
  useEffect(() => { if (collapseSignal) setOpen(false); }, [collapseSignal]);
  return <section className="els29-recent" aria-label="תיקיית הצפנים">
    <div className="els29-recent-head">
      <button type="button" className="els29-recent-toggle" aria-expanded={open} aria-controls="els29-recent-ciphers" onClick={() => setOpen(value => !value)}>
        <NavigationIcon2029 name="books" /><span><strong>תיקיית הצפנים</strong><small>{user ? "השמירות האחרונות שלי" : "מהצפנים שפורסמו לאחרונה"}</small></span><span className="els29-recent-chevron" aria-hidden="true">⌄</span>
      </button>
      <button type="button" className="sod29-action" onClick={() => onLibrary(view)}>לכל הצפנים <span aria-hidden="true">←</span></button>
    </div>
    <div id="els29-recent-ciphers" hidden={!open}>
      <LibraryStatus data={data} personal={!!user} />
      <div className="els29-recent-grid">{enabled && data.rows.map(row => <CipherCard key={row.id} row={row} personal={!!user} compact onOpen={onOpen} />)}</div>
    </div>
  </section>;
}

export default function ElsSavedLibrary2029({ view = "public", onView, onOpen, onClose }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const personal = view === "mine";
  const data = useCipherLibrary({ view, query });
  return <section className="els29-library" aria-label="ספריית הצפנים">
    <header className="els29-library-head"><div><span className="els29-library-eyebrow"><NavigationIcon2029 name="books" />ספריית הצפנים</span><h2>{personal ? "הצפנים שלי" : "צפנים שפורסמו"}</h2><p>מקום לחזור לממצאים, לפתוח צופן ולהמשיך לחקור.</p></div><button className="sod29-action" type="button" onClick={onClose}>חזור לחיפוש</button></header>
    <div className="els29-library-toolbar">
      <div className="els29-library-tabs" role="group" aria-label="סוג ספריית הצפנים">
        <button type="button" className="sod29-action" aria-pressed={personal} onClick={() => onView("mine")}>הצפנים שלי</button>
        <button type="button" className="sod29-action" aria-pressed={!personal} onClick={() => onView("public")}>צפנים שפורסמו</button>
      </div>
      {(!personal || data.user) ? <form className="els29-library-search" onSubmit={event => { event.preventDefault();setQuery(draft.trim()); }}>
        <label>חיפוש בצפנים<input value={draft} onChange={event => setDraft(event.target.value)} maxLength={120} placeholder="מילה או שם הצופן" /></label><button className="sod29-action" type="submit"><NavigationIcon2029 name="search" />חפש בספרייה</button>
      </form> : null}
    </div>
    <div className="els29-library-order">האחרונים שנשמרו מופיעים ראשונים</div>
    <div className="els29-library-grid">{data.rows.map(row => <CipherCard key={row.id} row={row} personal={personal} onOpen={onOpen} onChanged={data.reload} />)}</div>
    <LibraryStatus data={data} personal={personal} query={query} />
    {!data.loading && !data.error && data.more ? <button className="sod29-action els29-library-load" type="button" onClick={data.next}>טען צפנים נוספים</button> : null}
  </section>;
}
