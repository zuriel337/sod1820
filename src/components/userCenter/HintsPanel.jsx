import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { HINT_TYPES, hintTypeMeta } from "../../lib/hintTypes.js";
import { getMyHints, addHint, removeHint, countByType } from "../../lib/hints.js";

// 🧩 הרמזים שלי — ארכיון אישי לפי סוג. פאנל עצמאי (ניתן לרנדור גם במסך-מלא עתידי).
// עץ אחד: כל רמז מצביע למספר → /number/:n, לא משכפל תוכן.
export default function HintsPanel({ T, user }) {
  const [hints, setHints] = useState(null); // null=טוען
  const [filter, setFilter] = useState(null); // סוג פעיל או null=הכל
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    getMyHints(user).then(setHints).catch(() => setHints([]));
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => countByType(hints || []), [hints]);
  const shown = useMemo(() => (hints || []).filter(h => !filter || h.hint_type === filter), [hints, filter]);

  const chip = (active, accent) => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999,
    border: `1px solid ${active ? accent : T.line}`, background: active ? accent : T.card,
    color: active ? "#fff" : T.sub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  });

  if (hints === null) return <div style={{ color: T.sub, fontSize: 13.5, padding: "8px 0" }}>טוען…</div>;

  return (
    <div>
      {/* שורת סוגים + ספירות */}
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setFilter(null)} style={chip(!filter, T.acc)}>הכל {counts._total ? `· ${counts._total}` : ""}</button>
        {HINT_TYPES.filter(t => counts[t.id]).map(t => (
          <button key={t.id} onClick={() => setFilter(filter === t.id ? null : t.id)} style={chip(filter === t.id, t.accent)}>
            {t.icon} {t.label} · {counts[t.id]}
          </button>
        ))}
      </div>

      {/* כפתור הוספה */}
      <button onClick={() => setAdding(a => !a)} style={{
        width: "100%", marginTop: 4, marginBottom: 12, padding: "10px", borderRadius: 10,
        border: `1px dashed ${T.acc}`, background: adding ? T.accSoft : "transparent",
        color: T.acc, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
      }}>{adding ? "✕ סגור" : "➕ הוסף רמז"}</button>

      {adding && <AddHintForm T={T} user={user} onDone={() => { setAdding(false); load(); }} />}

      {/* גלריית הרמזים */}
      {shown.length === 0 ? (
        <EmptyState T={T} filtered={!!filter} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
          {shown.map(h => <HintCard key={h.id} T={T} h={h} user={user} onDelete={() => { removeHint(user, h.id).then(load); }} />)}
        </div>
      )}
    </div>
  );
}

function HintCard({ T, h, onDelete }) {
  const meta = hintTypeMeta(h.hint_type);
  const inner = (
    <>
      {h.image_url ? (
        <img src={h.image_url} alt="" loading="lazy" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flex: "none", border: `1px solid ${T.line}` }} />
      ) : (
        <div style={{ width: 46, height: 46, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", fontSize: 22, background: T.accSoft }}>{meta.icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: meta.accent, fontWeight: 700 }}>{meta.icon} {meta.label}</span>
          {h.number != null && <span>· מספר {h.number.toLocaleString("he")}</span>}
        </div>
        {h.note && <div style={{ fontSize: 12, color: T.sub, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.note}</div>}
      </div>
    </>
  );
  const row = {
    display: "flex", gap: 11, alignItems: "center", padding: 9, borderRadius: 12,
    border: `1px solid ${T.line}`, background: T.card, textDecoration: "none", color: T.ink,
  };
  return (
    <div style={{ position: "relative" }}>
      {h.number != null ? (
        <Link to={`/number/${h.number}`} style={row}>{inner}</Link>
      ) : h.source_url ? (
        <a href={h.source_url} target="_blank" rel="noopener noreferrer" style={row}>{inner}</a>
      ) : (
        <div style={row}>{inner}</div>
      )}
      <button onClick={onDelete} aria-label="מחק" style={{
        position: "absolute", top: 6, left: 6, background: T.bg, border: `1px solid ${T.line}`,
        color: T.sub, borderRadius: 7, width: 24, height: 24, cursor: "pointer", fontSize: 13, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

function AddHintForm({ T, user, onDone }) {
  const [type, setType] = useState("image");
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fld = { width: "100%", padding: "9px 11px", background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 14, marginTop: 5, boxSizing: "border-box" };
  const lbl = { color: T.sub, fontSize: 12, marginTop: 10, display: "block" };

  const save = async () => {
    setBusy(true); setErr("");
    try {
      await addHint(user, { hint_type: type, number, note, image_url: imageUrl, source_url: sourceUrl });
      onDone();
    } catch { setErr("שגיאה בשמירה"); setBusy(false); }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
      <label style={{ ...lbl, marginTop: 0 }}>סוג הרמז</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        {HINT_TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${type === t.id ? t.accent : T.line}`, background: type === t.id ? t.accent : "transparent",
            color: type === t.id ? "#fff" : T.sub,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      <label style={lbl}>מספר דומיננטי (מקשר לדף המספר)</label>
      <input style={fld} value={number} onChange={e => setNumber(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="1820" dir="ltr" />
      <label style={lbl}>הערה / תיאור</label>
      <input style={fld} value={note} onChange={e => setNote(e.target.value)} dir="rtl" placeholder="מה ראית?" />
      <label style={lbl}>קישור לתמונה (אופציונלי)</label>
      <input style={fld} value={imageUrl} onChange={e => setImageUrl(e.target.value)} dir="ltr" placeholder="https://…" />
      <label style={lbl}>קישור למקור (אופציונלי)</label>
      <input style={fld} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} dir="ltr" placeholder="https://…" />
      <button onClick={save} disabled={busy} style={{ width: "100%", marginTop: 14, background: T.acc, color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {busy ? "שומר…" : "שמור רמז"}
      </button>
      {err && <div style={{ color: "#e5484d", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>{err}</div>}
    </div>
  );
}

function EmptyState({ T, filtered }) {
  return (
    <div style={{ textAlign: "center", padding: "26px 12px", color: T.sub }}>
      <div style={{ fontSize: 34, marginBottom: 8 }}>🧩</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
        {filtered ? "אין רמזים בסוג הזה עדיין." : "עוד לא הוספת רמזים. כל רמז שתוסיף — תמונה, לוחית, חלום, סנכרון — מרחיב את העץ שלך ומתחבר למספר בגרף."}
      </div>
    </div>
  );
}
