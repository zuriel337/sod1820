import React, { useRef, useState } from "react";
import { C, F, POST_CONTENT_CSS } from "../theme.js";

// ── ממשק עריכת פוסט מתקדם (אדמין) ──
// סרגל כלים שמזריק HTML בנקודת הסימון, תצוגה מקדימה חיה בעיצוב האתר,
// ושמירה שמעדכנת modified → הפוסט קופץ לראש «עדכונים אחרונים».

const labelStyle = { display: "block", color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", margin: "14px 0 6px" };
const inputStyle = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: "#ede4d3", fontFamily: F.body, fontSize: 14, padding: "10px 12px" };

export default function AdvancedPostEditor({ draft, setDraft, onSave, onCancel, saving, saveErr }) {
  const taRef = useRef(null);
  const [preview, setPreview] = useState(false);

  // החלת טרנספורמציה על תוכן ה-textarea, תוך שמירת מיקום הסימון
  function applyToContent(transform) {
    const ta = taRef.current;
    const value = draft.content || "";
    const s = ta ? (ta.selectionStart ?? value.length) : value.length;
    const e = ta ? (ta.selectionEnd ?? value.length) : value.length;
    const { text, selStart, selEnd } = transform(value.slice(s, e), value, s, e);
    setDraft(d => ({ ...d, content: text }));
    requestAnimationFrame(() => { if (ta) { ta.focus(); try { ta.setSelectionRange(selStart, selEnd); } catch { /* noop */ } } });
  }
  function wrap(before, after, placeholder = "טקסט") {
    applyToContent((sel, value, s, e) => {
      const inner = sel || placeholder;
      const text = value.slice(0, s) + before + inner + after + value.slice(e);
      const selStart = s + before.length;
      return { text, selStart, selEnd: selStart + inner.length };
    });
  }
  function insert(snippet) {
    applyToContent((sel, value, s, e) => {
      const text = value.slice(0, s) + snippet + value.slice(e);
      const pos = s + snippet.length;
      return { text, selStart: pos, selEnd: pos };
    });
  }
  function addLink() {
    const url = window.prompt("כתובת הקישור (URL):", "https://");
    if (url) wrap(`<a href="${url}">`, "</a>", "טקסט הקישור");
  }
  function addImage() {
    const url = window.prompt("כתובת התמונה (URL):", "https://");
    if (url) insert(`\n<img src="${url}" alt="" />\n`);
  }

  const tools = [
    { l: "B", t: "מודגש", on: () => wrap("<strong>", "</strong>"), bold: true },
    { l: "I", t: "נטוי", on: () => wrap("<em>", "</em>"), italic: true },
    { l: "כותרת", t: "כותרת ראשית (H2)", on: () => wrap("\n<h2>", "</h2>\n", "כותרת") },
    { l: "כותרת קטנה", t: "כותרת משנה (H3)", on: () => wrap("\n<h3>", "</h3>\n", "כותרת משנה") },
    { l: "❝ ציטוט", t: "ציטוט", on: () => wrap("\n<blockquote><p>", "</p></blockquote>\n", "ציטוט") },
    { l: "• רשימה", t: "רשימת תבליטים", on: () => insert("\n<ul>\n  <li>פריט</li>\n  <li>פריט</li>\n</ul>\n") },
    { l: "🔗 קישור", t: "הוספת קישור", on: addLink },
    { l: "🖼 תמונה", t: "הוספת תמונה", on: addImage },
    { l: "⊟ מרכוז", t: "פסקה ממורכזת", on: () => wrap('\n<p style="text-align:center">', "</p>\n", "טקסט ממורכז") },
    { l: "🟡 זהב", t: "צבע זהב", on: () => wrap('<span style="color:#f6e27a">', "</span>") },
    { l: "⚪ קרם", t: "צבע קרם", on: () => wrap('<span style="color:#ede4d3">', "</span>") },
    { l: "— קו", t: "קו מפריד", on: () => insert("\n<hr />\n") },
  ];

  return (
    <div className="ape" dir="rtl">
      <style>{POST_CONTENT_CSS}</style>
      <style>{`
        .ape { background: linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%);
          border: 1px solid ${C.borderGold}; border-top: 3px solid ${C.gold}; border-radius: 10px; padding: 18px 18px 16px; }
        .ape-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
        .ape-head > span:first-child { color: ${C.goldBright}; font-family: ${F.heading}; font-size: 13px; font-weight: 800; letter-spacing: 2px; }
        .ape-hint { color: ${C.goldDim}; font-family: ${F.body}; font-size: 12px; }
        .ape-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 12px 0 8px;
          padding: 8px; border: 1px solid ${C.border}; border-radius: 8px; background: rgba(8,5,2,0.5); }
        .ape-tool { cursor: pointer; background: ${C.bgGlow}; border: 1px solid ${C.border}; color: ${C.goldLight};
          font-family: ${F.heading}; font-size: 12px; padding: 6px 10px; border-radius: 6px; transition: border-color .15s, background .15s, color .15s; }
        .ape-tool:hover { border-color: ${C.gold}; background: ${C.surface}; color: ${C.goldBright}; }
        .ape-spacer { flex: 1; }
        .ape-preview.on { background: ${C.gold}; color: #1a0e00; border-color: ${C.gold}; font-weight: 800; }
        .ape-content { width: 100%; box-sizing: border-box; background: ${C.bg}; border: 1px solid ${C.border};
          border-radius: 8px; color: #ede4d3; font-family: ${F.mono}; font-size: 13.5px; line-height: 1.7;
          padding: 12px 14px; direction: ltr; text-align: right; resize: vertical; min-height: 320px; outline: none; }
        .ape-content:focus { border-color: ${C.gold}; }
        .ape-preview-pane { border: 1px dashed ${C.borderGold}; border-radius: 8px; padding: 18px 16px;
          background: rgba(5,4,0,0.4); min-height: 320px; max-height: 60vh; overflow-y: auto; }
        .ape-preview-pane .sod-post-content { font-size: 15px; }
        .ape-err { color: #d98a92; font-family: ${F.heading}; font-size: 12px; margin: 8px 0 0; }
        .ape-actions { display: flex; gap: 12px; margin-top: 14px; }
        .ape-save { cursor: pointer; background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); border: none; color: #1a0e00;
          padding: 11px 24px; border-radius: 8px; font-family: ${F.heading}; font-size: 14px; font-weight: 800; letter-spacing: 1px; }
        .ape-save:disabled { opacity: .6; cursor: default; }
        .ape-cancel { cursor: pointer; background: none; border: 1px solid ${C.borderGold}; color: ${C.goldDim};
          padding: 11px 22px; border-radius: 8px; font-family: ${F.heading}; font-size: 14px; letter-spacing: 1px; }
      `}</style>

      <div className="ape-head">
        <span>✦ עריכת פוסט — מצב מנהל</span>
        <span className="ape-hint">השמירה מקפיצה את הפוסט לראש «עדכונים אחרונים»</span>
      </div>

      <label style={labelStyle}>כותרת</label>
      <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={inputStyle} />

      <label style={labelStyle}>תקציר</label>
      <textarea value={draft.excerpt} onChange={e => setDraft(d => ({ ...d, excerpt: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />

      <label style={labelStyle}>תוכן</label>
      <div className="ape-toolbar">
        {tools.map(t => (
          <button key={t.l} type="button" title={t.t} onClick={t.on} className="ape-tool"
            style={{ fontWeight: t.bold ? 800 : undefined, fontStyle: t.italic ? "italic" : undefined }}>
            {t.l}
          </button>
        ))}
        <span className="ape-spacer" />
        <button type="button" className={`ape-tool ape-preview${preview ? " on" : ""}`} onClick={() => setPreview(p => !p)}>
          {preview ? "✎ חזרה לעריכה" : "👁 תצוגה מקדימה"}
        </button>
      </div>

      {preview ? (
        <div className="ape-preview-pane">
          <div className="sod-post-content" dangerouslySetInnerHTML={{ __html: draft.content || "<p>(אין תוכן)</p>" }} />
        </div>
      ) : (
        <textarea ref={taRef} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
          rows={18} className="ape-content" spellCheck={false} />
      )}

      {saveErr && <p className="ape-err">{saveErr}</p>}

      <div className="ape-actions">
        <button onClick={onSave} disabled={saving} className="ape-save">{saving ? "שומר…" : "💾 שמירה וקפיצה לראש"}</button>
        <button onClick={onCancel} disabled={saving} className="ape-cancel">ביטול</button>
      </div>
    </div>
  );
}
