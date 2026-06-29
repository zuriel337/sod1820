import React from "react";

// 🧬 תוצאות-הדילוג בקיר הימני — מאזין ל-Event Bus (ELS_STATE) שמפרסם ElsGrid.
// כאן רואים: סיכום העוגן · רשימת המופעים · חיפוש-בתוך-חיפוש · החיפושים השמורים.
export default function ElsResultsPanel({ state, onLoad }) {
  const saved = state?.saved || [];

  return (
    <>
      <div className="rw-panel">
        <div className="rw-ph"><span>🧬 תוצאות דילוג</span></div>
        <div className="rw-pb erp">
          <style>{ERP_CSS}</style>
          {!state?.has ? (
            <div className="erp-empty">חפשו מונח במטריצה — והתוצאות (דילוג · מופעים · מיקום) יופיעו כאן, בצד.</div>
          ) : state.mode === "single" ? (
            <>
              <div className="erp-head">«{state.term}»</div>
              <div className="erp-stats">
                <span className="erp-s">דילוג <b>{state.skip.toLocaleString("he")}</b></span>
                <span className="erp-s">{state.dir > 0 ? "→" : "←"}</span>
                <span className="erp-s">מופעים <b>{state.count.toLocaleString("he")}{state.capped ? "+" : ""}</b></span>
                {state.loc && <span className="erp-s">📍 {state.loc.label}</span>}
              </div>
              {state.sub && (
                <div className="erp-sub">
                  <div className="erp-sub-t">🔍 «{state.sub.term}» — הכי קרוב</div>
                  <div className="erp-stats">
                    <span className="erp-s">מרחק <b>{state.sub.nearest != null ? state.sub.nearest.toLocaleString("he") : "—"}</b></span>
                    <span className="erp-s">≤1,000: <b>{state.sub.w1000}</b></span>
                    <span className="erp-s">≤5,000: <b>{state.sub.w5000}</b></span>
                  </div>
                </div>
              )}
              <div className="erp-list-t">מופעים (לפי מובהקות)</div>
              <div className="erp-list">
                {(state.hits || []).slice(0, 16).map((h, i) => (
                  <div key={i} className="erp-row">
                    <span className="erp-rk">{i + 1}</span>
                    <span>דילוג <b>{h.skip.toLocaleString("he")}</b></span>
                    <span>{h.dir > 0 ? "→" : "←"}</span>
                    <span className="erp-muted">{h.label} · {h.pct}%{h.mm > 0 ? " · ~" : ""}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="erp-head">{(state.terms || []).join(" · ")}</div>
              <div className="erp-list-t">אשכולות (הכי קרוב קודם)</div>
              <div className="erp-list">
                {(state.clusters || []).map((c, i) => (
                  <div key={i} className="erp-row">
                    <span className="erp-rk">{i + 1}</span>
                    <span>טווח <b>{c.span.toLocaleString("he")}</b></span>
                    <span className="erp-muted">{c.label} · {(c.picks || []).map(p => p.term).join("·")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rw-panel">
        <div className="rw-ph"><span>💾 חיפושים שמורים</span>{saved.length ? <span className="rw-muted" style={{ fontWeight: 600 }}>{saved.length}</span> : null}</div>
        <div className="rw-pb erp">
          {saved.length === 0
            ? <div className="erp-empty">לחצו «💾 שמור» ליד החיפוש — והם יצטברו כאן לחזרה מהירה.</div>
            : <div className="erp-saved">{saved.map(s => (
                <button key={s.id} className="erp-saved-chip" onClick={() => onLoad?.(restore(s))} title="טען חיפוש">{s.label}</button>
              ))}</div>}
        </div>
      </div>
    </>
  );
}

// הקיר מקבל רק {id,label}; משחזרים את אובייקט-החיפוש המלא מ-localStorage לפי id.
function restore(meta) {
  try { const all = JSON.parse(localStorage.getItem("els_saved") || "[]"); return all.find(s => s.id === meta.id) || meta; }
  catch { return meta; }
}

const ERP_CSS = `
.erp{font-size:13px}
.erp-empty{color:var(--ink3);font-size:12.5px;line-height:1.6}
.erp-head{font-weight:800;color:var(--ink);margin-bottom:6px;font-size:14px}
.erp-stats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.erp-s{background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:3px 8px;font-size:12px;color:var(--ink2)}
.erp-s b{color:var(--acc)}
.erp-sub{border-top:1px solid var(--line);padding-top:8px;margin-bottom:8px}
.erp-sub-t{font-weight:800;color:#a01f2e;font-size:12.5px;margin-bottom:5px}
.erp-list-t{font-size:11px;font-weight:800;color:var(--ink3);margin:4px 0}
.erp-list{display:flex;flex-direction:column;gap:3px;max-height:240px;overflow:auto}
.erp-row{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:5px 8px}
.erp-row b{color:var(--acc)}
.erp-rk{min-width:18px;height:18px;border-radius:5px;background:var(--accS);color:var(--acc);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:11px}
.erp-muted{color:var(--ink3);margin-inline-start:auto;text-align:end}
.erp-saved{display:flex;flex-wrap:wrap;gap:6px}
.erp-saved-chip{border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.erp-saved-chip:hover{border-color:var(--acc);color:var(--acc);background:var(--accS)}
`;
