import React, { useMemo } from "react";

// 📊 ניתוח דילוגים — שכבת-העובדות מעל המופעים: צפיפות לפי ספר · פיזור לאורך התורה ·
// התפלגות מרחקי-הדילוג. SVG טהור, בלי ספריות. הכל מדיד — לא הוכחה.
const SKIP_BUCKETS = [[2, 10], [11, 50], [51, 100], [101, 500], [501, 1000], [1001, Infinity]];
const bucketLabel = ([lo, hi]) => hi === Infinity ? `${lo}+` : `${lo}–${hi}`;

export default function ElsAnalysis({ hits, books, total, capped }) {
  // כשנאסף עד-התקרה (5000), האיסוף מוטה לתחילת-התורה → התפלגות-מיקום חסרת-משמעות.
  // יושר: לא מציגים גרף מוטה. מבקשים לצמצם דילוג/לבחור ספר לתמונה מדויקת.
  if (capped) return (
    <div className="rw-card els-an">
      <style>{AN_CSS}</style>
      <div className="els-an-h">📊 ניתוח — צפיפות ופיזור</div>
      <div className="els-an-foot" style={{ marginTop: 0 }}>נמצאו מעל <b>{total.toLocaleString("he")}</b> מופעים — יותר מדי לניתוח-פיזור מהימן (האיסוף מוטה לתחילת התורה). <b>צמצמו את «דילוג עד»</b> או בחרו ספר יחיד — והניתוח (צפיפות לפי ספר · פיזור · מרחקים) יוצג במדויק.</div>
    </div>
  );
  const a = useMemo(() => {
    if (!hits?.length) return null;
    const byBook = books.slice(1).map(b => {
      const c = hits.filter(h => h.start >= b.from && h.start < b.to).length;
      const per10k = c / ((b.to - b.from) / 10000);
      return { label: b.label, from: b.from, to: b.to, count: c, per10k };
    });
    const skipDist = SKIP_BUCKETS.map(rg => ({ rg, count: hits.filter(h => { const s = Math.abs(h.skip); return s >= rg[0] && s <= rg[1]; }).length }));
    const positions = hits.map(h => h.start);
    const span = books[books.length - 1].to;
    const minSkip = Math.min(...hits.map(h => Math.abs(h.skip)));
    const densest = [...byBook].sort((x, y) => y.per10k - x.per10k)[0];
    return { byBook, skipDist, positions, span, minSkip, densest };
  }, [hits, books]);

  if (!a) return null;
  const maxBook = Math.max(1, ...a.byBook.map(b => b.count));
  const maxSkip = Math.max(1, ...a.skipDist.map(s => s.count));
  const STRIP_W = 600, STRIP_H = 34;

  return (
    <div className="rw-card els-an">
      <style>{AN_CSS}</style>
      <div className="els-an-h">📊 ניתוח — צפיפות ופיזור ({total.toLocaleString("he")} מופעים)</div>

      {/* פיזור לאורך התורה */}
      <div className="els-an-sec">
        <div className="els-an-t">פיזור לאורך התנ״ך <span className="rw-muted">— כל קו = מופע · קווי-הפרדה = חלקים</span></div>
        <svg viewBox={`0 0 ${STRIP_W} ${STRIP_H}`} className="els-strip" preserveAspectRatio="none">
          <rect x="0" y="0" width={STRIP_W} height={STRIP_H} rx="5" fill="var(--bg)" stroke="var(--line)" />
          {books.slice(2).map((b, i) => { const x = (b.from / a.span) * STRIP_W; return <line key={i} x1={x} y1="0" x2={x} y2={STRIP_H} stroke="var(--line)" strokeDasharray="3 3" />; })}
          {a.positions.map((p, i) => { const x = (p / a.span) * STRIP_W; return <line key={i} x1={x} y1="4" x2={x} y2={STRIP_H - 4} stroke="var(--acc)" strokeWidth="0.7" opacity="0.55" />; })}
        </svg>
        <div className="els-strip-labels">{books.slice(1).map(b => <span key={b.key}>{b.label}</span>)}</div>
      </div>

      <div className="els-an-grid">
        {/* צפיפות לפי ספר */}
        <div className="els-an-sec">
          <div className="els-an-t">צפיפות לפי חלק <span className="rw-muted">(ל-10,000 אות)</span></div>
          {a.byBook.map((b, i) => (
            <div key={i} className="els-bar-row">
              <span className="els-bar-lb">{b.label}</span>
              <span className="els-bar-track"><span className="els-bar-fill" style={{ width: `${(b.count / maxBook) * 100}%` }} /></span>
              <span className="els-bar-val">{b.count.toLocaleString("he")} <span className="rw-muted">· {b.per10k.toFixed(1)}</span></span>
            </div>
          ))}
        </div>

        {/* התפלגות מרחקי-דילוג */}
        <div className="els-an-sec">
          <div className="els-an-t">התפלגות מרחקי-דילוג</div>
          {a.skipDist.map((s, i) => (
            <div key={i} className="els-bar-row">
              <span className="els-bar-lb">{bucketLabel(s.rg)}</span>
              <span className="els-bar-track"><span className="els-bar-fill alt" style={{ width: `${(s.count / maxSkip) * 100}%` }} /></span>
              <span className="els-bar-val">{s.count.toLocaleString("he")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="els-an-foot">הספר הצפוף ביותר: <b>{a.densest.label}</b> ({a.densest.per10k.toFixed(1)} ל-10k) · דילוג מינימלי: <b>{a.minSkip.toLocaleString("he")}</b>. צפיפות גבוהה ≠ הוכחה — מדד מדיד בלבד.</div>
    </div>
  );
}

const AN_CSS = `
.els-an-h{font-weight:800;font-size:14px;color:var(--ink);margin-bottom:12px}
.els-an-sec{margin-bottom:12px}
.els-an-t{font-size:13px;font-weight:700;color:var(--ink2);margin-bottom:7px}
.els-strip{width:100%;height:34px;display:block}
.els-strip-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-top:3px}
.els-an-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media (max-width:680px){.els-an-grid{grid-template-columns:1fr}}
.els-bar-row{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12.5px}
.els-bar-lb{flex:0 0 64px;color:var(--ink2);font-weight:700}
.els-bar-track{flex:1;height:14px;background:var(--bg);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.els-bar-fill{display:block;height:100%;background:var(--acc);border-radius:999px}
.els-bar-fill.alt{background:#6b3fa0}
.els-bar-val{flex:0 0 auto;color:var(--ink);font-weight:700;min-width:30px;text-align:end}
.els-an-foot{margin-top:6px;font-size:12px;color:var(--ink2);background:var(--bg);border-radius:9px;padding:9px 12px}
`;
