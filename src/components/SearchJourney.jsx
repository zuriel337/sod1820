import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { computeEntity } from "../lib/research/coreEngine.js";
import { elsSearch } from "../features/els/Els.jsx";
import { getTorahLetters, getTorahVerses, heNorm, verseRef } from "../lib/research/torah.js";
import { getGematriaByValues, supabase } from "../lib/supabase.js";
import { entityFromPhrase } from "../lib/research/entity.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QuickActions from "./QuickActions.jsx";

// 🧭 מסע חיפוש — כלי-הדגל. קלט אחד → כל המנועים רצים במקביל → דוח-מחקר אחד.
// הפרדה ברורה: 🟢 ממצא מחושב (עובדה) · 🟣 פרשנות (חקירה). המשתמש לא צריך לדעת מאיפה להתחיל.
// רוכב על הליבה (computeEntity), על מנוע ה-ELS, על הפסוקים ועל מאגר האתר — «עץ אחד».

const METHOD_SHOW = ["רגיל", "מילוי", "מסתתר", "סידורי", "אתבש", "ריבוע", "קדמי"];

export default function SearchJourney({ onOpenTool }) {
  const { isAdmin } = useAuth();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState("");
  const [ai, setAi] = useState(null);       // { loading, out, msg }

  // 🤖 ניתוח AI — אדמין בלבד (החלטת צוריאל). שולח את העובדות שכבר חושבו (לא מחשב),
  // מקבל פרשנות בצורת journey (summary/connections/questions). שכבת-פרשנות מעל העובדות.
  const runAi = useCallback(async r => {
    setAi({ loading: true });
    try {
      const input = {
        term: r.term, ragil: r.ent.primary,
        els: r.els ? { min_skip: r.els.skip, occurrences: r.els.count, plain_in_text: r.plain } : null,
        verse_occurrences: r.occ.length, verse_refs: r.occ.slice(0, 5).map(v => verseRef(r.vdata, v)),
        same_value_verses: r.sameVal.length, related_same_value: r.related || [],
      };
      const { data, error } = await supabase.functions.invoke("field-router", { body: { input, core_values: r.ent.values, lenses: ["journey"] } });
      if (error) throw error;
      if (data?.gated) setAi({ msg: data.reason === "rate" ? "הגעת למכסת ההרצות היומית." : "אין הרשאה כרגע (התחבר כאדמין)." });
      else { const o = (data?.outputs || []).find(x => x.out)?.out; o ? setAi({ out: o }) : setAi({ msg: "המודל לא החזיר פלט תקין." }); }
    } catch (e) { setAi({ msg: "שגיאה: " + (e?.message || String(e)).slice(0, 80) }); }
  }, []);

  const run = useCallback(async term => {
    const t = String(term || "").trim();
    if (heNorm(t).length < 2) { setErr("הקלידו שם או ביטוי (לפחות 2 אותיות בעברית)."); return; }
    setBusy(true); setErr(""); setRep(null); setAi(null);
    try {
      const ent = computeEntity(t);          // 🧮 ליבת הגימטריה — מקור-אמת יחיד
      const norm = heNorm(t);
      const [letters, vdata] = await Promise.all([getTorahLetters(), getTorahVerses()]);

      // 🧬 דילוגי אותיות — דילוג מינימלי + סך מופעים
      let els = null, plain = 0;
      if (letters && norm.length >= 2) {
        const r = elsSearch(letters, norm, 2, 2000, "both", 0);
        const p = elsSearch(letters, norm, 1, 1, "fwd", 0); // דילוג 1 = מופע רגיל בטקסט
        plain = p.hits.length;
        if (r.hits.length) {
          const h = r.hits[0]; // ממוין: דילוג קצר קודם
          const bk = (vdata?.books || [])[0];
          els = { skip: Math.abs(h.skip), dir: h.dir, count: r.hits.length, capped: r.capped, start: h.start };
        }
      }

      // 📖 פסוקים — מופע ישיר (פרק:פסוק מדויק) + פסוקים בעלי אותו ערך
      let occ = [], sameVal = [];
      if (vdata?.verses) {
        for (const r of vdata.verses) {
          if (heNorm(r[3]).includes(norm)) occ.push(r);
          if (r[4] === ent.primary) sameVal.push(r);
          if (occ.length >= 40 && sameVal.length >= 12) break;
        }
      }

      // הדוח נבנה מיד מהמנועים המקומיים (local-first) — לא ממתינים לרשת
      setRep({ term: t, norm, ent, els, plain, occ, sameVal, related: null, vdata });
      setBusy(false);

      // 🔗 מאותו ערך במאגר האתר (חוצה-מקורות) — אסינכרוני, לא חוסם, עם timeout
      try {
        const m = await Promise.race([getGematriaByValues([ent.primary]), new Promise((_, x) => setTimeout(() => x("t"), 6000))]);
        const related = [...new Set(m.get(ent.primary) || [])].filter(p => heNorm(p) !== norm).slice(0, 14);
        setRep(r => (r && r.norm === norm ? { ...r, related } : r));
      } catch { setRep(r => (r && r.norm === norm ? { ...r, related: [] } : r)); }
    } catch (e) { setErr("שגיאה: " + (e?.message || e)); setBusy(false); }
  }, []);

  return (
    <div>
      <style>{SJ_CSS}</style>
      <div className="rw-h1">🧭 מסע חיפוש</div>
      <div className="rw-sub">קלט אחד — כל המנועים רצים יחד: גימטריה · דילוגי-אותיות · פסוקים · מספרים קשורים. מקבלים <b>דוח-מחקר אחד</b>, עם הפרדה בין <b>עובדה מחושבת</b> ל<b>פרשנות</b>.</div>

      <div className="rw-card sj-search">
        <input dir="rtl" value={raw} onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && run(raw)}
          placeholder="שם · ביטוי · מקום — למשל «צוריאל פוליס» או «משיח בן דוד»" aria-label="מונח למסע" />
        <button onClick={() => run(raw)} disabled={busy}>{busy ? "במסע…" : "🧭 הפעל מסע"}</button>
      </div>
      {err && <div className="rw-card sj-err">⚠️ {err}</div>}

      {rep && (
        <>
          {/* כותרת הדוח */}
          <div className="rw-card sj-hero">
            <div className="sj-hero-t">דוח מחקר · «{rep.term}»</div>
            <div className="sj-hero-v">
              <Link to={`/number/${rep.ent.primary}?from=journey`} className="sj-bignum">{rep.ent.primary.toLocaleString("he")}</Link>
              <span className="rw-muted">ערך רגיל · לחצו לדף המספר</span>
            </div>
            <QuickActions entity={entityFromPhrase(rep.term, rep.ent.primary)} />
          </div>

          <div className="sj-legend"><span className="sj-fact">🟢 עובדה מחושבת</span><span className="sj-interp">🟣 פרשנות · חקירה</span></div>

          {/* 🧮 גימטריה */}
          <Section icon="🧮" title="גימטריה" fact onOpen={() => onOpenTool?.("gematria", rep.term)} openLabel="פתח במחשבון">
            <div className="sj-chips">
              {METHOD_SHOW.map(k => rep.ent.values[k] != null && (
                <span key={k} className="sj-chip"><span className="rw-muted">{k}</span> <b>{rep.ent.values[k].toLocaleString("he")}</b></span>
              ))}
            </div>
          </Section>

          {/* 🧬 דילוגי אותיות */}
          <Section icon="🧬" title="דילוגי אותיות (ELS)" fact onOpen={() => onOpenTool?.("els", rep.term)} openLabel="פתח במטריצה">
            {rep.els ? (
              <div className="sj-chips">
                <span className="sj-chip">דילוג מינימלי <b>{rep.els.skip.toLocaleString("he")}</b></span>
                <span className="sj-chip">{rep.els.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
                <span className="sj-chip">סך מופעים <b>{rep.els.count.toLocaleString("he")}{rep.els.capped ? "+" : ""}</b></span>
                <span className="sj-chip">מופע רגיל בטקסט <b>{rep.plain.toLocaleString("he")}</b></span>
              </div>
            ) : <div className="rw-muted">לא נמצא כדילוג עד 2000. אפשר להרחיב את החיפוש במטריצה המלאה.</div>}
          </Section>

          {/* 📖 פסוקים */}
          <Section icon="📖" title="פסוקים" fact onOpen={() => onOpenTool?.("verse", rep.term)} openLabel="פתח בחיפוש פסוקים">
            {rep.occ.length > 0 && <>
              <div className="sj-sub">מופע ישיר ב-<b>{rep.occ.length}{rep.occ.length >= 40 ? "+" : ""}</b> פסוקים:</div>
              <div className="sj-verses">{rep.occ.slice(0, 6).map((r, i) => <span key={i} className="sj-vchip">{verseRef(rep.vdata, r)}</span>)}</div>
            </>}
            {rep.sameVal.length > 0 && <>
              <div className="sj-sub" style={{ marginTop: 8 }}>פסוקים שערכם הכולל = <b>{rep.ent.primary.toLocaleString("he")}</b>:</div>
              <div className="sj-verses">{rep.sameVal.slice(0, 5).map((r, i) => <span key={i} className="sj-vchip" title={r[3]}>{verseRef(rep.vdata, r)}</span>)}</div>
            </>}
            {rep.occ.length === 0 && rep.sameVal.length === 0 && <div className="rw-muted">אין מופע ישיר בפסוקים, ואין פסוק שלם בערך זהה.</div>}
          </Section>

          {/* 🔗 מאותו ערך */}
          {rep.related?.length > 0 && (
            <Section icon="🔗" title="מאותו ערך — במאגר האתר" fact onOpen={() => onOpenTool?.("gematria", rep.term)} openLabel="במחשבון">
              <div className="sj-chips">{rep.related.map((p, i) => <span key={i} className="sj-chip">{p}</span>)}</div>
              <div className="sj-sub">כל אלה = <b>{rep.ent.primary.toLocaleString("he")}</b> — נפגשים עם «{rep.term}» בערך.</div>
            </Section>
          )}

          {/* 🟣 פרשנות */}
          <Section icon="🤖" title="פרשנות · חקירה" interp>
            <ul className="sj-interp-list">
              <li>הערך <b>{rep.ent.primary.toLocaleString("he")}</b>{rep.related?.length ? ` משותף ל-${rep.related.length} ביטויים נוספים במאגר` : ""}{rep.sameVal.length ? `, ול-${rep.sameVal.length} פסוקים שלמים` : ""} — נקודת-מוצא להצלבה.</li>
              {rep.els && <li>«{rep.term}» מופיע כדילוג בתורה (מינימלי {rep.els.skip.toLocaleString("he")}). <b>דילוג קצר ≠ הוכחה</b> — אפשר למצוא דילוגים בכל טקסט גדול; זו עדשת-חקירה.</li>}
              <li>צעד-המשך: פתחו את דף-המספר {rep.ent.primary.toLocaleString("he")} לראות אילו אירועים · התכנסויות · פוסטים מחוברים אליו.</li>
            </ul>

            {/* 🤖 ניתוח AI — אדמין בלבד */}
            {isAdmin && (
              <div className="sj-ai">
                {!ai && <button className="sj-ai-btn" onClick={() => runAi(rep)}>🤖 נתח ב-AI</button>}
                {ai?.loading && <div className="rw-muted">ה-AI מנתח את הממצאים…</div>}
                {ai?.msg && <div className="sj-ai-msg">{ai.msg} <button className="sj-ai-retry" onClick={() => runAi(rep)}>נסה שוב</button></div>}
                {ai?.out && (
                  <div className="sj-ai-out">
                    <div className="sj-ai-h">🔵 ניתוח AI {ai.out.confidence && <span className="sj-ai-conf">ביטחון: {({ low: "נמוך", medium: "בינוני", high: "גבוה" })[ai.out.confidence] || ai.out.confidence}</span>}</div>
                    {ai.out.summary && <p className="sj-ai-sum">{ai.out.summary}</p>}
                    {Array.isArray(ai.out.connections) && ai.out.connections.length > 0 && <>
                      <div className="sj-ai-t">קשרים אפשריים</div>
                      <ul className="sj-interp-list">{ai.out.connections.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
                    {Array.isArray(ai.out.questions) && ai.out.questions.length > 0 && <>
                      <div className="sj-ai-t">שאלות להמשך</div>
                      <ul className="sj-interp-list">{ai.out.questions.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
                  </div>
                )}
              </div>
            )}

            <div className="sj-note">⚖️ הפרדה: למעלה — ממצאים מחושבים במנוע הרשמי. כאן — פרשנות שהמשתמש מחליט עליה. המערכת מציגה, לא מכריעה.</div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ icon, title, fact, interp, onOpen, openLabel, children }) {
  return (
    <div className={"rw-card sj-sec" + (interp ? " interp" : "")}>
      <div className="sj-sec-h">
        <span className="sj-sec-t">{icon} {title}</span>
        {fact && <span className="sj-badge">🟢 עובדה</span>}
        {interp && <span className="sj-badge p">🟣 חקירה</span>}
        {onOpen && <button className="sj-open" onClick={onOpen}>{openLabel} →</button>}
      </div>
      {children}
    </div>
  );
}

const SJ_CSS = `
.sj-search{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.sj-search input{flex:1 1 240px;text-align:center;font-size:17px;font-weight:700;padding:11px 14px;border-radius:11px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-family:inherit;outline:none}
.sj-search button{border:none;background:var(--acc);color:#fff;font-weight:800;font-size:15px;border-radius:999px;padding:11px 24px;cursor:pointer;font-family:inherit}
.sj-search button:disabled{opacity:.6;cursor:default}
.sj-err{margin-top:12px;color:#b4453a}
.sj-hero{margin-top:12px;text-align:center}
.sj-hero-t{font-weight:800;font-size:17px;color:var(--ink)}
.sj-hero-v{display:flex;flex-direction:column;align-items:center;gap:2px;margin:8px 0 12px}
.sj-bignum{font-size:44px;font-weight:900;color:var(--acc);text-decoration:none;line-height:1}
.sj-legend{display:flex;gap:10px;justify-content:center;margin:14px 0 4px;font-size:12.5px;font-weight:700}
.sj-fact{color:#1f7a4d}.sj-interp{color:#6b3fa0}
.sj-sec{margin-top:12px}
.sj-sec.interp{background:linear-gradient(180deg,#faf7ff,#f5efff);border-color:#e6dcff}
.sj-sec-h{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.sj-sec-t{font-weight:800;font-size:15px;color:var(--ink)}
.sj-badge{font-size:11px;font-weight:800;color:#1f7a4d;background:#e7f6ee;border-radius:999px;padding:3px 9px}
.sj-badge.p{color:#6b3fa0;background:#f1e9ff}
.sj-open{margin-inline-start:auto;border:1px solid var(--line);background:var(--bg);color:var(--acc);border-radius:9px;padding:6px 12px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit}
.sj-open:hover{border-color:var(--acc);background:var(--accS)}
.sj-chips{display:flex;gap:7px;flex-wrap:wrap}
.sj-chip{display:inline-flex;align-items:center;gap:5px;font-size:13.5px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--ink2)}
.sj-chip b{color:var(--acc)}
.sj-sub{font-size:13px;color:var(--ink2);margin-bottom:6px}
.sj-verses{display:flex;gap:6px;flex-wrap:wrap}
.sj-vchip{font-size:13px;background:var(--accS);color:var(--acc);border-radius:8px;padding:4px 10px;font-weight:700}
.sj-interp-list{margin:0;padding-inline-start:18px}
.sj-interp-list li{margin:5px 0;color:var(--ink);font-size:14px}
.sj-note{margin-top:10px;font-size:12.5px;color:var(--ink2);background:var(--bg);border-radius:9px;padding:9px 12px}
.sj-ai{margin:12px 0 4px}
.sj-ai-btn{border:none;background:#1f6feb;color:#fff;font-weight:800;font-size:14px;border-radius:999px;padding:9px 20px;cursor:pointer;font-family:inherit}
.sj-ai-msg{font-size:13px;color:#b4453a}
.sj-ai-retry{margin-inline-start:8px;border:1px solid var(--line);background:var(--bg);border-radius:7px;padding:3px 10px;cursor:pointer;font-family:inherit;color:var(--ink2)}
.sj-ai-out{background:#eef5ff;border:1px solid #d6e4ff;border-radius:11px;padding:13px 16px;margin-top:6px}
.sj-ai-h{font-weight:800;color:#1f6feb;font-size:14px;display:flex;align-items:center;gap:10px}
.sj-ai-conf{font-size:11px;font-weight:700;color:#1f6feb;background:#dbe9ff;border-radius:999px;padding:2px 9px}
.sj-ai-sum{margin:8px 0;color:var(--ink);font-size:14.5px;line-height:1.55}
.sj-ai-t{font-weight:800;font-size:12.5px;color:var(--ink2);margin-top:8px}
`;
