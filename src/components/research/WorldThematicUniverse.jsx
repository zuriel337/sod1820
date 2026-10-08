import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FrameState } from "../experience2029/Sod2029Shell.jsx";
import {
  WORLD_THEME_ALL,
  buildWorldThematicUniverse,
  fetchWorldThematicSources,
} from "../../lib/research/worldThematicUniverse.js";
import "./worldThematicUniverse.css";

const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("he-IL") : null);

export default function WorldThematicUniverse() {
  const [state, setState] = useState({ loading: true, error: null, raw: null });
  const [theme, setTheme] = useState(WORLD_THEME_ALL);
  const [writer, setWriter] = useState(WORLD_THEME_ALL);

  useEffect(() => {
    let alive = true;
    fetchWorldThematicSources()
      .then((raw) => alive && setState({ loading: false, error: null, raw }))
      .catch((error) => alive && setState({ loading: false, error, raw: null }));
    return () => { alive = false; };
  }, []);

  const universe = useMemo(
    () => (state.raw ? buildWorldThematicUniverse(state.raw, { theme, writer }) : null),
    [state.raw, theme, writer],
  );

  return <section className="sod29-section wtu" id="world-themes" aria-label="עולם נושאים">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">עולם אחד</div>
        <h2>רמזי גאולה, סיפורים על־זמניים ויצירות מקור</h2>
        <div className="sod29-muted">כל החומר הפתוח לכולם, במקום אחד. בחרו נושא; הכותב הוא רק זווית היחס למקור.</div>
      </div>
    </div>

    {state.loading ? <FrameState kind="loading" title="פותח את העולם">מחבר יצירות מקור והתכנסויות.</FrameState> : null}
    {state.error ? <FrameState kind="unavailable" title="העולם הנושאי לא זמין כרגע">לא נחליף חומר חסר בחומר מומצא.</FrameState> : null}

    {universe ? <>
      <div className="wtu-chips" role="group" aria-label="נושאים">
        {[{ key: WORLD_THEME_ALL, label: "הכול" }, ...universe.themes].map((t) =>
          <button type="button" key={t.key} className={`wtu-chip${theme === t.key ? " is-active" : ""}`} aria-pressed={theme === t.key} onClick={() => setTheme(t.key)}>
            {t.label}{t.count != null ? <span className="wtu-count">{t.count}</span> : null}
          </button>)}
      </div>
      {universe.writers.length > 1 ? <label className="wtu-writer">
        <span>לפי כותב/מקור</span>
        <select value={writer} onChange={(e) => setWriter(e.target.value)}>
          <option value={WORLD_THEME_ALL}>כולם</option>
          {universe.writers.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label> : null}

      <h3 className="wtu-lane">יצירות מקור</h3>
      {universe.sourceWorks.length ? <ul className="wtu-grid">
        {universe.sourceWorks.slice(0, 18).map((w) => <li key={w.id}>
          <Link className="wtu-card" to={w.href}>
            <span className="wtu-meta">{[w.writer, dateLabel(w.at)].filter(Boolean).join(" · ")}</span>
            <strong>{w.label}</strong>
            {w.summary ? <small>{w.summary}</small> : null}
          </Link>
        </li>)}
      </ul> : <FrameState kind="empty" title="אין כרגע יצירות בנושא הזה">אפשר לבחור ״הכול״.</FrameState>}

      <h3 className="wtu-lane">התכנסויות מאושרות</h3>
      {universe.convergences.length ? <ul className="wtu-grid">
        {universe.convergences.slice(0, 12).map((c) => <li key={c.id}>
          <Link className="wtu-card is-convergence" to={c.href}>
            <span className="wtu-meta">{[c.writer, dateLabel(c.at)].filter(Boolean).join(" · ")}</span>
            <strong>{c.label}</strong>
            {c.summary ? <small>{c.summary}</small> : null}
            {c.value != null ? <b className="wtu-value">{c.value}</b> : null}
          </Link>
        </li>)}
      </ul> : null}
      <p className="wtu-note">פתוח לכולם ≠ מאומת. יצירות מקור, ניתוחי AI והתכנסויות הם סוגים נפרדים; הסדר לפי זמן, לא לפי דירוג אמת.</p>
    </> : null}
  </section>;
}
