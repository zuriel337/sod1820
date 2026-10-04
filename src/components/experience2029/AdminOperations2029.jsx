import React, { useMemo, useState } from "react";
import { attentionItems, numeric, rows } from "../../lib/admin/controlPlaneProjection.js";
import { AdminMetric, MetricSourceContext, SourceStamp, SourceState, formatNumber, formatTime } from "./AdminSource2029.jsx";

export function AdminAttention2029({ sources, onRefresh, now }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("priority");
  const items = useMemo(() => attentionItems({ suggestions: sources.suggestions.data, command: sources.command.data, health: sources.health.data, attention: sources.attention.data }, now), [sources.suggestions.data, sources.command.data, sources.health.data, sources.attention.data, now]);
  const categories = [...new Set(items.map(x => x.category))];
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("he-IL");
    const filtered = items.filter(i => (category === "all" || category === i.category) && (!q || `${i.title} ${i.reason} ${i.owner} ${i.evidence || ""}`.toLocaleLowerCase("he-IL").includes(q)));
    if (sort === "age") filtered.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
    if (sort === "new") filtered.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    return filtered;
  }, [items, query, category, sort]);
  const loaded = ["suggestions", "command", "health", "attention"].every(k => sources[k].status === "ready");
  return <section className="sod29-section" data-experience-capability="admin-attention">
    <div className="sod29-section-head"><div><div className="sod29-kicker">החלטות · תשומת לב</div><h2>מה מחכה לך עכשיו?</h2><p className="sod29-muted">תצוגה אחת מעל התורים הקיימים. צפייה אינה אישור; ההחלטה מתבצעת במסך של בעל התור.</p></div>
      <button className="sod29-action" onClick={() => onRefresh(["health", "command", "suggestions", "attention"])}>רענן תורים</button></div>
    {["suggestions", "command", "health", "attention"].map(name => <SourceState key={name} name={name} source={sources[name]} onRetry={() => onRefresh([name])} />)}
    <div className="sod29-admin-toolbar">
      <label>חיפוש בתורים<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="כותרת, סיבה או בעל תור" /></label>
      <label>תחום<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">כל התחומים</option>{categories.map(c => <option key={c} value={c}>{({ research: "מחקר", communication: "תקשורת", system: "מערכת", ai: "AI", ux: "חוויית משתמש", performance: "ביצועים ועלות", knowledge: "ידע" })[c] || c}</option>)}</select></label>
      <label>סדר<select value={sort} onChange={e => setSort(e.target.value)}><option value="priority">כשלים תחילה</option><option value="age">ממתין הכי הרבה</option><option value="new">חדש תחילה</option></select></label>
    </div>
    <p role="status">{shown.length} כרטיסים מוצגים מתוך {items.length} שנקראו{loaded ? "" : " · חלק מהמקורות אינם זמינים"}. הכיסוי מוגבל ל־100 פריטי קשב, 80 הצעות מערכת ו־20 המלצות מחקר. כרטיס מסכם יכול לייצג כמה פריטים; הכרטיסים אינם סכום של תורים נפרדים.</p>
    <div className="sod29-admin-items">{shown.map(item => <article className={`sod29-admin-item ${item.severity}`} key={item.id}>
      <div className="sod29-actions"><span className="sod29-chip">{item.owner}</span><span className="sod29-chip">{item.ageDays == null ? "גיל הפריט לא נמסר" : `בתור ${formatNumber(Math.floor(item.ageDays))} ימים`}</span>{item.severity === "high" ? <span className="sod29-chip">דורש תשומת לב</span> : null}</div>
      <h3>{item.title}</h3><p>{item.reason}</p>
      {item.evidence ? <details><summary>הנתונים שעליהם ההצעה נשענת</summary><p>{item.evidence}</p></details> : null}
      {item.estimate ? <p><strong>השפעה מוערכת:</strong> {item.estimate}</p> : null}
      <SourceStamp source={sources[item.source]} name={item.source} now={now} />
      <a className="sod29-action" href={item.href}>{item.action} ←</a>
    </article>)}</div>
    {!shown.length ? <div className="sod29-admin-empty">{items.length ? "אין פריטים שתואמים לסינון." : loaded ? "לא נמצאו פריטים ממתינים במקורות ובטווח שנקראו." : "ממתין למקורות. אי אפשר להסיק שהתורים ריקים."}</div> : null}
  </section>;
}

export function AdminMedia2029({ sources, onRefresh, onTrace }) {
  const health = sources.health.data;
  const video = sources.videoMap.data;
  const media = health?.media;
  const migration = media?.migration_queue_status_counts;
  const statuses = migration && typeof migration === "object" && !Array.isArray(migration) ? Object.entries(migration) : [];
  const traces = rows(sources.traces.data).filter(t => /video|media|upload|thumb|transcri|enrich|tiktok/i.test(`${t.capability} ${t.surface}`));
  const crons = rows(health?.cron).filter(c => /video|media|thumb|migration/i.test(c.job_name || ""));
  return <div data-experience-capability="admin-media-pipeline">
    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">קליטה · עיבוד · מוכנות</div><h2>איפה המדיה נמצאת בתהליך?</h2></div><button className="sod29-action" onClick={() => onRefresh(["health", "videoMap", "traces"])}>רענן מדיה</button></div>
      <p className="sod29-muted">השלבים מציגים אגרגציות של בעלי המידע הקיימים. אלו מלאים מקבילים, ולא משפך של אותם סרטונים. מערכת העלאות TikTok עתידית אינה מחוברת כאן.</p>
      {["health", "videoMap"].map(name => <SourceState key={name} name={name} source={sources[name]} onRetry={() => onRefresh([name])} />)}
      <div className="sod29-admin-pipeline">
        <div><small>1 · קליטה / העברת מדיה</small><strong>{formatNumber(media?.migration_queue_objects)}</strong><p>פריטים בתור ההעברה הקיים</p><SourceStamp source={sources.health} name="health" /></div>
        <div><small>2 · מיפוי נכסים</small><strong>{formatNumber(video?.summary?.unique_assets)}</strong><p>נכסים ממופים; {formatNumber(video?.summary?.assets_with_unresolved_placement)} עם מיקום שלא הוכרע</p><SourceStamp source={sources.videoMap} name="videoMap" /></div>
        <div><small>3 · העשרה ועיבוד</small><strong>{formatNumber(video?.channel_enrichment?.pending)}</strong><p>ממתינים להעשרה; {formatNumber(video?.channel_enrichment?.retry_stt)} דורשים ניסיון תמלול נוסף</p><SourceStamp source={sources.videoMap} name="videoMap" /></div>
        <div><small>4 · מוכנות להצגה ולחיפוש</small><strong>{formatNumber(video?.summary?.google_indexable_assets)}</strong><p>נכסים כשירים לאינדוקס וידאו; אינו אישור ש־Google אינדקס אותם</p><SourceStamp source={sources.videoMap} name="videoMap" /></div>
      </div>
      <div className="sod29-grid"><MetricSourceContext.Provider value={{ source: sources.health, name: "health" }}>
        <AdminMetric label="תמונות וידאו חסרות" value={formatNumber(media?.delivery_risk?.channel_video_missing_thumb)} note="ערוצים קיימים" />
        <AdminMetric label="קבצים גדולים מ־50 MiB" value={formatNumber(media?.storage?.large_objects?.over_50mb)} note="מלאי האחסון הקיים" />
        <AdminMetric label="מועמדים כפולים" value={formatNumber(media?.dedupe_latest?.duplicate_groups)} note="מועמדים לבדיקה; אין מחיקה" measuredAt={media?.dedupe_latest?.generated_at} />
      </MetricSourceContext.Provider></div>
      <div className="sod29-admin-table"><table><caption>תור העברת המדיה — סטטוסים כפי שנמסרו</caption><thead><tr><th scope="col">סטטוס</th><th scope="col">פריטים</th></tr></thead><tbody>{statuses.map(([status, count]) => <tr key={status}><td>{status}</td><td>{formatNumber(count)}</td></tr>)}</tbody></table></div>
      {!statuses.length ? <p className="sod29-muted">לא נמסרו סטטוסים לתור. לא ניתן להסיק שהעיבוד הסתיים.</p> : null}
    </section>
    <section className="sod29-section"><h2>תהליכים מתוזמנים וניסיונות חוזרים</h2>
      <div className="sod29-admin-table"><table><thead><tr><th scope="col">תהליך</th><th scope="col">פעיל</th><th scope="col">תוצאה אחרונה</th><th scope="col">כשלים ב־24 שעות</th><th scope="col">מועד ריצה</th></tr></thead><tbody>{crons.map((c, index) => <tr key={`${c.job_name}:${index}`}><td>{c.job_name}</td><td>{typeof c.active === "boolean" ? c.active ? "כן" : "לא" : "לא ידוע"}</td><td>{c.last_status || "לא ידוע"}</td><td>{formatNumber(c.failures_24h)}</td><td>{formatTime(c.last_run_at)}</td></tr>)}</tbody></table></div>
      <SourceStamp source={sources.health} name="health" />
      {!crons.length ? <p>אין תהליכי מדיה בתשובה שנקראה; זמינות המתזמן אינה מוסקת מרשימה ריקה.</p> : null}
      <MetricSourceContext.Provider value={{ source: sources.videoMap, name: "videoMap" }}><div className="sod29-grid">
        <AdminMetric label="עלות העשרת וידאו · 7 ימים" value={numeric(video?.ai?.estimated_cost_usd_7d) == null ? "לא ידוע" : `$${formatNumber(video.ai.estimated_cost_usd_7d, 4)}`} note="אומדן מיומני שימוש ותעריפים; לא חשבונית ספק" basis={video?.ai?.cost_basis || "UNKNOWN"} />
        <AdminMetric label="הורדה / אחסון לפי שלב" value="לא ידוע" note="המקורות הנוכחיים אינם מספקים ייחוס עלות מדויק לכל שלב" basis="UNKNOWN" />
        <AdminMetric label="תמלול אוטומטי" value={typeof video?.ai_policy?.stt_runs_from_cron === "boolean" ? video.ai_policy.stt_runs_from_cron ? "מופעל לפי המקור" : "ידני לפי המקור" : "לא ידוע"} note={video?.ai_policy?.stt_model || "המודל לא נמסר"} />
      </div></MetricSourceContext.Provider>
    </section>
    <section className="sod29-section"><h2>עקבות ביצוע של מדיה · 7 ימים</h2><SourceState source={sources.traces} name="traces" onRetry={() => onRefresh(["traces"])} />
      <p className="sod29-muted">מסונן מתוך 100 עקבות הביצוע האחרונות לפי שם היכולת או המסך; כיסוי חלקי, ללא שיוך מומצא לנכס.</p>
      {traces.map(t => <button className="sod29-row" style={{ width: "100%", textAlign: "start" }} key={t.trace_id} onClick={() => onTrace(t.trace_id)}><div><strong>{t.capability || "מדיה"}</strong><small>{formatTime(t.started_at)} · {t.outcome || "תוצאה לא ידועה"}</small></div><span className="sod29-chip">פתח פירוט</span></button>)}
      {!traces.length && sources.traces.status === "ready" ? <p>לא נמצאו עקבות מדיה בטווח ובסינון שנקראו.</p> : null}
      <SourceStamp source={sources.traces} name="traces" />
    </section>
  </div>;
}
