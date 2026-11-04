import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchSiteSearch2029, SITE_SEARCH_GROUPS, siteSearchEligible, siteSearchItems, siteSearchMoreHref, siteSearchSeries, siteSearchTerm } from "../../lib/research/siteSearch2029.js";
import "./siteSearch2029.css";

function Highlight({ title, query }) {
  const at = title.toLocaleLowerCase("he").indexOf(query.toLocaleLowerCase("he"));
  if (!query || at < 0) return title;
  return <>{title.slice(0, at)}<mark>{title.slice(at, at + query.length)}</mark>{title.slice(at + query.length)}</>;
}
const waitingGroups = () => Object.fromEntries(SITE_SEARCH_GROUPS.map(g => [g.key, { state: "loading", items: [] }]));
export default function SiteSearch2029({ query, setQuery, go, reader = fetchSiteSearch2029 }) {
  const listId = useId(), inputRef = useRef(null);
  const [filter, setFilter] = useState("all"), [activeId, setActiveId] = useState(null);
  const [attempt, setAttempt] = useState(0), [composing, setComposing] = useState(false);
  const [state, setState] = useState({ term: "", groups: {} });
  let term = "", invalid = "";
  try { term = siteSearchTerm(query); } catch (error) { invalid = error.message; }
  const eligible = !invalid && !composing && siteSearchEligible(term);
  const current = state.term === term ? state.groups : {};
  const groups = eligible ? current : {};
  const items = useMemo(() => eligible ? siteSearchItems(groups, filter) : [], [eligible, groups, filter]);
  // Partial groups can arrive in a different order. Keyboard selection follows
  // the identity the person chose, never an index that shifts under Enter.
  const active = items.findIndex(item => item.id === activeId);
  const loading = eligible && SITE_SEARCH_GROUPS.some(g => !groups[g.key] || groups[g.key].state === "loading");
  const failed = eligible ? SITE_SEARCH_GROUPS.filter(g => groups[g.key]?.state === "failed") : [];
  const open = item => { if (item?.href) go(item.href); };
  const onLink = (event, item) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault(); open(item);
  };
  useEffect(() => { const id = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { setActiveId(null); }, [term, filter]);
  useEffect(() => {
    if (!eligible) return undefined;
    let alive = true;
    const controller = new AbortController();
    const initial = waitingGroups();
    initial.series = { state: "ready", items: siteSearchSeries(term) };
    setState({ term, groups: initial });
    const onGroup = group => { if (alive) setState(previous => previous.term === term
      ? { term, groups: { ...previous.groups, [group.key]: group } } : previous); };
    const timeout = setTimeout(() => {
      if (!alive) return;
      alive = false; controller.abort();
      setState(previous => previous.term !== term ? previous : { term, groups: Object.fromEntries(
        Object.entries(previous.groups).map(([key, group]) => [key, group.state === "loading" ? { state: "failed", items: [] } : group])) });
    }, 12000);
    const debounce = setTimeout(() => {
      reader(term, { signal: controller.signal, onGroup }).catch(error => {
        if (alive && error?.name !== "AbortError") for (const key of ["posts", "topics", "sources"]) onGroup({ key, state: "failed", items: [] });
      }).finally(() => clearTimeout(timeout));
    }, 280);
    return () => { alive = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [term, eligible, attempt, reader]);
  const keyDown = event => {
    if (event.isComposing || event.nativeEvent?.isComposing) return;
    if (["ArrowDown", "ArrowUp"].includes(event.key) && items.length) {
      event.preventDefault();
      setActiveId(previous => {
        const index = items.findIndex(item => item.id === previous);
        const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index <= 0 ? items.length : index) - 1;
        return items[next].id;
      });
    }
    if (event.key === "Enter" && active >= 0 && items[active]) { event.preventDefault(); open(items[active]); }
  };
  useEffect(() => { if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);
  return <section className="sod29-site-search" aria-label="חיפוש תוכן באתר">
    <p>פוסטים, נושאים, סדרות וכותבים. התחילו להקליד ובחרו מההצעות.</p>
    <form onSubmit={event => { event.preventDefault(); if (!eligible) inputRef.current?.focus(); else if (items.length) { setActiveId(items[0].id); inputRef.current?.focus(); } else setAttempt(n => n + 1); }}>
      <label htmlFor={`${listId}-input`}>מה מחפשים?</label>
      <div className="sod29-site-search-input">
        <input id={`${listId}-input`} ref={inputRef} data-autofocus type="search" role="combobox" autoComplete="off"
          placeholder="פוסט, נושא, סדרה או כותב…" value={query} maxLength={120}
          onChange={event => setQuery(event.target.value)} onKeyDown={keyDown}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          aria-autocomplete="list" aria-expanded={items.length > 0} aria-controls={listId}
          aria-activedescendant={active >= 0 && items[active] ? `${listId}-${active}` : undefined}
          aria-describedby={`${listId}-status`} />
        {query ? <button type="button" aria-label="ניקוי החיפוש" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>×</button> : null}
        <button type="submit" className="sod29-action">חפש</button>
      </div>
    </form>
    <div className="sod29-site-search-filters" role="group" aria-label="סוג התוצאות">
      {[{ key: "all", label: "הכול" }, ...SITE_SEARCH_GROUPS].map(group => <button key={group.key} type="button"
        aria-pressed={filter === group.key} onClick={() => setFilter(group.key)}>{group.label}</button>)}
    </div>
    <p id={`${listId}-status`} role="status" className="sod29-site-search-status">
      {invalid || (!eligible ? "הקלידו לפחות שתי אותיות או ספרות להצעות. אפשר גם להתחיל מסדרה:" : loading ? "מחפש באתר…" : items.length ? `${items.length} הצעות לפתיחה` : failed.length ? "חלק מהתוצאות אינן זמינות כרגע." : "לא נמצאו תוצאות לחיפוש הזה. נסו מילה קצרה יותר.")}
    </p>
    {!eligible && !invalid ? <div className="sod29-site-search-start" aria-label="סדרות באתר">
      {siteSearchSeries().map(item => <a key={item.id} href={item.href} onClick={event => onLink(event, item)}>{item.title}</a>)}
    </div> : null}
    <ul id={listId} role="listbox" aria-label="השלמות ותוצאות מהאתר" aria-busy={loading}>
      {items.map((item, index) => <li role="none" key={item.id}>
        <a id={`${listId}-${index}`} role="option" aria-selected={active === index} tabIndex={-1}
          href={item.href} onClick={event => onLink(event, item)}>
          <small>{SITE_SEARCH_GROUPS.find(g => g.key === item.kind)?.label}</small>
          <strong><Highlight title={item.title} query={term} /></strong>
          {item.detail && item.detail !== item.title ? <span>{item.detail}</span> : null}
        </a>
      </li>)}
    </ul>
    {failed.length ? <div className="sod29-site-search-failure" role="alert">
      <span>לא ניתן כרגע לקרוא: {failed.map(g => g.label).join(", ")}. התוצאות הזמינות נשארות מוצגות.</span>
      <button type="button" onClick={() => setAttempt(n => n + 1)}>ניסיון נוסף</button>
    </div> : null}
    {eligible ? <div className="sod29-site-search-more">
      <a href={siteSearchMoreHref("posts", term)} onClick={event => onLink(event, { href: siteSearchMoreHref("posts", term) })}>עוד פוסטים</a>
      <a href={siteSearchMoreHref("world", term)} onClick={event => onLink(event, { href: siteSearchMoreHref("world", term) })}>המשך חיפוש בעולם</a>
      <small>מקורות מוצעים לפי שם הכותב. חיפוש בתוך חומרי המקור זמין בעולם.</small>
    </div> : null}
    <small className="sod29-site-search-help">↑ ↓ לבחירה · Enter לפתיחה · Esc לחזרה. לחישוב מספר או ביטוי השתמשו ב״גימטריה״ בסרגל.</small>
  </section>;
}
