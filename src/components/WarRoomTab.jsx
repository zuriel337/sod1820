// 🎛️ חדר המפקדה (CC-1) — View קורא-בלבד על כל האוצר (לא רק Discovery).
// חוקי-ברזל (§13.8): אין WRITE · אין קידום · אין engine · אין שינוי EntityPage/גרף.
// שער=החלטה-לא-ראות (§11.34): חומר שלפני research_objects נראה כאן. HOT≠TRUE · VIP≠TRUE · Claim≠Fact.
// כל הנתונים מ-helpers קיימים בלבד (reuse-first). מסלול-החומר מראה «איפה נעצר».
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  getResearchFeed, getWaGroups, getWaLog, getForumMaterial,
  getLanguageLinks, getLanguageStats, getHotNumbers, getPostsFromSupabase,
} from "../lib/supabase.js";
import {
  materialTrack, MATERIAL_STAGES, TRACK_COLOR, TRACK_LABEL, langRelLabel,
} from "../lib/discovery.js";
import AiAnalyze from "./AiAnalyze.jsx";

const WRITERS = ["יניב לוי", "שמעון חיימוב", "ציון סיבוני", "צבי (OPOC)", "יצחק שחר קנדרו", "כריסטינה", "סלי מור"];

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 0 };
const chip = (active, col) => ({
  cursor: "pointer", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 800, fontFamily: F.heading,
  border: `1px solid ${active ? (col || C.goldBright) : C.border}`, background: active ? (col || C.goldBright) + "22" : "transparent",
  color: active ? (col || C.goldBright) : C.muted, whiteSpace: "nowrap",
});
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading });
const fmt = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "—";

// ── נורמליזציה: כל מקור → פריט אחיד (למסלול-חומר) ──────────────────────────
function claimInfo(gc) {
  if (!gc || typeof gc !== "object") return { verified: false, values: [], cross: false };
  const layers = Array.isArray(gc.engine_verified_layers) ? gc.engine_verified_layers : [];
  const values = layers.map(l => l && l.value).filter(v => v != null);
  return { verified: gc.verified === true || layers.length > 0, values, cross: layers.length > 1 };
}
function normForum(r) {
  const ci = claimInfo(r.gematria_claim);
  return {
    key: "c:" + r.id, source: "תגובה", author: r.author_name || "—", ts: r.created_at,
    raw: (r.body || r.title || "").trim(), lang: null,
    engineVerified: ci.verified, values: ci.values, hasCross: ci.cross,
    inFeed: false, inGraph: !!r.graph_node_id, published: r.status === "published",
    value: null, target: r.target_type,
  };
}
function normWa(r) {
  const act = r.action || "";
  return {
    key: "w:" + (r.group_id || "") + ":" + (r.created_at || "") + ":" + (r.sender_name || ""),
    source: "WhatsApp", author: r.sender_name || "—", group: r.group_id, ts: r.created_at,
    raw: (r.text_in || "").trim(), lang: null,
    engineVerified: r.value != null, values: r.value != null ? [r.value] : [], hasCross: false,
    inFeed: false, inGraph: false, published: /saved|channel|vip/.test(act),
    value: r.value,
  };
}
function normPost(r) {
  const t = r.title?.rendered || r.title || "";
  return {
    key: "p:" + (r.slug || r.id), source: "פוסט", author: r.author || "המערכת", ts: r.date,
    raw: String(t).replace(/<[^>]+>/g, "").trim(), lang: null,
    engineVerified: false, values: [], hasCross: false,
    inFeed: false, inGraph: false, published: true, value: null, link: r.link || (r.slug ? "/" + r.slug : null),
  };
}
function normCandidate(r) {
  return {
    key: "r:" + r.id, source: "מנוע", author: r.contributor || "מנוע-הגילויים", ts: r.created_at,
    raw: r.statement || "", lang: null,
    engineVerified: r.engine_verified === true, values: r.value != null ? [r.value] : [],
    hasCross: (r.kind === "relation"), inFeed: true, judged: r.status !== "candidate",
    inGraph: !!r.promoted_node_id, published: false, value: r.value, kind: r.kind, status: r.status,
  };
}

// ── מסלול-החומר (הרכיב המרכזי) ─────────────────────────────────────────────
function TrackBar({ item }) {
  const track = useMemo(() => materialTrack(item), [item]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 8 }}>
      {track.map((t, i) => (
        <span key={i} title={`${t.stage}: ${TRACK_LABEL[t.state]}`}
          style={{
            fontSize: 9.5, fontWeight: 800, fontFamily: F.heading, borderRadius: 6, padding: "2px 6px",
            color: TRACK_COLOR[t.state], border: `1px solid ${TRACK_COLOR[t.state]}55`,
            background: TRACK_COLOR[t.state] + "14",
          }}>{t.stage}</span>
      ))}
    </div>
  );
}

function ItemCard({ item, onFocus }) {
  const v = item.values && item.values.length ? item.values[0] : item.value;
  return (
    <div style={{ ...box, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        <span style={pill(C.goldBright)}>{item.source}</span>
        <span style={{ color: C.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>{item.author}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{fmt(item.ts)}</span>
        {item.engineVerified && <span style={pill("#4caf7d")}>✔ מנוע</span>}
        {item.hasCross && <span style={pill("#3ea6ff")}>הצלבה</span>}
        {item.published && <span style={pill("#b08bd8")}>פורסם</span>}
        {v != null && <b style={{ marginInlineStart: "auto", color: C.goldBright, cursor: "pointer", fontFamily: F.heading }} onClick={() => onFocus && onFocus(v)}>{v}</b>}
      </div>
      <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.5, maxHeight: 60, overflow: "hidden", whiteSpace: "pre-wrap" }}>
        {item.raw ? item.raw.slice(0, 200) : <span style={{ color: C.faint }}>(ללא טקסט)</span>}
      </div>
      <TrackBar item={item} />
      <div style={{ display: "flex", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
        {v != null && <Link to={`/number/${v}`} style={{ ...pill(C.gold), textDecoration: "none" }}>🔍 חקור {v}</Link>}
        {item.link && <Link to={item.link} style={{ ...pill(C.muted), textDecoration: "none" }}>📄 לפוסט</Link>}
      </div>
    </div>
  );
}

export default function WarRoomTab() {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState("now");        // now | treasure
  const [lens, setLens] = useState("writers");    // writers | groups | language | candidates
  const [writer, setWriter] = useState(WRITERS[0]);
  const [groupSel, setGroupSel] = useState(null);
  const [focusN, setFocusN] = useState(null);

  const [incoming, setIncoming] = useState([]);
  const [hot, setHot] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [writerItems, setWriterItems] = useState([]);
  const [groupItems, setGroupItems] = useState([]);
  const [langLinks, setLangLinks] = useState([]);
  const [langStats, setLangStats] = useState({});
  const [busy, setBusy] = useState(false);

  const loadNow = useCallback(async () => {
    setBusy(true);
    const [forum, wa, posts, hn, feed] = await Promise.all([
      getForumMaterial({ limit: 40 }), getWaLog({ limit: 40 }),
      getPostsFromSupabase({ limit: 12 }), getHotNumbers(30, 12), getResearchFeed({ status: "candidate", limit: 60 }),
    ]);
    const merged = [
      ...(forum || []).map(normForum), ...(wa || []).map(normWa), ...((posts?.posts) || []).map(normPost),
    ].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 60);
    setIncoming(merged); setHot(hn || []); setCandidates((feed || []).map(normCandidate));
    setBusy(false);
  }, []);

  const loadWriter = useCallback(async (name) => {
    setBusy(true);
    const [forum, posts, wa] = await Promise.all([
      getForumMaterial({ author: name, limit: 80 }),
      getPostsFromSupabase({ author: name, limit: 40 }),
      getWaLog({ sender: name.split(" ")[0], limit: 40 }),
    ]);
    const items = [...(forum || []).map(normForum), ...((posts?.posts) || []).map(normPost), ...(wa || []).map(normWa)]
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    setWriterItems(items); setBusy(false);
  }, []);

  const loadGroup = useCallback(async (gid) => {
    setBusy(true);
    const wa = await getWaLog({ group: gid, limit: 80 });
    setGroupItems((wa || []).map(normWa)); setBusy(false);
  }, []);

  const loadLanguage = useCallback(async () => {
    setBusy(true);
    const [links, stats] = await Promise.all([getLanguageLinks(200), getLanguageStats()]);
    setLangLinks(links || []); setLangStats(stats || {}); setBusy(false);
  }, []);

  useEffect(() => { if (mode === "now") loadNow(); }, [mode, loadNow]);
  useEffect(() => { if (mode === "treasure") getWaGroups().then(setGroups); }, [mode]);
  useEffect(() => { if (mode === "treasure" && lens === "writers") loadWriter(writer); }, [mode, lens, writer, loadWriter]);
  useEffect(() => { if (mode === "treasure" && lens === "groups" && groupSel) loadGroup(groupSel); }, [mode, lens, groupSel, loadGroup]);
  useEffect(() => { if (mode === "treasure" && lens === "language") loadLanguage(); }, [mode, lens, loadLanguage]);

  if (!isAdmin) return <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>אין לך הרשאת ניהול.</div>;

  const langByRel = useMemo(() => {
    const g = { shared_value: [], translation: [], transliteration: [], other: [] };
    (langLinks || []).forEach(l => (g[l.relationship_type] || g.other).push(l));
    return g;
  }, [langLinks]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
      {/* סרגל-על */}
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 18, fontWeight: 900 }}>🎛️ חדר המפקדה</div>
        <span style={{ color: C.muted, fontSize: 11.5 }}>המנוע מציג — אתה בוחר · שער=החלטה לא ראות</span>
        <div style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}>
          <button style={chip(mode === "now")} onClick={() => setMode("now")}>🔴 עכשיו</button>
          <button style={chip(mode === "treasure")} onClick={() => setMode("treasure")}>🗂️ כל האוצר</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10.5 }}>
        <span style={pill("#e0563a")}>HOT ≠ TRUE</span><span style={pill("#b08bd8")}>VIP ≠ TRUE</span>
        <span style={pill("#e0913a")}>Claim ≠ Fact</span><span style={pill(C.muted)}>Interpretation ≠ Fact</span>
        <span style={{ color: C.faint, fontSize: 11 }}>· 🟢 הושלם · 🟡 חלקי · ⚪ לא-נבדק · 🔴 נעצר</span>
      </div>

      {/* מטטרון — פס תמונת-על */}
      <div style={{ ...box, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>🕸️ מטטרון</span>
        <span style={{ color: C.muted, fontSize: 12 }}>מועמדים ממתינים: <b style={{ color: C.goldLight }}>{candidates.length}</b></span>
        <span style={{ color: C.muted, fontSize: 12 }}>🔥 מתעורר: {(hot || []).slice(0, 8).map(h => <b key={h.n} style={{ color: C.goldLight, cursor: "pointer", marginInlineEnd: 6 }} onClick={() => setFocusN(h.n)}>{h.n}</b>)}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>(חם = אות, לא אמת)</span>
      </div>

      {mode === "now" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)", gap: 14 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>🔴 נכנס עכשיו {busy && "…"}</div>
            {incoming.length ? incoming.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
              : <div style={{ color: C.muted, fontSize: 13 }}>אין חומר טרי כרגע.</div>}
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <RazielPanel focusN={focusN} />
            <div style={box}>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, marginBottom: 8 }}>⚖️ ממתין לשיפוט</div>
              {candidates.slice(0, 8).map(c => (
                <div key={c.key} style={{ borderBottom: `1px solid ${C.border}`, padding: "6px 0", fontSize: 12.5, color: C.goldLight }}>
                  <span style={pill(c.kind === "relation" ? "#3ea6ff" : "#4caf7d")}>{c.kind}</span>{" "}
                  {c.value ? <Link to={`/number/${c.value}`} style={{ color: C.goldBright }}>{c.value}</Link> : ""} · {c.raw.slice(0, 60)}
                </div>
              ))}
              {!candidates.length && <div style={{ color: C.muted, fontSize: 12 }}>אין מועמדים.</div>}
            </div>
          </div>
        </div>
      )}

      {mode === "treasure" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["writers", "👤 כתבים"], ["groups", "📱 קבוצות"], ["language", "🌍 שפות/אנגלית"], ["candidates", "⚖️ מועמדים"]].map(([k, l]) => (
              <button key={k} style={chip(lens === k)} onClick={() => setLens(k)}>{l}</button>
            ))}
          </div>

          {lens === "writers" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {WRITERS.map(w => <button key={w} style={chip(writer === w, "#b08bd8")} onClick={() => setWriter(w)}>{w}</button>)}
              </div>
              <div style={{ color: C.faint, fontSize: 11 }}>👤 {writer} · כל החומר (פורום+פוסטים+WhatsApp) · VIP=עדיפות, לא אמת {busy && "…"}</div>
              {writerItems.length ? writerItems.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>לא נמצא חומר לכתב זה במקורות שנבדקו.</div>}
            </div>
          )}

          {lens === "groups" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {groups.map(g => (
                  <button key={g.group_id} style={chip(groupSel === g.group_id, g.enabled ? "#4caf7d" : "#e0563a")} onClick={() => setGroupSel(g.group_id)}>
                    {g.group_id.replace(/@g\.us$/, "").slice(-6)} {g.enabled ? "🟢" : "🔴 כבוי"}
                  </button>
                ))}
              </div>
              {groups.every(g => !g.enabled) && <div style={pill("#e0563a")}>⚠️ כל הקבוצות כבויות — מקור רדום, לא מזין כרגע</div>}
              {groupItems.length ? groupItems.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>{groupSel ? "אין הודעות לקבוצה זו." : "בחר קבוצה."}</div>}
            </div>
          )}

          {lens === "language" && <LanguageZone byRel={langByRel} stats={langStats} busy={busy} />}

          {lens === "candidates" && (
            <div style={{ display: "grid", gap: 10 }}>
              {candidates.length ? candidates.map(c => <ItemCard key={c.key} item={c} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>אין מועמדים ({busy ? "טוען…" : "רענן במצב עכשיו"}).</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🤖 רזיאל — שכבת-הבנה (לא שופט). משתמש ב-AiAnalyze הקנוני.
function RazielPanel({ focusN }) {
  return (
    <div style={box}>
      <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, marginBottom: 6 }}>🤖 רזיאל · הבנה</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
        {focusN ? `מספר במוקד: ${focusN} — בקש ניתוח כדי לראות תבניות אפשריות.` : "בחר מספר (מהחם/מהכרטיסים) לניתוח."}
      </div>
      {focusN != null && (
        <AiAnalyze kind="research" subject={`מספר ${focusN}`} facts={`ניתוח כיווני-מחקר אפשריים סביב המספר ${focusN} — עובדות-מנוע בלבד, הפרד עובדה מפרשנות.`} label="🤖 3 כיוונים אפשריים" compact />
      )}
      <div style={{ color: C.faint, fontSize: 10.5, marginTop: 8 }}>«אני רואה תבנית מעניינת» — לא «זו אמת».</div>
    </div>
  );
}

// 🌍 שכבת השפות/אנגלית — תצוגה ויזואלית מובחנת (§14.2).
function LanguageZone({ byRel, stats, busy }) {
  const Group = ({ title, col, items }) => (
    <div style={box}>
      <div style={{ color: col, fontFamily: F.heading, fontWeight: 800, marginBottom: 6 }}>{title} · {items.length}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.length ? items.map((l, i) => (
          <span key={i} style={{ fontSize: 12, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 8px" }}>
            {l.hebrew} ↔ {l.foreign_word} <b style={{ color: col }}>{l.gematria_he}</b>{l.human_verified ? " ✔" : ""}
          </span>
        )) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
      </div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: C.faint, fontSize: 11.5 }}>🌍 שכבת-השפות · <b>תרגום ≠ תעתיק ≠ ערך-משותף ≠ משמעות</b> {busy && "…"}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={pill("#4caf7d")}>ערך-משותף {byRel.shared_value.length}</span>
        <span style={pill("#3ea6ff")}>תרגום {byRel.translation.length}</span>
        <span style={pill("#e0913a")}>תעתיק {byRel.transliteration.length}</span>
        <span style={pill(C.muted)}>🔵 תעתיקים-ממתינים (לא-נסקרו): {stats.translitOpen ?? "—"}</span>
        <span style={pill(C.faint)}>כיול-חוצה-שפות (21K · server-only)</span>
        {stats.en && <span style={pill("#3ea6ff")}>אנגלית: מאושר {stats.en.en_approved ?? "—"} · ממתין {stats.en.en_pending ?? "—"}</span>}
      </div>
      <Group title={`${langRelLabel("shared_value")} (Hebrew↔English)`} col="#4caf7d" items={byRel.shared_value} />
      <Group title={langRelLabel("translation")} col="#3ea6ff" items={byRel.translation} />
      <Group title={langRelLabel("transliteration")} col="#e0913a" items={byRel.transliteration} />
      <div style={{ ...box, borderColor: "#e0563a55" }}>
        <div style={{ color: "#e0563a", fontFamily: F.heading, fontWeight: 800, marginBottom: 4 }}>🔴 מחוץ למערכת-השפות</div>
        <div style={{ color: C.muted, fontSize: 12.5 }}>חומר he+en מ-WhatsApp (למשל dream/imagine) מזוהה אך <b>לא-עובר</b> למערכת-השפות · 233 תעתיקים פתוחים · 21K כיול לא-מנוצל. הזדמנות-הרחבה (לא ב-CC-1).</div>
      </div>
    </div>
  );
}
