import React, { useState, useEffect, useCallback } from "react";
import { F } from "../theme.js";
import { studioVerify, studioList, studioUpsert, studioDelete } from "../lib/contributions.js";
import ShareActions from "./ShareActions.jsx";

// 🎨 סטודיו-הכתב (פיילוט · contributor_studio_pilot) — מרחב-נתונים אישי בדף-הכתב, נפרד מהאתר.
// הכתב מנהל את הנתונים שלו: מוסיף/עורך/מוחק, מסמן ציבורי/פרטי/אישי, ומשתף — הכל בעמוד שלו בלבד.
// לא מזין את הגרף/המאגר/topic_cards. כתיבה דרך RPC מאומת-קוד (studio_*). is_personal → לעולם לא מתפרסם.
// מצב-בעלים נפתח בלינק אישי (?studio=<code>) או לאדמין (session). אורח רואה רק ציבורי-ולא-אישי.
const KINDS = [
  { k: "finding", label: "🔢 ממצא" },
  { k: "wordplay", label: "🔤 פירוק / משחק-לשון" },
  { k: "note", label: "📝 רשומה" },
  { k: "link", label: "🔗 קישור" },
  { k: "media", label: "🖼️ מדיה" },
];
const kindLabel = (k) => (KINDS.find(x => x.k === k)?.label || "📝 רשומה");
const EMPTY = { id: "", kind: "finding", title: "", body: "", value: "", image_url: "", link_url: "", is_public: false, is_personal: false, sort: 0 };

export default function ContributorStudio({ c, P }) {
  const slug = c?.slug;
  const A = c?.accent || P.accent;
  const [owner, setOwner] = useState(false);
  const [code, setCode] = useState(null);
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);   // הפריט בעריכה (null=אין)
  const [busy, setBusy] = useState(false);

  // זיהוי קוד-גישה: מה-URL (?studio=) או מ-localStorage, ואימות מול השרת (או אדמין).
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("studio");
    const stored = (() => { try { return localStorage.getItem(`studio:${slug}`); } catch { return null; } })();
    const k = fromUrl || stored || null;
    (async () => {
      const v = await studioVerify(slug, k);
      if (!alive) return;
      const isOwner = !!v?.ok;
      setOwner(isOwner);
      if (isOwner && fromUrl) { try { localStorage.setItem(`studio:${slug}`, fromUrl); } catch { /* noop */ } }
      setCode(isOwner ? k : null);
      const list = await studioList(slug, isOwner ? k : null);
      if (alive) setRows(Array.isArray(list) ? list : []);
    })();
    return () => { alive = false; };
  }, [slug]);

  const reload = useCallback(async () => {
    const list = await studioList(slug, code);
    setRows(Array.isArray(list) ? list : []);
  }, [slug, code]);

  const save = useCallback(async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await studioUpsert(slug, code, { ...edit, value: edit.value === "" ? null : Number(edit.value) });
      setEdit(null);
      await reload();
    } catch (e) { alert("שגיאה בשמירה: " + (e?.message || e)); }
    setBusy(false);
  }, [edit, slug, code, reload]);

  const remove = useCallback(async (id) => {
    if (!window.confirm("למחוק את הפריט?")) return;
    setBusy(true);
    try { await studioDelete(slug, code, id); await reload(); }
    catch (e) { alert("שגיאה במחיקה: " + (e?.message || e)); }
    setBusy(false);
  }, [slug, code, reload]);

  if (rows === null) return null;   // טעינה — לא מהבהב
  if (!owner && rows.length === 0) return null;   // דף לא-פיילוט / אורח בלי תוכן ציבורי — לא מציגים כלום

  const publicCount = rows.filter(r => r.is_public && !r.is_personal).length;
  const inp = { width: "100%", boxSizing: "border-box", fontSize: 15, padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.border}`, background: P.card, color: P.ink, fontFamily: F.body, outline: "none", textAlign: "right", direction: "rtl" };
  const btn = (bg, fg) => ({ cursor: "pointer", border: "none", borderRadius: 9, padding: "8px 14px", fontWeight: 800, fontFamily: F.heading, fontSize: 13, background: bg, color: fg });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>🎨 הסטודיו של {c.display_name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {owner ? "מרחב אישי — הנתונים שלך, את/ה שולט/ת מה ציבורי" : `${publicCount} פריטים שיתפה ${c.display_name}`}
        </div>
      </div>

      {/* פס-בעלים: מצב-עריכה + פריט חדש */}
      {owner && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
          background: `${A}14`, border: `1px solid ${A}44`, borderRadius: 12, padding: "9px 13px", marginBottom: 12 }}>
          <span style={{ color: P.ink, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🔓 מצב עריכה — רק את/ה רואה את זה</span>
          <button onClick={() => setEdit({ ...EMPTY })} style={btn(A, "#1a1206")}>＋ פריט חדש</button>
        </div>
      )}

      {/* טופס עריכה/הוספה */}
      {owner && edit && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 14, marginBottom: 14, display: "grid", gap: 9 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })} style={{ ...inp, width: "auto", flex: 1, minWidth: 140 }}>
              {KINDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}
            </select>
            <input type="number" placeholder="ערך (אופציונלי)" value={edit.value} onChange={e => setEdit({ ...edit, value: e.target.value })} style={{ ...inp, width: 150, textAlign: "center" }} />
          </div>
          <input placeholder="כותרת" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} style={inp} />
          <textarea placeholder="תוכן / הסבר" value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} rows={3} style={{ ...inp, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="קישור (URL)" value={edit.link_url} onChange={e => setEdit({ ...edit, link_url: e.target.value })} style={{ ...inp, flex: 1, minWidth: 160, textAlign: "left", direction: "ltr" }} />
            <input placeholder="תמונה (URL)" value={edit.image_url} onChange={e => setEdit({ ...edit, image_url: e.target.value })} style={{ ...inp, flex: 1, minWidth: 160, textAlign: "left", direction: "ltr" }} />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontFamily: F.body, fontSize: 13.5, color: P.ink }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={edit.is_public} disabled={edit.is_personal} onChange={e => setEdit({ ...edit, is_public: e.target.checked })} /> 🌍 ציבורי (מוצג בעמוד)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={edit.is_personal} onChange={e => setEdit({ ...edit, is_personal: e.target.checked, is_public: e.target.checked ? false : edit.is_public })} /> 🔒 אישי (לעולם לא מתפרסם)
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={busy} style={btn(A, "#1a1206")}>{busy ? "שומר…" : "שמור"}</button>
            <button onClick={() => setEdit(null)} style={btn(P.chip || "#eee", P.ink)}>ביטול</button>
          </div>
        </div>
      )}

      {/* רשימת הפריטים */}
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, padding: "14px 10px", border: `1px dashed ${P.border}`, borderRadius: 12 }}>
          {owner ? "עדיין אין פריטים — הוסף/י פריט ראשון בכפתור למעלה." : `הסטודיו של ${c.display_name} — בקרוב.`}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 7, background: P.card, border: `1px solid ${P.border}`, borderTop: `3px solid ${A}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>{kindLabel(r.kind)}</span>
                <span style={{ display: "flex", gap: 5 }}>
                  {r.is_personal && <span title="אישי — לא מתפרסם" style={{ fontSize: 11 }}>🔒</span>}
                  {!r.is_personal && !r.is_public && owner && <span title="טיוטה — לא ציבורי" style={{ fontSize: 11, opacity: .6 }}>👁️‍🗨️</span>}
                  {r.is_public && !r.is_personal && <span title="ציבורי" style={{ fontSize: 11 }}>🌍</span>}
                </span>
              </div>
              {r.image_url && <img src={r.image_url} alt={r.title || ""} loading="lazy" style={{ width: "100%", borderRadius: 10, maxHeight: 180, objectFit: "cover" }} />}
              {r.title && <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.35 }}>{r.title}</div>}
              {r.body && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.body}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: "auto" }}>
                {r.value != null && <a href={`/number/${r.value}`} style={{ color: A, fontFamily: F.mono, fontSize: 14, fontWeight: 900, textDecoration: "none" }}>{r.value} ←</a>}
                {r.link_url && <a href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>🔗 קישור</a>}
              </div>
              {owner && (
                <div style={{ display: "flex", gap: 8, marginTop: 4, borderTop: `1px dashed ${P.border}`, paddingTop: 8 }}>
                  <button onClick={() => setEdit({ id: r.id, kind: r.kind, title: r.title || "", body: r.body || "", value: r.value ?? "", image_url: r.image_url || "", link_url: r.link_url || "", is_public: r.is_public, is_personal: r.is_personal, sort: r.sort })}
                    style={{ ...btn("transparent", A), padding: "4px 8px", border: `1px solid ${A}55` }}>✎ ערוך</button>
                  <button onClick={() => remove(r.id)} style={{ ...btn("transparent", "#c0392b"), padding: "4px 8px", border: "1px solid #c0392b55" }}>🗑 מחק</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* שיתוף הסטודיו (רכיב-שיתוף קנוני) */}
      {publicCount > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <ShareActions type="studio" title={`הסטודיו של ${c.display_name} · סוד 1820`} url={`https://sod1820.co.il/${slug}`} compact force />
        </div>
      )}
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
