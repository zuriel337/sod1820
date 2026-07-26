import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getNameProtocol } from "../lib/supabase.js";
import { buildJourney } from "../lib/nameJourney.js";

// 🧭 מסע-המחקר של השם (גל 3) — progress אמיתי (agents[].ok/ms/seq) + מסמך בשכבות.
// שמות-סוכנים לא נחשפים; provenance מוצג כתווית-מקור ניטרלית (השם הגולמי רק ב«נתוני המקור»).

const C = { bg: "#f6f7f9", card: "#ffffff", ink: "#1b1d22", dim: "#5b6472", line: "#e4e7ec", blue: "#2f6df6", gold: "#b78900", green: "#1f8a4c", red: "#c0392b" };
const F = { h: "'Heebo',system-ui,sans-serif", m: "ui-monospace,SFMono-Regular,monospace" };

// fn פנימי → תווית-מקור ניטרלית למשתמש (traceability בלי חשיפת ארכיטקטורה)
const SRC = {
  strongest_crossings: "הצלבת שיטות",
  fn_name_research: "ניתוח אותיות וצורות",
  fn_name_in_tanach: "מקורות התנ״ך",
  fn_all_methods: "מנוע הגימטריה",
  name_lab_research: "מנוע השפות",
  fn_notarikon: "מנוע ראשי-התיבות",
  fn_els_for_name: "מנוע הדילוגים",
  get_graph_bridges: "גרף הקשרים",
  fn_name_neighbors: "שכני-התנ״ך",
  fn_hebrew_root: "מנוע השורש",
};
const srcLabel = (prov) => (prov && prov.fn && SRC[prov.fn]) || null;

const ST = {
  ok:      { mk: "✓", col: "#1f8a4c" },
  empty:   { mk: "○", col: "#9aa1ad" },
  skipped: { mk: "–", col: "#c3c8d0" },
  fail:    { mk: "✕", col: "#c0392b" },
  pending: { mk: "…", col: "#c3c8d0" },
};

function SourceChip({ prov }) {
  const label = srcLabel(prov);
  if (!label) return null;
  return (
    <span title="כל ממצא מחובר למקורו" style={{ background: "#eef4ee", border: "1px solid #cfe4d3", borderRadius: 999, color: C.green, fontFamily: F.h, fontSize: 10.5, fontWeight: 800, padding: "2px 8px" }}>
      ✓ מקור: {label}
    </span>
  );
}

// ── מסע-ההתקדמות — reveal לפי seq אמיתי, קצב לפי ms אמיתי ──
function Progress({ steps, onDone }) {
  const ordered = useMemo(() => [...steps].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), [steps]);
  const [shown, setShown] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    if (shown >= ordered.length) { onDone && onDone(); return; }
    const ms = ordered[shown]?.ms || 0;
    const delay = Math.min(650, Math.max(150, ms * 3)); // קצב מונחה-נתונים (ms אמיתי), מוגבל לתחושה
    timer.current = setTimeout(() => setShown((s) => s + 1), delay);
    return () => clearTimeout(timer.current);
  }, [shown, ordered, onDone]);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ color: C.dim, fontFamily: F.h, fontSize: 13, fontWeight: 800, marginBottom: 12 }}>🔎 מתחילים את המחקר…</div>
      <div style={{ display: "grid", gap: 7 }}>
        {ordered.slice(0, shown).map((s) => {
          const st = ST[s.st] || ST.pending;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.h, fontSize: 14 }}>
              <span style={{ color: st.col, fontWeight: 900, width: 16, textAlign: "center" }}>{st.mk}</span>
              <span style={{ color: s.st === "skipped" ? "#aab" : C.ink, flex: 1 }}>{s.label}</span>
              {s.ms > 0 && <span style={{ color: "#c3c8d0", fontFamily: F.m, fontSize: 11 }}>{s.ms}ms</span>}
            </div>
          );
        })}
        {shown < ordered.length && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.h, fontSize: 14, opacity: 0.6 }}>
            <span style={{ width: 16, textAlign: "center" }}>▹</span>
            <span style={{ color: C.dim }}>{ordered[shown]?.label}…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── מפרשי-שכבה ──
function KV({ obj, link }) {
  if (!obj || typeof obj !== "object") return null;
  const entries = Object.entries(obj).filter(([, v]) => typeof v === "number" || typeof v === "string");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {entries.map(([k, v]) => {
        const inner = (<><span style={{ color: C.dim, fontFamily: F.h, fontSize: 12, fontWeight: 700 }}>{k}</span><b style={{ fontFamily: F.m, color: C.blue, fontSize: 14 }}>{String(v)}</b></>);
        const st = { display: "inline-flex", alignItems: "center", gap: 6, background: "#f6f9ff", border: `1px solid #d9e5ff`, borderRadius: 999, padding: "5px 11px", textDecoration: "none" };
        return link ? <Link key={k} to={`/number/${v}`} style={st}>{inner}</Link> : <span key={k} style={st}>{inner}</span>;
      })}
    </div>
  );
}
const Chips = ({ items, to }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {(items || []).map((x, i) => {
      const t = typeof x === "string" ? x : (x.word || x.phrase || JSON.stringify(x));
      const st = { background: "#f3f7ff", border: "1px solid #d9e5ff", borderRadius: 999, padding: "5px 12px", color: C.blue, fontFamily: F.h, fontSize: 13, fontWeight: 700, textDecoration: "none" };
      return to ? <Link key={i} to={to(t)} style={st}>{t}</Link> : <span key={i} style={st}>{t}</span>;
    })}
  </div>
);
const Empty = ({ t }) => <div style={{ color: C.dim, fontFamily: F.h, fontSize: 13 }}>{t || "אין נתונים בשכבה זו."}</div>;

function CrossList({ items }) {
  if (!items?.length) return <Empty t="לא נמצאו הצלבות רב-שיטתיות." />;
  return (
    <div style={{ display: "grid", gap: 7 }}>
      {items.map((x, i) => (
        <div key={i} style={{ background: "linear-gradient(180deg,#fbfdff,#f3f7ff)", border: "1px solid #d9e5ff", borderRadius: 10, padding: "9px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link to={`/number/${encodeURIComponent(x.partner)}`} style={{ color: C.ink, fontFamily: F.h, fontSize: 14.5, fontWeight: 800, textDecoration: "none" }}>«{x.partner}»</Link>
            <span style={{ background: "#eef4ee", border: "1px solid #cfe4d3", borderRadius: 999, color: C.green, fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }}>{x.n_methods} שיטות</span>
          </div>
          {(x.detail || x.methods_detail) && <div style={{ color: C.dim, fontFamily: F.m, fontSize: 11.5, marginTop: 4 }}>{x.detail || x.methods_detail}</div>}
        </div>
      ))}
    </div>
  );
}

function LayerBody({ layer }) {
  const d = layer.data || {};
  switch (layer.id) {
    case "overview":
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {d.value != null && <div style={{ fontFamily: F.h, fontSize: 14, color: C.ink }}>ערך רגיל: <b style={{ fontFamily: F.m, color: C.blue, fontSize: 18 }}>{d.value}</b></div>}
          {d.follow_up?.length > 0 && (
            <div>
              <div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>כיווני-המשך <span style={{ fontWeight: 500 }}>(הצעות מחקר — לא עובדות)</span></div>
              <div style={{ display: "grid", gap: 5 }}>
                {d.follow_up.map((q, i) => <div key={i} style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 11px", color: C.ink, fontFamily: F.h, fontSize: 13 }}>→ {q}</div>)}
              </div>
            </div>
          )}
        </div>
      );
    case "key": {
      const items = d.items || [];
      if (!items.length) return <Empty t="אין ממצא רב-שיטתי בולט לשם זה." />;
      return (
        <div style={{ display: "grid", gap: 7 }}>
          {items.map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ fontSize: 15 }}>💥</span>
              <Link to={`/number/${encodeURIComponent(x.partner)}`} style={{ color: C.ink, fontFamily: F.h, fontSize: 14.5, fontWeight: 800, textDecoration: "none" }}>«{x.partner}»</Link>
              <span style={{ color: C.dim, fontFamily: F.h, fontSize: 12.5 }}>נפגש ב-<b style={{ color: C.green }}>{x.n_methods}</b> שיטות עצמאיות</span>
              {x.detail && <span style={{ color: "#9aa1ad", fontFamily: F.m, fontSize: 11 }}>· {x.detail}</span>}
            </div>
          ))}
        </div>
      );
    }
    case "cross": return <CrossList items={d.items} />;
    case "tanach": {
      if (!d || d.count == null) return <Empty t="השם לא נמצא ככתיב-מלא בתנ״ך." />;
      const arr = d.books || d.by_book || null;
      const samples = d.samples || d.verses || d.first_verses || null;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ background: "#f3f7ff", border: "1px solid #d9e5ff", borderRadius: 999, padding: "6px 14px", fontFamily: F.h, fontSize: 13.5, fontWeight: 800, color: C.ink, justifySelf: "start" }}>📖 {d.count} הופעות</span>
          {Array.isArray(arr) && arr.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{arr.slice(0, 16).map((b, i) => <span key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.h, fontSize: 12, fontWeight: 700, color: C.dim }}>{b.book || b.name} {b.n != null && <b style={{ color: C.blue }}>{b.n}</b>}</span>)}</div>}
          {Array.isArray(samples) && samples.slice(0, 3).map((v, i) => <div key={i} style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px" }}><div style={{ color: C.blue, fontFamily: F.h, fontSize: 11.5, fontWeight: 800 }}>{v.ref}</div><div style={{ color: "#3a4553", fontFamily: F.h, fontSize: 13, lineHeight: 1.7 }}>{v.text}</div></div>)}
        </div>
      );
    }
    case "numbers":
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {d.methods && <div><div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>שיטות</div><KV obj={d.methods} link /></div>}
          {d.same_value?.length > 0 && <div><div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>מתכנסים לאותו ערך</div><Chips items={d.same_value} to={(t) => `/number/${encodeURIComponent(t)}`} /></div>}
        </div>
      );
    case "letters":
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {d.root?.root_candidate && (
            <div style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: C.dim, fontFamily: F.h, fontSize: 12.5, fontWeight: 700 }}>שורש-מועמד</span>
                <b style={{ fontFamily: F.h, fontSize: 16, color: C.ink }}>{d.root.root_candidate}</b>
                <span style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11 }}>({d.root.confidence === "medium" ? "ביטחון בינוני" : "ביטחון נמוך"})</span>
                {d.root_prov && <SourceChip prov={d.root_prov} />}
              </div>
              {d.root.related?.length > 0 && <div style={{ marginTop: 7 }}><Chips items={d.root.related} to={(t) => `/number/${encodeURIComponent(t)}`} /></div>}
            </div>
          )}
          {d.anagrams?.length > 0 && <div><div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>אנגרמות</div><Chips items={d.anagrams} to={(t) => `/number/${encodeURIComponent(t)}`} /></div>}
          {(!d.root?.root_candidate && !d.anagrams?.length) && <Empty />}
        </div>
      );
    case "notarikon": {
      const rt = d?.rashei_tevot || [], sf = d?.sofei_tevot || [];
      if (!rt.length && !sf.length) return <Empty t={d?.note || "לא נמצאו ראשי/סופי-תיבות לשם זה (שכיח בשמות ארוכים)."} />;
      const list = (arr, label) => arr.length > 0 && (
        <div>
          <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label} <span style={{ color: "#9aa1ad", fontWeight: 600 }}>({arr.length})</span></div>
          <div style={{ display: "grid", gap: 5 }}>
            {arr.slice(0, 8).map((h, i) => (
              <div key={i} style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 11px" }}>
                <span style={{ color: C.blue, fontFamily: F.h, fontSize: 12, fontWeight: 800 }}>{h.ref}</span>
                <span style={{ color: "#3a4553", fontFamily: F.h, fontSize: 13, marginRight: 8 }}>{Array.isArray(h.words) ? h.words.join(" ") : ""}</span>
              </div>
            ))}
          </div>
        </div>
      );
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {list(rt, "🔤 ראשי-תיבות")}
          {list(sf, "🔡 סופי-תיבות")}
        </div>
      );
    }
    case "language": {
      const br = d?.bridges || [];
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {br.length > 0 ? br.map((b, i) => <div key={i} style={{ background: "#f3f7ff", border: "1px solid #d9e5ff", borderRadius: 10, padding: "8px 12px", fontFamily: F.h, fontSize: 13.5, color: C.ink }}>{b.hebrew} ↔ {b.foreign_word} <b style={{ color: C.blue, fontFamily: F.m }}>{b.gematria_he}</b></div>) : <Empty t="לא נמצא גשר חוצה-שפה מאומת לשם זה." />}
          <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12 }}>הקשר בגרף: {d?.posts_count || 0} פוסטים · {d?.treasures_count || 0} אוצרות · {d?.hints_count || 0} חידושים.</div>
        </div>
      );
    }
    case "network":
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {d.neighbors?.length > 0 ? <div><div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>שכנים בתנ״ך</div><Chips items={d.neighbors} to={(t) => `/number/${encodeURIComponent(t)}`} /></div> : <Empty t="אין עדיין רשת-קשרים לשם זה." />}
        </div>
      );
    case "els": {
      const on = d?.on_file || [], hits = d?.search?.hits || [];
      const has = (d?.els_count || 0) > 0 || on.length > 0;
      if (!has) return <Empty t={d?.note || "לא נמצא דילוג לשם זה בתורה."} />;
      const stat = (label, n, col) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f6f9ff", border: `1px solid ${C.blueLine || "#d9e5ff"}`, borderRadius: 999, padding: "5px 12px" }}>
          <span style={{ color: C.dim, fontFamily: F.h, fontSize: 12, fontWeight: 700 }}>{label}</span>
          <b style={{ fontFamily: F.m, color: col || C.blue, fontSize: 15 }}>{n}</b>
        </span>
      );
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {stat("ברצף (גלוי)", d.plain ?? 0)}
            {stat("בדילוגים (נסתר)", d.els_count ?? 0, C.green)}
            {d.min_skip != null && stat("הדילוג הקצר", d.min_skip, C.gold)}
          </div>
          {hits.length > 0 && (
            <div>
              <div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>הדילוגים ההדוקים ביותר:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {hits.slice(0, 12).map((h, i) => (
                  <span key={i} title={`מיקום ${h.start}`} style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.h, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                    דילוג {h.skip}{h.dir < 0 ? " ↩︎" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          {on.map((r, i) => <div key={i} style={{ background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 11px", fontFamily: F.h, fontSize: 13, color: C.ink }}>💾 {r.title || r.term} <span style={{ color: C.dim, fontSize: 12 }}>· דילוג {r.skip} · {r.book || r.scope}</span></div>)}
          {d?.note && <div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11.5 }}>{d.note}</div>}
        </div>
      );
    }
    case "scores":
      return d ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontFamily: F.h, fontSize: 14, color: C.ink }}>עומק-הצלבה: <b style={{ fontFamily: F.m, color: C.blue, fontSize: 18 }}>{d.depth}</b> / 100</div>
          {d.parts && <KV obj={d.parts} />}
        </div>
      ) : <Empty />;
    case "raw":
      return (
        <div style={{ overflowX: "auto", background: "#0f1115", borderRadius: 10, padding: 12 }}>
          <pre style={{ margin: 0, color: "#cbd5e1", fontFamily: F.m, fontSize: 11, lineHeight: 1.5, whiteSpace: "pre" }}>{JSON.stringify(d, null, 2)}</pre>
        </div>
      );
    default:
      return <Empty />;
  }
}

function Layer({ layer, open, onToggle }) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: "14px 16px", textAlign: "right", minHeight: 48 }}>
        <span style={{ fontSize: 17 }}>{layer.icon}</span>
        <span style={{ color: C.ink, fontFamily: F.h, fontSize: 15.5, fontWeight: 800, flex: 1 }}>{layer.title}</span>
        {layer.kind === "fact" && <SourceChip prov={layer.provenance} />}
        {layer.kind === "raw" && <span style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11 }}>למי שרוצה לחפור</span>}
        <span style={{ color: C.dim, fontFamily: F.h, fontSize: 16, fontWeight: 800 }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}><LayerBody layer={layer} /></div>}
    </section>
  );
}

export default function NameJourney({ word }) {
  const [doc, setDoc] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle|loading|journey|done|err
  const [open, setOpen] = useState({ overview: true, key: true });

  useEffect(() => {
    const w = (word || "").trim();
    if (!w) { setPhase("idle"); setDoc(null); return; }
    let live = true;
    setPhase("loading"); setDoc(null);
    getNameProtocol(w).then((d) => {
      if (!live) return;
      if (!d || d.error) { setDoc(d); setPhase("err"); return; }
      setDoc(d); setPhase("journey");
    }).catch(() => live && setPhase("err"));
    return () => { live = false; };
  }, [word]);

  const journey = useMemo(() => (doc && !doc.error ? buildJourney(doc) : null), [doc]);

  if (phase === "idle") return null;
  if (phase === "loading") return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "20px", color: C.dim, fontFamily: F.h, fontSize: 14 }}>🔎 מתחילים את המחקר על «{word}»…</div>
  );
  if (phase === "err" || !journey) return (
    <div style={{ background: "#fff6f6", border: "1px solid #f2c9c9", borderRadius: 16, padding: "16px 20px", color: C.red, fontFamily: F.h, fontSize: 14 }}>
      {doc?.error === "empty_name" ? "הזן שם למחקר." : "המחקר לא זמין כרגע. נסה שוב."}
    </div>
  );

  const h = journey.header;
  return (
    <div dir="rtl" style={{ display: "grid", gap: 14 }}>
      {/* כותרת-מחקר */}
      <div style={{ background: "linear-gradient(180deg,#ffffff,#f3f7ff)", border: "1px solid #d9e5ff", borderRadius: 16, padding: "16px 20px", textAlign: "center" }}>
        <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12, letterSpacing: 2 }}>מחקר</div>
        <div style={{ color: C.ink, fontFamily: F.h, fontSize: 26, fontWeight: 800, margin: "2px 0 10px" }}>{h.name}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          <div><b style={{ fontFamily: F.m, color: C.blue, fontSize: 22 }}>{h.depth ?? "—"}</b><span style={{ color: C.dim, fontFamily: F.h, fontSize: 11 }}> / 100</span><div style={{ color: C.dim, fontFamily: F.h, fontSize: 11 }}>עומק</div></div>
          <div><b style={{ fontFamily: F.m, color: C.ink, fontSize: 22 }}>{h.findings}</b><div style={{ color: C.dim, fontFamily: F.h, fontSize: 11 }}>ממצאים</div></div>
          <div><b style={{ fontFamily: F.m, color: C.green, fontSize: 22 }}>{h.crossings}</b><div style={{ color: C.dim, fontFamily: F.h, fontSize: 11 }}>הצלבות</div></div>
          {h.value != null && <div><b style={{ fontFamily: F.m, color: C.gold, fontSize: 22 }}>{h.value}</b><div style={{ color: C.dim, fontFamily: F.h, fontSize: 11 }}>ערך</div></div>}
        </div>
      </div>

      {phase === "journey" ? (
        <Progress steps={journey.steps} onDone={() => setPhase("done")} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {journey.layers.map((l) => (
            <Layer key={l.id} layer={l} open={!!open[l.id]} onToggle={() => setOpen((o) => ({ ...o, [l.id]: !o[l.id] }))} />
          ))}
        </div>
      )}
    </div>
  );
}
