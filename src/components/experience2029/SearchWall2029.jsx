import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import CanonicalProgress from "../CanonicalProgress.jsx";
import "./searchWall2029.css";

// Private search wall (ZURIEL 21.11.2026): what visitors typed in the gematria calculators, the Bible-code search and the
// site search. Admin only (admin_search_wall_2029 refuses anyone else); no person is linked to a search. Never public.
const SOURCES = [["", "הכול"], ["gematria", "גימטריה"], ["els", "צופן"], ["site", "חיפוש באתר"]];
const LABEL = Object.fromEntries(SOURCES);
const at = v => new Date(v).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const n = v => Number(v).toLocaleString("he-IL");
const REFRESH_MS = 30000;

export default function SearchWall2029({ rpc = (_name, args) => supabase.rpc("admin_search_wall_2029", args) }) {
  const [source, setSource] = useState("");
  const [draft, setDraft] = useState(""), [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: true, data: null, error: null, more: false });
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const load = useCallback(async (before = null) => {
    setState(s => ({ ...s, loading: !before, more: Boolean(before), error: null }));
    const { data, error } = await rpc("admin_search_wall_2029", { p_limit: 200, p_source: source || null, p_query: query || null, p_before: before });
    if (!live.current) return;
    if (error) return setState(s => ({ ...s, loading: false, more: false, error }));
    setState(s => ({ loading: false, more: false, error: null,
      data: before && s.data ? { ...data, recent: [...s.data.recent, ...(data?.recent || [])] } : data }));
  }, [rpc, source, query]);

  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setTimeout(() => setQuery(draft.trim()), 400); return () => clearTimeout(t); }, [draft]);

  const d = state.data, recent = d?.recent || [];
  return <section className="sod29-section searchwall29" dir="rtl" aria-labelledby="searchwall29-title" data-search-wall>
    <div className="sod29-section-head"><div>
      <div className="sod29-kicker">PRIVATE · ADMIN ONLY</div>
      <h2 id="searchwall29-title">קיר חיפושים</h2>
      <div className="sod29-muted">מה גולשים מקלידים. בלי זהות: מילה, ערך וזמן בלבד. לא מוצג לציבור.{d?.generated_at ? " עודכן " + at(d.generated_at) + " · מתרענן כל 30 שניות." : ""}</div>
    </div></div>
    <div className="searchwall29-tools">
      <div role="group" aria-label="מקור">{SOURCES.map(([k, l]) => <button key={k || "all"} type="button" className="sod29-action" aria-pressed={source === k} onClick={() => setSource(k)}>{l}</button>)}</div>
      <label>סינון<input type="search" value={draft} maxLength={60} onChange={e => setDraft(e.target.value)} placeholder="מילה או חלק ממנה" /></label>
    </div>
    {state.loading ? <CanonicalProgress compact title="קורא את קיר החיפושים" phase={query ? "מסנן לפי \"" + query + "\"" : "החיפושים האחרונים"} /> : null}
    {state.error ? <p role="alert">{state.error.code === "PGRST202" ? "הקיר עוד לא הופעל במסד (PGRST202): ה־SQL ממתין לאישור." : "לא ניתן לקרוא את הקיר: " + String(state.error.message || state.error)}</p> : null}
    {d ? <>
      <div className="sod29-grid">
        <div className="searchwall29-stat"><b>{n(d.today || 0)}</b><span>חיפושים היום</span></div>
        <div className="searchwall29-stat"><b>{d.last_at ? at(d.last_at) : "—"}</b><span>חיפוש אחרון</span></div>
      </div>
      {d.top_today?.length ? <><h3>הכי מחפשים היום</h3><ol className="searchwall29-chips">{d.top_today.map(x => <li key={x.term}><button type="button" onClick={() => setDraft(x.term)}><span dir="auto">{x.term}</span><small>{n(x.count)}</small></button></li>)}</ol></> : null}
      {d.top_week?.length ? <><h3>הכי מחפשים השבוע</h3><ol className="searchwall29-chips">{d.top_week.map(x => <li key={x.term}><button type="button" onClick={() => setDraft(x.term)}><span dir="auto">{x.term}</span><small>{n(x.count)}</small></button></li>)}</ol></> : null}
      <h3>אחרונים</h3>
      {recent.length ? <table className="searchwall29-table"><thead><tr><th>מתי</th><th>מה הוקלד</th><th>ערך</th><th>איפה</th></tr></thead>
        <tbody>{recent.map((r, i) => <tr key={r.at + ":" + i}><td>{at(r.at)}</td><td dir="auto">{r.term}</td>
          <td>{Number.isSafeInteger(r.value) ? <a href={"/number/" + r.value}>{n(r.value)}</a> : "—"}</td><td>{LABEL[r.source] || r.source}</td></tr>)}</tbody></table>
        : <p className="sod29-muted">אין חיפושים {query ? "שמתאימים לסינון" : "בטווח הזה"}.</p>}
      {recent.length >= 200 ? <button type="button" className="sod29-action" disabled={state.more} onClick={() => load(recent[recent.length - 1].at)}>{state.more ? "טוען עוד…" : "עוד 200"}</button> : null}
    </> : null}
  </section>;
}
