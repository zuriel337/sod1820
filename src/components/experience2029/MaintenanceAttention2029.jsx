import React, { useEffect, useMemo, useState } from "react";
import { adminSuggestionsList } from "../../lib/supabaseApi2029.js";
import { groupSuggestions, maintenanceSummary, operationalTime as when, STALE_DAYS } from "../../lib/maintenanceAttention2029.js";

// Maintenance and recommendations in /2029/control (system_suggestions_law v7): the existing detectors' pending recommendations, grouped by
// meaning and owner. Read only: nothing is dismissed, decided or rewritten here; the history and every occurrence stay in system_suggestions.
// Loaded lazily inside the admin-only control page; it adds nothing to the public load.
export default function MaintenanceAttention2029({ refreshToken = 0 }) {
  const [state, setState] = useState({ loading: true, startedAt: Date.now() });
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, loading: true, error: false, startedAt: Date.now() }));
    Promise.all([adminSuggestionsList("pending", 200), adminSuggestionsList("later", 200)]).then(([pending, later]) => {
      if (!active) return;
      if (!Array.isArray(pending) || !Array.isArray(later)) throw new Error("source_unavailable");
      setState({ loading: false, rows: [...pending, ...later], readAt: new Date().toISOString() });
    }).catch(() => { if (active) setState(current => ({ ...current, loading: false, error: true })); });
    return () => { active = false; };
  }, [refreshToken]);

  // Operation Visibility Law: a live counter while the source is read.
  useEffect(() => {
    if (!state.loading) return undefined;
    const id = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(id);
  }, [state.loading]);

  const groups = useMemo(() => groupSuggestions(state.rows || []), [state.rows]);
  const summary = useMemo(() => maintenanceSummary(groups), [groups]);

  return <section className="sod29-section" data-experience-capability="maintenance-attention" aria-label="תחזוקה והמלצות">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">MAINTENANCE · RECOMMENDATIONS</div>
        <h2>תחזוקה והמלצות</h2>
        <div className="sod29-muted">ההמלצות שהגלאים הקיימים כתבו, מקובצות לפי משמעות ובעלים. שום דבר לא נדחה או נסגר כאן; כל מופע נשמר כפי שנכתב.</div>
      </div>
    </div>
    {state.loading ? <p role="status">קורא את ההמלצות… {Math.round((Date.now() - state.startedAt) / 1000)} שניות</p>
      : state.error ? <p role="alert">קריאת ההמלצות נכשלה. אין להסיק שאין המלצות פתוחות.</p>
      : <>
        <p>{summary.rows} המלצות פתוחות · {summary.groups} נושאים שונים · {summary.recurring} חוזרים · {summary.possiblyStale} לא חזרו מעל {STALE_DAYS} יום</p>
        <p className="sod29-muted">לפי מדור: {summary.byArea.map(([area, count]) => `${area} ${count}`).join(" · ") || "—"} · נקרא מהמסד: {when(state.readAt)}</p>
        {groups.length ? <div className="sod29-list">{groups.map(group => <div className="sod29-row" key={group.key} data-maintenance-rank={group.rank} data-maintenance-stale={group.possiblyStale ? "true" : "false"}>
          <div>
            <strong><bdi>{group.title}</bdi></strong>
            <small>{group.owner} · {group.count > 1 ? `${group.count} מופעים, ראשון ${when(group.oldest)}, אחרון ${when(group.newest)}` : `מופע אחד, ${when(group.newest)}`}</small>
            {group.reason ? <p className="sod29-muted"><bdi>{String(group.reason).slice(0, 280)}</bdi></p> : null}
            {group.impact ? <p className="sod29-muted">פעולה מוצעת: <bdi>{String(group.impact).slice(0, 200)}</bdi></p> : null}
            {group.possiblyStale ? <p className="sod29-muted">לא חזרה מאז {when(group.newest)}: ייתכן שהתיישנה. לא נסגרה אוטומטית; ההחלטה נשארת אצל הבעלים.</p> : null}
          </div>
          <div className="sod29-actions"><span className="sod29-chip">{group.area}</span><span className="sod29-chip"><bdi>{group.detector || group.category || "—"}</bdi></span></div>
        </div>)}</div> : <p className="sod29-muted">הקורא החזיר רשימה ריקה של המלצות פתוחות.</p>}
      </>}
  </section>;
}
