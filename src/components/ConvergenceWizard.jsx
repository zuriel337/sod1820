import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import { verifyPhrases, buildConvergence, extractPhrases, suggestSlug } from "../lib/wizard.js";

// 🧙 <ConvergenceWizard> — כפתור-אדמין «⚙️ הכנס לפי התקנון» + אשף (unified_discovery_architecture).
// לוקח חידוש-קהילה (insight), מאמת את הגימטריות במנוע, ובאישור בונה את כל השרשרת בצד-שרת
// (שורש→Raw→AI-Judge→שער-אדם→התכנסות→תרומה→הקרנה). לאדמין בלבד. canonical_ui_components_law.
export default function ConvergenceWizard({ insight, onDone }) {
  const { isAdmin } = useAuth();
  const P = usePalette();
  const [open, setOpen] = useState(false);
  if (!isAdmin || !insight) return null;

  // כבר הוכנס לתקנון → קישור להתכנסות במקום האשף (אפס כפילות)
  const existing = insight.panel_data?.convergence_slug;
  if (existing) return (
    <a href={`/topic/${encodeURIComponent(existing)}`} title="חידוש זה כבר הפך להתכנסות"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none",
        background: "linear-gradient(135deg,#f6e27a,#d4af37)", color: "#3a2c00", borderRadius: 999,
        padding: "3px 11px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900 }}>✦ בהתכנסות ←</a>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="בנה התכנסות מהחידוש לפי התקנון"
        style={{ cursor: "pointer", background: "transparent", border: `1px solid ${P.borderStrong}`,
          color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 11px" }}>
        ⚙️ הכנס לפי התקנון
      </button>
      {open && <WizardModal insight={insight} P={P} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

function WizardModal({ insight, P, onClose, onDone }) {
  const author = insight.panel_data?.author || insight.panel_data?.submitter || "חבר הקהילה";
  const [rows, setRows] = useState(() => extractPhrases(insight.body || insight.title || "").map(phrase => ({ phrase, role: "candidate", ragil: null, in_corpus: null })));
  const [newPhrase, setNewPhrase] = useState("");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState((insight.title || "").replace(/["'«»🍒]/g, "").trim().slice(0, 60));
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cross, setCross] = useState("");
  const [meter, setMeter] = useState(72);
  const [verifying, setVerifying] = useState(false);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const setRole = (i, role) => setRows(rs => rs.map((r, k) => k === i ? { ...r, role } : r));
  const removeRow = (i) => setRows(rs => rs.filter((_, k) => k !== i));
  const addPhrase = () => {
    const p = newPhrase.replace(/\s+/g, " ").trim();
    if (!p || rows.some(r => r.phrase === p)) { setNewPhrase(""); return; }
    setRows(rs => [...rs, { phrase: p, role: "core", ragil: null, in_corpus: null }]);
    setNewPhrase("");
  };

  async function doVerify() {
    setError(""); setVerifying(true);
    try {
      const data = await verifyPhrases(rows.map(r => r.phrase));
      const byPhrase = {}; (data || []).forEach(d => { byPhrase[d.phrase] = d; });
      // ערך מוצע = הערך הנפוץ ביותר בין הביטויים
      const freq = {}; (data || []).forEach(d => { freq[d.ragil] = (freq[d.ragil] || 0) + 1; });
      const suggested = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
      const v = value || suggested || "";
      setValue(v);
      setRows(rs => rs.map(r => {
        const d = byPhrase[r.phrase] || {};
        const match = String(d.ragil) === String(v);
        return { ...r, ragil: d.ragil, in_corpus: d.in_corpus, is_verified: d.is_verified, role: match ? (r.role === "off" ? "core" : r.role) : "off" };
      }));
      if (v && !slug) setSlug(suggestSlug(title, v));
    } catch (e) { setError(e?.message || String(e)); }
    finally { setVerifying(false); }
  }

  async function doBuild() {
    setError("");
    const core = rows.filter(r => r.role === "core").map(r => r.phrase);
    const cand = rows.filter(r => r.role === "candidate").map(r => r.phrase);
    if (!value || !core.length) { setError("צריך ערך + לפחות ביטוי-גרעין אחד."); return; }
    const useSlug = (slug || suggestSlug(title, value)).trim();
    setBuilding(true);
    try {
      const r = await buildConvergence({
        value: Number(value), slug: useSlug, title, subtitle, hint: "",
        author, insight_id: insight.id, cross_note: cross.trim() || null,
        meter: Number(meter) || 72, domain: "חידושי גולשים",
        core_phrases: core, candidate_phrases: cand,
      });
      setResult(r); onDone && onDone();
    } catch (e) { setError(e?.message === "slug_exists" ? "ה-slug כבר קיים — שנה אותו." : (e?.message || String(e))); }
    finally { setBuilding(false); }
  }

  const roleColor = (role) => role === "core" ? P.accentText : role === "candidate" ? P.accentDim : "#b0442f";
  const input = { width: "100%", background: P.blueBg || "rgba(0,0,0,0.03)", border: `1px solid ${P.border}`, borderRadius: 9, padding: "9px 11px", fontFamily: F.body, fontSize: 14.5, color: P.ink, boxSizing: "border-box" };
  const label = { display: "block", color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 4 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(10,8,4,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "max(14px, env(safe-area-inset-top)) 12px 24px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ width: "100%", maxWidth: 560, background: P.cardGrad || "#fff", border: `1px solid ${P.borderStrong}`, borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,0.4)", marginTop: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 17px", borderBottom: `1px solid ${P.border}` }}>
          <span style={{ fontSize: 19 }}>⚙️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>הכנס לפי התקנון</div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>אשף בניית-התכנסות · {author}</div>
          </div>
          <button onClick={onClose} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "4px 11px" }}>✕</button>
        </div>

        {result ? (
          <div style={{ padding: "18px 17px 22px", display: "grid", gap: 12 }}>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>✅ ההתכנסות נבנתה!</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7 }}>
              גרעין: <b>{(result.core || []).join(" · ")}</b>{(result.candidates || []).length ? <> · מועמדים: {(result.candidates).join(" · ")}</> : null}
            </div>
            {(result.warnings || []).length > 0 && (
              <div style={{ color: "#b0442f", fontFamily: F.body, fontSize: 12.5, background: "rgba(176,68,47,0.08)", borderRadius: 9, padding: "8px 11px" }}>
                ⚠️ נדחו (לא תואמים לערך): {(result.warnings).join(" · ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <a href={`/topic/${encodeURIComponent(result.slug)}`} style={{ background: P.accentText, color: "#1a1400", fontFamily: F.heading, fontWeight: 800, fontSize: 13, borderRadius: 999, padding: "8px 15px", textDecoration: "none" }}>🏛️ לעמוד ההתכנסות ←</a>
              <a href="/forum" style={{ background: "transparent", color: P.accentText, border: `1px solid ${P.borderStrong}`, fontFamily: F.heading, fontWeight: 800, fontSize: 13, borderRadius: 999, padding: "8px 15px", textDecoration: "none" }}>🌐 לפורום</a>
            </div>
            <button onClick={onClose} style={{ marginTop: 4, cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 10, color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "9px" }}>סגור</button>
          </div>
        ) : (
          <div style={{ padding: "15px 17px 20px", display: "grid", gap: 14 }}>
            {/* ביטויים */}
            <div>
              <span style={label}>1 · ביטויי-ההתכנסות (סמן גרעין / מועמד / החוצה)</span>
              <div style={{ display: "grid", gap: 6 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: P.blueBg || "rgba(0,0,0,0.03)", border: `1px solid ${P.border}`, borderRadius: 9, padding: "6px 9px" }}>
                    <span style={{ flex: 1, minWidth: 0, color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{r.phrase}</span>
                    {r.ragil != null && (
                      <span title={r.in_corpus ? "כבר במאגר" : "חדש — ייכנס למאגר"} style={{ fontVariantNumeric: "tabular-nums", color: String(r.ragil) === String(value) ? P.accentText : P.accentDim, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>
                        {r.ragil}{r.in_corpus ? " ✓" : " ＋"}
                      </span>
                    )}
                    <select value={r.role} onChange={e => setRole(i, e.target.value)}
                      style={{ background: "transparent", border: `1px solid ${P.border}`, borderRadius: 7, color: roleColor(r.role), fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 5px" }}>
                      <option value="core">גרעין</option>
                      <option value="candidate">מועמד</option>
                      <option value="off">החוצה</option>
                    </select>
                    <button onClick={() => removeRow(i)} title="הסר" style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontSize: 15, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                <input value={newPhrase} onChange={e => setNewPhrase(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhrase())}
                  placeholder="הוסף ביטוי…" style={{ ...input, flex: 1 }} />
                <button onClick={addPhrase} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${P.borderStrong}`, borderRadius: 9, color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 13, padding: "0 14px" }}>＋</button>
              </div>
            </div>

            <button onClick={doVerify} disabled={verifying || !rows.length}
              style={{ cursor: verifying ? "wait" : "pointer", background: P.blueBg, color: P.blue, border: `1px solid ${P.blueLine}`, borderRadius: 10, fontFamily: F.heading, fontWeight: 800, fontSize: 13.5, padding: "10px" }}>
              {verifying ? "מאמת…" : "🔧 אמת במנוע (שלב 2)"}
            </button>

            {/* פרטים */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><span style={label}>ערך ההתכנסות</span><input value={value} onChange={e => { setValue(e.target.value); if (!slug) setSlug(suggestSlug(title, e.target.value)); }} inputMode="numeric" style={input} /></div>
              <div><span style={label}>מד (0–100)</span><input value={meter} onChange={e => setMeter(e.target.value)} inputMode="numeric" style={input} /></div>
            </div>
            <div><span style={label}>כותרת</span><input value={title} onChange={e => setTitle(e.target.value)} style={input} /></div>
            <div><span style={label}>slug (כתובת העמוד)</span><input value={slug} onChange={e => setSlug(e.target.value)} dir="ltr" style={{ ...input, direction: "ltr", textAlign: "left" }} /></div>
            <div><span style={label}>תת-כותרת (הסבר קצר)</span><input value={subtitle} onChange={e => setSubtitle(e.target.value)} style={input} /></div>
            <div><span style={label}>חוליית-הצלבה (אופציונלי — למשל «+ קשת = 1820 = סוד × יהוה»)</span><input value={cross} onChange={e => setCross(e.target.value)} style={input} /></div>

            {error && <div style={{ color: "#b0442f", fontFamily: F.body, fontSize: 13, background: "rgba(176,68,47,0.08)", borderRadius: 9, padding: "9px 11px" }}>{error}</div>}

            <button onClick={doBuild} disabled={building}
              style={{ cursor: building ? "wait" : "pointer", background: P.accentText, color: "#1a1400", border: "none", borderRadius: 11, fontFamily: F.heading, fontWeight: 900, fontSize: 15, padding: "12px" }}>
              {building ? "בונה שרשרת…" : "🏗️ בנה שרשרת לפי התקנון"}
            </button>
            <p style={{ margin: 0, color: P.accentDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.6, textAlign: "center" }}>
              המנוע מאמת כל ערך · הגרעין נכנס למצע · נבנים עמוד-התכנסות, כרטיס-פורום (⭐) והקרנה לבית המדרש. נתונים חיים — בלי פריסה.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
