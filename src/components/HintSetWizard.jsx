import React, { useState, useRef, useCallback } from "react";
import { C, F } from "../theme.js";
import { saveHintSet, addHintSetMember, saveTrail, addTrailMember } from "../lib/supabase.js";
import { domNum, hintNums } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";

// ──────────────────────────────────────────────────
// אשף בניית סטים ומסלולים — 4 שלבים + עברית מלאה
// Props:
//   imgs      — מערך כל התמונות (מ-ArchivePage)
//   onClose() — סגור
//   onSaved(set) — לאחר שמירה מוצלחת
// ──────────────────────────────────────────────────

const VIS_OPTIONS = [
  { v: "public",  label: "🟢 ציבורי",   desc: "כולם יכולים לראות" },
  { v: "member",  label: "🔵 רשומים",   desc: "משתמשים רשומים בלבד" },
  { v: "premium", label: "🟣 מנויים",   desc: "מנויים פעילים בלבד" },
  { v: "admin",   label: "🔴 מנהלים",   desc: "נראה רק לך" },
];
const IMP_OPTIONS = [
  { v: 5, label: "🔥 חזק מאוד",   desc: "יופיע ראשון בכל מקום" },
  { v: 4, label: "⭐ חזק",         desc: "עדיפות גבוהה" },
  { v: 3, label: "• בינוני",       desc: "ברירת מחדל" },
  { v: 2, label: "• חלש",          desc: "עדיפות נמוכה" },
  { v: 1, label: "• רקע",          desc: "מוסתר בדרך כלל" },
];
const TRAIL_TYPES = [
  { v: "story",    label: "📖 סיפור",  desc: "רצף נרטיבי" },
  { v: "research", label: "🔬 מחקר",  desc: "ממצאים מחקריים" },
  { v: "learning", label: "📚 לימוד", desc: "חומר לימודי מובנה" },
  { v: "course",   label: "🎓 קורס",  desc: "שיעורים ממוספרים" },
  { v: "journey",  label: "🗺️ מסע",   desc: "מסלול גיאוגרפי/רוחני" },
];
const STATUS_OPTIONS = [
  { v: "draft",     label: "📝 טיוטה",   desc: "נשמר, לא מפורסם" },
  { v: "published", label: "✅ מפורסם",  desc: "גלוי לציבור (לפי רמת גישה)" },
  { v: "archived",  label: "📦 ארכיון",  desc: "מוסתר, לא נמחק" },
];

const STEPS = ["סוג", "פרטים", "תמונות", "סיכום"];

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: "help", color: "#a89060", fontSize: 13, marginRight: 3 }}>ℹ️</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "120%", right: 0, background: "#1a1400", color: "#d4af37",
          border: "1px solid rgba(212,175,55,0.35)", borderRadius: 8, padding: "6px 10px",
          fontSize: 12, fontFamily: F.body, lineHeight: 1.6, whiteSpace: "nowrap",
          zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.7)"
        }}>{text}</span>
      )}
    </span>
  );
}

function FieldLabel({ label, tooltip, required }) {
  return (
    <div style={{ color: "#d4af37", fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
      {label}{required && <span style={{ color: "#e0556a" }}> *</span>}
      {tooltip && <Tooltip text={tooltip} />}
    </div>
  );
}

function inp(extra = {}) {
  return {
    style: {
      background: "rgba(255,255,255,0.06)", color: "#e8d8a0", border: "1px solid rgba(212,175,55,0.3)",
      borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.body, width: "100%",
      outline: "none", ...extra.style,
    },
    ...extra,
  };
}

export default function HintSetWizard({ imgs = [], onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null); // 'hint_set' | 'trail'
  const [fields, setFields] = useState({
    name: "", summary: "", description: "", importance: 3,
    visibility: "public", status: "draft",
    primary_number: "", anchor_numbers: "",
    cover_image: "", trail_type: "story",
  });
  const [numFilter, setNumFilter] = useState("");
  const [selected, setSelected] = useState(new Set()); // image IDs
  const [ordered, setOrdered] = useState([]);           // image objects in drag order
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // drag-and-drop state
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const upd = (k, v) => setFields(f => ({ ...f, [k]: v }));

  // ── שלב 2: סינון תמונות ──
  const numVal = numFilter.trim();
  const filteredImgs = numVal
    ? imgs.filter(im => {
        const nums = hintNums(im).map(String);
        const pv = String(im.primary_value ?? im.primary_number ?? "");
        return nums.includes(numVal) || pv === numVal;
      })
    : imgs;

  function toggleImg(im) {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(im.id)) n.delete(im.id);
      else n.add(im.id);
      return n;
    });
  }
  function selectAll() { setSelected(new Set(filteredImgs.map(im => im.id))); }
  function clearAll() { setSelected(new Set()); }

  // ── מעבר לשלב 3: בנה ordered ──
  function goToOrder() {
    const sel = imgs.filter(im => selected.has(im.id));
    setOrdered(sel);
    setStep(3);
  }

  // ── Drag-and-drop בשלב 3 ──
  function onDragStart(idx) { dragIdx.current = idx; }
  function onDragEnter(idx) { setDragOver(idx); }
  function onDrop(idx) {
    if (dragIdx.current == null || dragIdx.current === idx) { dragIdx.current = null; setDragOver(null); return; }
    const arr = [...ordered];
    const [moved] = arr.splice(dragIdx.current, 1);
    arr.splice(idx, 0, moved);
    setOrdered(arr);
    dragIdx.current = null;
    setDragOver(null);
  }

  // ── שמירה ──
  async function handleSave(status) {
    setSaving(true); setError(null);
    try {
      const anchors = fields.anchor_numbers
        ? fields.anchor_numbers.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n))
        : null;
      const payload = {
        name: fields.name.trim(),
        summary: fields.summary.trim() || null,
        description: fields.description.trim() || null,
        importance: fields.importance,
        visibility: fields.visibility,
        status: status || fields.status,
        primary_number: fields.primary_number ? parseInt(fields.primary_number, 10) || null : null,
        primary_value:  fields.primary_number ? parseInt(fields.primary_number, 10) || null : null,
        anchor_numbers: anchors?.length ? anchors : null,
        cover_image: fields.cover_image.trim() || (ordered[0]?.image_url ?? null) || null,
      };

      let created;
      if (type === "trail") {
        created = await saveTrail({ ...payload, trail_type: fields.trail_type });
        for (let i = 0; i < ordered.length; i++) {
          await addTrailMember(created.id, "image", ordered[i].id, i);
        }
      } else {
        created = await saveHintSet(payload);
        for (let i = 0; i < ordered.length; i++) {
          await addHintSetMember(created.id, "image", ordered[i].id, i);
        }
      }
      onSaved?.(created);
      onClose?.();
    } catch (e) {
      setError(e.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  const canNext0 = type != null;
  const canNext1 = fields.name.trim().length > 0;
  const canNext2 = selected.size > 0;

  // ──────────────────── UI ────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,4,0,0.88)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0d0a02", border: "1px solid rgba(212,175,55,0.4)",
        borderRadius: 20, width: "100%", maxWidth: 780, maxHeight: "90vh",
        display: "flex", flexDirection: "column", direction: "rtl",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,175,55,0.07)",
      }}>
        {/* כותרת + סגירה */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px 0", flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>{type === "trail" ? "📖" : "📦"}</span>
          <h2 style={{ margin: 0, color: "#d4af37", fontFamily: F.regal, fontSize: 20, flex: 1 }}>
            {type === "trail" ? "אשף בניית מסלול" : type === "hint_set" ? "אשף בניית סט תוכן" : "אשף בניית סט / מסלול"}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#a89060", fontSize: 22, cursor: "pointer", lineHeight: 1
          }}>✕</button>
        </div>

        {/* פס התקדמות */}
        <div style={{ display: "flex", gap: 0, padding: "14px 22px 0", flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: step > i ? "#d4af37" : step === i ? "rgba(212,175,55,0.25)" : "transparent",
                  border: `2px solid ${step >= i ? "#d4af37" : "rgba(212,175,55,0.25)"}`,
                  color: step > i ? "#0d0a02" : step === i ? "#d4af37" : "#a89060",
                  fontFamily: F.heading, fontSize: 12, fontWeight: 800,
                }}>
                  {step > i ? "✓" : i + 1}
                </div>
                <div style={{ color: step === i ? "#d4af37" : "#6a5a30", fontFamily: F.heading, fontSize: 10, marginTop: 3 }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 2, height: 2, alignSelf: "flex-start", marginTop: 13, background: i < step ? "#d4af37" : "rgba(212,175,55,0.2)" }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* תוכן השלב */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>

          {/* שלב 0 — בחירת סוג */}
          {step === 0 && (
            <div>
              <p style={{ color: "#a89060", fontFamily: F.body, fontSize: 14, lineHeight: 1.8, marginTop: 0 }}>
                מה אתה רוצה לבנות?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
                {[
                  { k: "hint_set", icon: "📦", title: "סט תוכן", desc: "קבוצת רמזים שתמיד מוצגים יחד — כמו אוסף תמונות ממאורע אחד, גימטריה משותפת, או כמה ממצאים שמחזקים אחד את השני." },
                  { k: "trail", icon: "📖", title: "מסלול", desc: "רצף מסודר עם כיוון — לימוד, מחקר, סיפור או מסע. כל פריט בא אחרי הקודם ויש לו נרטיב." },
                ].map(({ k, icon, title, desc }) => (
                  <button key={k} onClick={() => setType(k)} style={{
                    cursor: "pointer", textAlign: "right", padding: "18px 16px",
                    border: `2px solid ${type === k ? "#d4af37" : "rgba(212,175,55,0.25)"}`,
                    background: type === k ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                    borderRadius: 14, transition: "all .18s",
                  }}>
                    <div style={{ fontSize: 34, marginBottom: 8 }}>{icon}</div>
                    <div style={{ color: "#d4af37", fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{title}</div>
                    <div style={{ color: "#a89060", fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* שלב 1 — פרטים */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <FieldLabel label="שם" required tooltip="שם קצר וברור שיזכיר לך על מה מדובר" />
                <input {...inp()} value={fields.name} onChange={e => upd("name", e.target.value)}
                  placeholder={type === "trail" ? "למשל: מסלול הגאולה — מנבואה לעשייה" : "למשל: ממצאי מירון תשפ\"ג"} />
              </div>
              <div>
                <FieldLabel label="סיכום קצר" tooltip="משפט-שניים לכרטיסי תצוגה ו-SEO" />
                <input {...inp()} value={fields.summary} onChange={e => upd("summary", e.target.value)}
                  placeholder="משפט קצר שמסביר על מה מדובר…" />
              </div>
              <div>
                <FieldLabel label="הסבר מפורט (אופציונלי)" />
                <textarea {...inp({ style: { minHeight: 70, resize: "vertical" } })}
                  value={fields.description} onChange={e => upd("description", e.target.value)}
                  placeholder="הקשר, רקע, מה מיוחד בסט הזה…" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FieldLabel label="חוזק" tooltip="קובע את סדר הופעה: חוזק 5 יופיע ראשון בכל רשימה" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
                    {IMP_OPTIONS.map(o => (
                      <button key={o.v} onClick={() => upd("importance", o.v)} style={{
                        cursor: "pointer", textAlign: "right", padding: "7px 10px", borderRadius: 8,
                        border: `1px solid ${fields.importance === o.v ? "#d4af37" : "rgba(212,175,55,0.2)"}`,
                        background: fields.importance === o.v ? "rgba(212,175,55,0.15)" : "transparent",
                        color: fields.importance === o.v ? "#d4af37" : "#a89060", fontFamily: F.heading, fontSize: 12,
                        display: "flex", justifyContent: "space-between",
                      }}>
                        <span>{o.label}</span>
                        <span style={{ fontSize: 10, color: "#6a5a30" }}>{o.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <FieldLabel label="רמת גישה" tooltip="מי יכול לראות את הסט באתר" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {VIS_OPTIONS.map(o => (
                        <button key={o.v} onClick={() => upd("visibility", o.v)} style={{
                          cursor: "pointer", textAlign: "right", padding: "7px 10px", borderRadius: 8,
                          border: `1px solid ${fields.visibility === o.v ? "#d4af37" : "rgba(212,175,55,0.2)"}`,
                          background: fields.visibility === o.v ? "rgba(212,175,55,0.15)" : "transparent",
                          color: fields.visibility === o.v ? "#d4af37" : "#a89060", fontFamily: F.heading, fontSize: 12,
                          display: "flex", justifyContent: "space-between",
                        }}>
                          <span>{o.label}</span>
                          <span style={{ fontSize: 10, color: "#6a5a30" }}>{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {type === "trail" && (
                    <div>
                      <FieldLabel label="סוג מסלול" tooltip="אופי התוכן של המסלול" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {TRAIL_TYPES.map(o => (
                          <button key={o.v} onClick={() => upd("trail_type", o.v)} style={{
                            cursor: "pointer", textAlign: "right", padding: "7px 10px", borderRadius: 8,
                            border: `1px solid ${fields.trail_type === o.v ? "#d4af37" : "rgba(212,175,55,0.2)"}`,
                            background: fields.trail_type === o.v ? "rgba(212,175,55,0.15)" : "transparent",
                            color: fields.trail_type === o.v ? "#d4af37" : "#a89060", fontFamily: F.heading, fontSize: 12,
                            display: "flex", justifyContent: "space-between",
                          }}>
                            <span>{o.label}</span>
                            <span style={{ fontSize: 10, color: "#6a5a30" }}>{o.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FieldLabel label="מספר ראשי" tooltip="המספר שמייצג את הסט (לכרטיס ולדף המספר)" />
                  <input {...inp()} type="number" value={fields.primary_number}
                    onChange={e => upd("primary_number", e.target.value)} placeholder="למשל: 45" />
                </div>
                <div>
                  <FieldLabel label="מספרים דומיננטיים" tooltip="המספרים שאליהם הסט שייך. דפי המספר ימשכו אוטומטית. מופרדים בפסיק." />
                  <input {...inp()} value={fields.anchor_numbers}
                    onChange={e => upd("anchor_numbers", e.target.value)} placeholder="14, 45, 1820" />
                </div>
              </div>
              <div>
                <FieldLabel label="תמונת שער (URL)" tooltip="תמונה שתופיע בכרטיס הסט. אם ריק — תילקח תמונה ראשונה מהפריטים." />
                <input {...inp()} value={fields.cover_image}
                  onChange={e => upd("cover_image", e.target.value)} placeholder="https://…" />
              </div>
            </div>
          )}

          {/* שלב 2 — בחירת תמונות */}
          {step === 2 && (
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                <input
                  value={numFilter} onChange={e => setNumFilter(e.target.value)}
                  placeholder="סנן לפי מספר…"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#e8d8a0", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "7px 12px", fontSize: 13, fontFamily: F.body, outline: "none", width: 140 }} />
                <span style={{ color: "#a89060", fontFamily: F.heading, fontSize: 12 }}>
                  {filteredImgs.length} תמונות · {selected.size} נבחרו
                </span>
                <button onClick={selectAll} style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", color: "#d4af37", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>בחר הכל</button>
                <button onClick={clearAll} style={{ background: "rgba(224,85,106,0.1)", border: "1px solid rgba(224,85,106,0.4)", color: "#e0556a", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>נקה הכל</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, maxHeight: 380, overflowY: "auto" }}>
                {filteredImgs.map(im => {
                  const isSel = selected.has(im.id);
                  const v = domNum(im);
                  const title = cleanName(im.name);
                  return (
                    <button key={im.id} onClick={() => toggleImg(im)} style={{
                      position: "relative", cursor: "pointer", borderRadius: 10, overflow: "hidden",
                      border: `2px solid ${isSel ? "#d4af37" : "rgba(255,255,255,0.08)"}`,
                      background: "#0d0a02", aspectRatio: "1", padding: 0, transition: "border-color .15s",
                    }}>
                      {im.image_url
                        ? <img src={im.image_url} alt={title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isSel ? 1 : 0.6 }} />
                        : <div style={{ width: "100%", height: "100%", background: "#1a1400" }} />}
                      {isSel && (
                        <span style={{ position: "absolute", top: 4, insetInlineEnd: 4, background: "#d4af37", color: "#0d0a02", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>✓</span>
                      )}
                      {v != null && (
                        <span style={{ position: "absolute", bottom: 3, insetInlineStart: 3, background: "rgba(212,175,55,0.9)", color: "#0d0a02", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "1px 5px", fontFamily: F.mono }}>{v}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* שלב 3 — סדר + שמירה */}
          {step === 3 && (
            <div>
              <p style={{ color: "#a89060", fontFamily: F.body, fontSize: 13, lineHeight: 1.8, marginTop: 0 }}>
                גרור את הפריטים לסידור הרצוי. הפריט הראשון יהיה תמונת השער.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
                {ordered.map((im, idx) => {
                  const title = cleanName(im.name);
                  const v = domNum(im);
                  return (
                    <div
                      key={im.id}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragEnter={() => onDragEnter(idx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => onDrop(idx)}
                      onDragEnd={() => setDragOver(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: dragOver === idx ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${dragOver === idx ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 10, padding: "6px 10px", cursor: "grab", transition: "all .12s",
                      }}>
                      <span style={{ color: "#6a5a30", fontSize: 14, userSelect: "none", minWidth: 20 }}>⠿</span>
                      <span style={{ color: "#a89060", fontFamily: F.mono, fontSize: 11, minWidth: 18 }}>{idx + 1}</span>
                      {im.image_url && (
                        <img src={im.image_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                      )}
                      {v != null && (
                        <span style={{ background: "rgba(212,175,55,0.85)", color: "#0d0a02", fontFamily: F.mono, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>{v}</span>
                      )}
                      <span style={{ color: "#c8b870", fontFamily: F.body, fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title || "ללא שם"}
                      </span>
                      <button onClick={() => setOrdered(o => o.filter((_, i) => i !== idx))} style={{
                        background: "none", border: "none", color: "#6a5a30", fontSize: 14, cursor: "pointer", flexShrink: 0
                      }}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* תצוגה מקדימה */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ color: "#6a5a30", fontFamily: F.heading, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>תצוגה מקדימה</div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {(fields.cover_image || ordered[0]?.image_url) && (
                    <img src={fields.cover_image || ordered[0]?.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ color: "#d4af37", fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>
                      {type === "trail" ? "📖" : "📦"} {fields.name || "ללא שם"}
                    </div>
                    {fields.summary && <div style={{ color: "#a89060", fontFamily: F.body, fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{fields.summary}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontFamily: F.heading }}>
                        {IMP_OPTIONS.find(o => o.v === fields.importance)?.label}
                      </span>
                      <span style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontFamily: F.heading }}>
                        {VIS_OPTIONS.find(o => o.v === fields.visibility)?.label}
                      </span>
                      <span style={{ color: "#6a5a30", fontFamily: F.heading, fontSize: 11 }}>{ordered.length} פריטים</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && <div style={{ color: "#e0556a", fontFamily: F.heading, fontSize: 12, marginBottom: 10 }}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => handleSave("draft")} disabled={saving} style={{
                  cursor: saving ? "wait" : "pointer", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(212,175,55,0.3)", color: "#a89060",
                  borderRadius: 10, padding: "10px 18px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
                }}>📝 שמור כטיוטה</button>
                <button onClick={() => handleSave("published")} disabled={saving} style={{
                  cursor: saving ? "wait" : "pointer",
                  background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(180,140,30,0.2))",
                  border: "1px solid #d4af37", color: "#d4af37",
                  borderRadius: 10, padding: "10px 18px", fontFamily: F.heading, fontSize: 13, fontWeight: 800,
                }}>{saving ? "שומר…" : "✅ פרסם עכשיו"}</button>
              </div>
            </div>
          )}
        </div>

        {/* כפתורי ניווט */}
        {step < 3 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 22px 18px", flexShrink: 0, borderTop: "1px solid rgba(212,175,55,0.15)" }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
              cursor: step === 0 ? "default" : "pointer",
              background: "none", border: "1px solid rgba(212,175,55,0.25)", color: "#a89060",
              borderRadius: 10, padding: "9px 18px", fontFamily: F.heading, fontSize: 13,
              opacity: step === 0 ? 0 : 1,
            }}>← אחורה</button>
            <button
              onClick={() => {
                if (step === 2) goToOrder();
                else setStep(s => s + 1);
              }}
              disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1) || (step === 2 && !canNext2)}
              style={{
                cursor: "pointer",
                background: "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(180,140,30,0.15))",
                border: `1px solid ${((step === 0 && !canNext0) || (step === 1 && !canNext1) || (step === 2 && !canNext2)) ? "rgba(212,175,55,0.2)" : "#d4af37"}`,
                color: ((step === 0 && !canNext0) || (step === 1 && !canNext1) || (step === 2 && !canNext2)) ? "#6a5a30" : "#d4af37",
                borderRadius: 10, padding: "9px 24px", fontFamily: F.heading, fontSize: 13, fontWeight: 800,
              }}>
              {step === 2 ? `המשך עם ${selected.size} פריטים →` : "המשך →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
