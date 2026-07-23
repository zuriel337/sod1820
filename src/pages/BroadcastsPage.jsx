import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates, getRealityHints, getPostsFromSupabase } from "../lib/supabase.js";
import { getForumFeed } from "../lib/contributions.js";
import { hintNums, effDate } from "../lib/reality.js";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import { timeAgoHe, stripHtml } from "../lib/format.js";
import { thumb, galThumb } from "../lib/img.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { BRANDS, isVideoUrl, shareUpdate, UpdateModal } from "../components/BrandTicker.jsx";
import ReporterLink, { ReporterAvatar } from "../components/ReporterLink.jsx";
import ForumFeed from "../components/ForumFeed.jsx";
import SiteUpdatesFeed from "../components/SiteUpdatesFeed.jsx";
import { getSystemCiphers } from "../lib/elsMatrices.js";

// 📡 «מרכז השידורים» — בית אחד, 4 טאבים (עץ אחד). כל טאב = עדשה על מקור-אמת אחד שכבר חי:
//   💬 פורום       — getForumFeed (חידושים · דיונים · תגובות · צפני-גולשים · הודעות גולשים)
//   📢 ערוצים      — channel_updates (שידורי הוואטסאפ, בלי site-news)
//   ✨ פעילות האתר — עדכונים אחרונים (פוסטים) + זרם המציאות (getRealityHints)
//   🛠️ פיתוח האתר  — channel_updates ערוץ site-news (שדרוגים/פיצ׳רים)
// המספר על כל טאב = «חדש מאז ביקורך» (whats_new_law, seenCutoff פר-משתמש). אין טבלה חדשה — רק סינון.
const REAL_CHANNELS = ["gilui-yomi", "torat-haremez", "sod-hachashmal", "reality-code", "or-geula"];
const DEV_CHANNEL = "site-news";
const TABS = [
  { key: "forum", emoji: "💬", title: "פורום", acc: "#4fd6a8", sub: "חידושים · דיונים · תגובות מכל האתר · הודעות גולשים" },
  { key: "channels", emoji: "📢", title: "ערוצים", acc: "#37d67a", sub: "שידורים חיים מכל הערוצים — לייב מקבוצות הוואטסאפ" },
  { key: "activity", emoji: "✨", title: "פעילות האתר", acc: "#e8c84a", sub: "עדכונים אחרונים · תמונות מזרם המציאות" },
  { key: "dev", emoji: "🛠️", title: "פיתוח האתר", acc: "#a78bfa", sub: "שדרוגים ופיצ׳רים חדשים באתר" },
];

const toMs = v => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : 0; };
const isAi = u => u.source === "ai" || /רזיאל|בינה מלאכות|\bai\b/i.test(u.credit || "");
const snip = (s, n = 90) => { const t = String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

// ── ממפה כל פריט-מקור לשורת-אירוע אחידה: {id, ico, acc, title, who, time, href} ──
function forumRow(x) {
  if (x.kind === "cipher") return { id: x.id, ico: "🔠", title: x.title || x.search_term || "צופן", who: x.author_name, time: x.ts, href: `/codes/${encodeURIComponent(x.slug || "")}`, tag: "צופן גולש" };
  if (x.kind === "insight") return { id: x.id, ico: "💡", title: x.title || snip(x.body), who: x.author_name, time: x.ts, href: x.link || "/forum", tag: "חידוש" };
  // contribution (חידוש/דיון/הודעת-גולש)
  return { id: x.id, ico: x.intent === "דיון" ? "🗨️" : "💬", title: x.title || snip(x.body), who: x.author_display || x.author_name, time: x.ts, href: `/forum/${x.contribId}`, tag: x.intent || "חידוש" };
}
// פוסט מ-getPostsFromSupabase (כל הפוסטים, כולל «המערכת»). author ריק → «סוד1820».
function postRow(p) {
  const who = (p.author && String(p.author).trim()) ? String(p.author).trim() : "סוד1820";
  return { id: "p_" + (p.id || p.slug), ico: "📜", title: stripHtml(p.title || "") || "פוסט",
    who, time: p.modified || p.date, href: `/${p.slug || ""}`, image: p.image_url, tag: "עדכון אחרון" };
}
function hintRow(h) {
  const nums = hintNums(h) || [];
  const n = nums[0];
  // 🌊 רמז-מציאות → זרם המציאות (/archive), לא דף-המספר. עם ?q=<מספר> לדיפ-לינק לפריט (תיקון: היה /number).
  return { id: "rh_" + (h.id || Math.random()), ico: "🖼️", title: h.name || (n ? `רמז · ${n}` : "רמז חדש"), who: h.author_name, time: effDate(h) || h.created_at, href: n ? `/archive?q=${n}` : "/archive", image: h.image_url, tag: "זרם המציאות" };
}
// 🔠 צופן-מערכת (admin published) → זרם-הפעילות הקנוני. צפני-קהילה נשארים בפורום.
function sysCipherRow(c) {
  return { id: "sc_" + c.id, ico: "🔠", title: c.title || c.search_term || "צופן", who: c.author_name || "סוד1820",
    time: c.created_at, href: `/codes/${encodeURIComponent(c.slug || c.id)}`, image: c.image_url, tag: "צופן חדש" };
}

export default function BroadcastsPage() {
  const P = usePalette();
  const [params, setParams] = useSearchParams();
  const focusId = params.get("u");
  const initTab = TABS.some(t => t.key === params.get("tab")) ? params.get("tab") : (params.get("c") ? "channels" : "forum");
  const [tab, setTab] = useState(initTab);
  const [data, setData] = useState(null);
  const [chanFilter, setChanFilter] = useState(params.get("c") || "all");
  const [lb, setLb] = useState(null);

  // צילום-קבוע של סף-«הנראה» בכל טאב, לפני שמסמנים — כדי שהמונים יישארו יציבים לאורך הסשן
  const cutoffs = useRef(null);
  if (!cutoffs.current) cutoffs.current = Object.fromEntries(TABS.map(t => [t.key, toMs(seenCutoff("bc-" + t.key))]));

  useEffect(() => {
    applySeo({ title: "מרכז השידורים — כל מה שקורה באתר", description: "בית אחד לכל מה שקורה בסוד 1820: פורום ותגובות, שידורי הערוצים, פעילות האתר וזרם המציאות, ושדרוגי-הפיתוח — הכול במקום אחד, החדשים למעלה.", path: "/broadcasts" });
    track("broadcasts");
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const [forum, hints, postsRes, sysCiphers, chanArrays, dev] = await Promise.all([
        getForumFeed({ limit: 60, includePosts: false }).catch(() => []),   // פורום = קהילה בלבד
        getRealityHints(40).catch(() => []),
        getPostsFromSupabase({ limit: 20, orderBy: "modified" }).then(r => r?.posts || []).catch(() => []),  // כל הפוסטים (כולל מערכת)
        getSystemCiphers(20).catch(() => []),   // 🔠 צפני-מערכת → זרם הפעילות
        Promise.all(REAL_CHANNELS.map(ch => getChannelUpdates(40, ch, true).then(r => (r || []).map(u => ({ ...u, ch }))).catch(() => []))),
        getChannelUpdates(60, DEV_CHANNEL, true).catch(() => []),
      ]);
      if (!live) return;
      setData({ forum: forum || [], hints: hints || [], posts: postsRes || [], sysCiphers: sysCiphers || [], channels: (chanArrays || []).flat(), dev: (dev || []).map(u => ({ ...u, ch: DEV_CHANNEL })) });
    })();
    return () => { live = false; };
  }, []);

  // מסמנים את הטאב הפעיל כ«נראה» (מאפס את המונה שלו לביקור הבא) — לא נוגע בצילום-הקבוע של הסשן
  useEffect(() => { if (data) markSeenKey("bc-" + tab); }, [tab, data]);

  const rows = useMemo(() => {
    if (!data) return { forum: [], activity: [] };
    const forum = data.forum.map(forumRow);   // כבר בלי פוסטים (includePosts:false)
    // פעילות האתר = עדכונים אחרונים (כל הפוסטים) + זרם המציאות + צפני-מערכת חדשים
    const activity = [...(data.posts || []).map(postRow), ...data.hints.map(hintRow), ...(data.sysCiphers || []).map(sysCipherRow)]
      .sort((a, b) => toMs(b.time) - toMs(a.time));
    return { forum, activity };
  }, [data]);

  const counts = useMemo(() => {
    if (!data) return {};
    const nc = (arr, key) => arr.filter(r => toMs(r.time) > cutoffs.current[key]).length;
    return {
      forum: nc(rows.forum, "forum"),
      channels: data.channels.filter(u => toMs(u.created_at) > cutoffs.current.channels).length,
      activity: nc(rows.activity, "activity"),
      dev: data.dev.filter(u => toMs(u.created_at) > cutoffs.current.dev).length,
    };
  }, [data, rows]);

  const goTab = k => { setTab(k); const p = new URLSearchParams(params); p.set("tab", k); p.delete("u"); setParams(p, { replace: true }); };

  const channelItems = useMemo(() => {
    if (!data) return [];
    return data.channels.filter(u => chanFilter === "all" || u.ch === chanFilter);
  }, [data, chanFilter]);
  const chanCounts = useMemo(() => { const m = {}; (data?.channels || []).forEach(u => { m[u.ch] = (m[u.ch] || 0) + 1; }); return m; }, [data]);

  const dark = P.mode !== "light";
  const active = TABS.find(t => t.key === tab) || TABS[0];

  return (
    <div style={{ direction: "rtl", maxWidth: 1180, margin: "0 auto", padding: "30px 15px 90px" }}>
      <style>{`
        .hub-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0 6px}
        .hub-tab{cursor:pointer;display:inline-flex;align-items:center;gap:7px;border:1px solid ${P.border};background:${P.card};
          border-radius:999px;padding:8px 15px;font-family:${F.heading};font-size:13.5px;font-weight:800;color:${P.inkSoft};min-height:40px;transition:transform .1s}
        .hub-tab:hover{transform:translateY(-1px)}
        .hub-tab.on{color:#140d06;border-color:transparent}
        .hub-tab .cnt{border-radius:999px;font-size:11.5px;font-weight:900;padding:1px 8px;font-variant-numeric:tabular-nums;background:${dark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.10)"}}
        .hub-tab.on .cnt{background:rgba(0,0,0,.22);color:#fff}
        .hub-sub{text-align:center;color:${P.inkSoft};font-family:${F.body};font-size:13px;margin:0 0 20px}
        .bc-rows{display:grid;gap:10px;max-width:760px;margin:0 auto}
        .bc-row{display:flex;gap:12px;align-items:flex-start;background:${P.card};border:1px solid ${P.border};
          border-radius:13px;padding:12px 14px;border-inline-start:3px solid var(--acc);text-decoration:none;transition:transform .1s,box-shadow .15s}
        .bc-row:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,${dark ? ".4" : ".12"})}
        .bc-row .ico{font-size:20px;flex:0 0 auto;line-height:1.3}
        .bc-row .thumb{width:52px;height:52px;border-radius:9px;object-fit:cover;flex:0 0 auto;background:#0a0710}
        .bc-row .bd{flex:1;min-width:0}
        .bc-row .ti{color:${P.ink};font-family:${F.heading};font-size:14.5px;font-weight:800;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .bc-row .bodyt{color:${P.inkSoft};font-family:${F.body};font-size:12.5px;line-height:1.6;margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .bc-row .mt{margin-top:5px;display:flex;gap:9px;flex-wrap:wrap;align-items:center;color:${P.inkSoft};font-family:${F.heading};font-size:11px}
        .bc-row .mt .who{color:${P.accentDim};font-weight:800}
        .bc-row .mt .fresh{color:#140d06;background:var(--acc);border-radius:999px;font-weight:900;font-size:10px;padding:1px 8px}
        .bc-row .mt .tg{border:1px solid ${P.border};border-radius:999px;padding:1px 8px;font-size:10px}
        .bc-empty{text-align:center;color:${P.inkSoft};font-family:${F.body};font-style:italic;padding:44px 0}
        .bc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:15px;align-items:start}
        .bc-card{display:flex;flex-direction:column;background:${P.card};border:1px solid ${P.border};border-top:3px solid var(--acc);
          border-radius:15px;overflow:hidden;cursor:pointer;transition:transform .12s,box-shadow .15s;text-align:start}
        .bc-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,${dark ? ".45" : ".14"})}
        .bc-media{position:relative;width:100%;aspect-ratio:16/10;background:#0a0710;overflow:hidden}
        .bc-media img{width:100%;height:100%;object-fit:cover;display:block}
        .bc-vidph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#141018,#0a0710);color:#cbb6ff}
        .bc-vidph .play{font-size:34px}
        .bc-vidph .vlbl{font-family:${F.heading};font-size:11px;font-weight:800;opacity:.8}
        .bc-in{padding:11px 13px 12px;display:flex;flex-direction:column;gap:7px;flex:1}
        .bc-badge{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;font-family:${F.heading};font-size:10.5px;font-weight:800;color:var(--acc);background:color-mix(in srgb,var(--acc) 15%,transparent);border-radius:999px;padding:2px 9px}
        .bc-ai{color:${dark ? "#7fe0c4" : "#027a5f"};background:${dark ? "rgba(37,211,102,.13)" : "rgba(0,128,105,.09)"}}
        .bc-tx{margin:0;color:${P.ink};font-family:${F.body};font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
        .bc-meta{margin-top:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:${P.inkSoft};font-family:${F.heading};font-size:10.5px}
        .bc-share{cursor:pointer;background:none;border:1px solid var(--acc);color:var(--acc);border-radius:999px;font-family:${F.heading};font-size:10px;font-weight:800;padding:2px 10px}
        .bc-link{text-decoration:none;background:var(--acc);color:#191008;font-family:${F.heading};font-size:10px;font-weight:900;border-radius:999px;padding:3px 11px}
        .bc-chip{cursor:pointer;display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 13px;
          font-family:${F.heading};font-size:12px;font-weight:800;min-height:32px;border:1px solid var(--acc);color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent)}
        .bc-chip.on{color:#191008;background:var(--acc)}
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>שידור חי</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(23px,4.4vw,34px)", fontWeight: 800, margin: "6px 0 2px", textShadow: `0 0 40px ${P.glow}` }}>
          📡 מרכז השידורים
        </h1>
      </header>

      {/* טאבים + מונה «חדש מאז ביקורך» */}
      <nav className="hub-tabs">
        {TABS.map(t => (
          <button key={t.key} className={"hub-tab" + (tab === t.key ? " on" : "")}
            style={tab === t.key ? { background: t.acc } : { "--acc": t.acc }} onClick={() => goTab(t.key)}>
            <span>{t.emoji} {t.title}</span>
            {counts[t.key] > 0 && <span className="cnt">{counts[t.key]}</span>}
          </button>
        ))}
      </nav>
      <p className="hub-sub">{active.sub}</p>

      {data === null ? (
        <div className="bc-empty">טוען…</div>
      ) : tab === "channels" ? (
        <ChannelsView P={P} items={channelItems} all={data.channels} chanCounts={chanCounts} filter={chanFilter} setFilter={setChanFilter} focusId={focusId} onOpen={setLb} />
      ) : tab === "forum" ? (
        // 🌳 עץ אחד: אותו פורום ממש כמו /forum — אותו רכיב משותף, לא גרסה מוקטנת
        <ForumFeed maxWidth={760} />
      ) : tab === "dev" ? (
        // 🌳 עץ אחד: אותו «מה חדש באתר» כמו /whats-new — אותו רכיב משותף
        <SiteUpdatesFeed />
      ) : (
        <RowsView rows={rows[tab] || []} acc={active.acc} cutoff={cutoffs.current[tab]} />
      )}

      {lb && <UpdateModal u={lb} brand={BRANDS[lb.ch] || BRANDS["reality-code"]} onClose={() => setLb(null)} />}
    </div>
  );
}

// ── רשימת-אירועים אחידה (פורום · פעילות · פיתוח) ──
function RowsView({ rows, acc, cutoff }) {
  if (!rows.length) return <div className="bc-empty">אין עדיין פריטים כאן — בקרוב.</div>;
  return (
    <div className="bc-rows">
      {rows.map(r => {
        const fresh = toMs(r.time) > cutoff;
        return (
          <Link key={r.id} to={r.href} className="bc-row" style={{ "--acc": acc }}>
            {r.image ? <img className="thumb" src={thumb(r.image, 120)} alt="" loading="lazy" /> : <span className="ico">{r.ico}</span>}
            <div className="bd">
              <div className="ti">{r.title}</div>
              {r.body && <div className="bodyt">{r.body}</div>}
              <div className="mt">
                {fresh && <span className="fresh">חדש</span>}
                {r.who && <span className="who">✍️ {r.who}</span>}
                {r.tag && <span className="tg">{r.tag}</span>}
                {r.time && <span>🕒 {timeAgoHe(r.time)}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── גריד-הערוצים (כמו שהיה — מדיה + שיתוף + מודל), עם מסנן ערוץ-ערוץ ──
function ChannelsView({ P, items, all, chanCounts, filter, setFilter, focusId, onOpen }) {
  return (
    <>
      <nav style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <button className={"bc-chip" + (filter === "all" ? " on" : "")} style={{ "--acc": P.accentText }} onClick={() => setFilter("all")}>📡 הכל · {all.length}</button>
        {REAL_CHANNELS.map(ch => {
          const b = BRANDS[ch]; if (!b) return null;
          return (
            <button key={ch} className={"bc-chip" + (filter === ch ? " on" : "")} style={{ "--acc": b.accent }} onClick={() => setFilter(ch)}>
              {b.logo ? <img src={b.logo} alt="" style={{ width: 15, height: 15, borderRadius: "50%", display: "block" }} /> : <span>{b.emoji}</span>}
              {b.title}{chanCounts[ch] ? ` · ${chanCounts[ch]}` : ""}
            </button>
          );
        })}
      </nav>
      {items.length === 0 ? (
        <div className="bc-empty">אין עדכונים פעילים כרגע — בקרוב.</div>
      ) : (
        <div className="bc-grid">
          {items.map(u => {
            const b = BRANDS[u.ch] || BRANDS["reality-code"];
            const ai = isAi(u);
            const vid = u.image_url && isVideoUrl(u.image_url);
            const focused = focusId && u.id === focusId;
            const showTxt = u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו";
            return (
              <div key={u.id} className="bc-card" style={{ "--acc": b.accent, boxShadow: focused ? `0 0 26px ${b.accent}` : undefined }}
                ref={focused ? el => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300); } : undefined}
                onClick={() => onOpen(u)} title="לחצו לפתיחה במסך מלא">
                {u.image_url && (
                  <div className="bc-media">
                    {vid ? <div className="bc-vidph"><span className="play">▶</span><span className="vlbl">וידאו · הקש לצפייה</span></div>
                      : <img src={galThumb(u, 420)} alt="" loading="lazy" />}
                  </div>
                )}
                <div className="bc-in">
                  <span className="bc-badge">{b.emoji} {b.title}</span>
                  {ai && <span className="bc-badge bc-ai" style={{ "--acc": "#25d366" }}>🤖 רזיאל · AI</span>}
                  {showTxt && <p className="bc-tx">{u.text}</p>}
                  <div className="bc-meta">
                    <ReporterAvatar credit={u.credit} size={20} ring={b.accent} fallback={b.logo} />
                    <span>{u.credit ? <>✍️ <ReporterLink credit={u.credit} canonical style={{ color: b.accent, textDecoration: "underline", textUnderlineOffset: 2, fontWeight: 800 }}>{u.credit}</ReporterLink> · </> : ""}🕒 {timeAgoHe(u.created_at)}</span>
                    <button className="bc-share" onClick={e => { e.stopPropagation(); shareUpdate(u, b.title); }}>↗ שתפו</button>
                    {u.link_url && <Link to={u.link_url} className="bc-link" onClick={e => e.stopPropagation()}>📖 לפוסט ←</Link>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
