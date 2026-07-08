import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe, stripHtml } from "../lib/format.js";

// 📡💬 «העדכונים החיים» — פיד חי בסגנון וואטסאפ, הודעה אחרי הודעה, מהערוצים שנבחרו.
// דסקטופ: עמודה קבועה תמיד-פתוחה בצד ימין (מתחת לנאבבר). מובייל: כפתור פותח → גיליון תחתון.
// מחליף את הטיקר-העליון + מגירת-המספר בדף הבית ובצ'אט.
// כללי רוטציה (בקשת צוריאל): תורת הרמז + הגילוי היומי בתדירות · אור הגאולה עד 20% (מצביע לדף הערוץ) ·
// עדכוני אתר בפנים · מענה-AI מסומן בבירור (בועה כחולה «🤖 AI»). וידאו מתנגן רק בהקשה (Egress).
const CH = {
  "torat-haremez": { name: "תורת הרמז", em: "☀️", c: "#e0902e" },
  "gilui-yomi":    { name: "הגילוי היומי", em: "🏛️", c: "#b79bff" },
  "site-news":     { name: "עדכוני האתר", em: "🆕", c: "#d9b24a" },
  "reality-code":  { name: "קוד המציאות", em: "🎬", c: "#9d7bff" },
  "or-geula":      { name: "אור הגאולה", em: "✨", c: "#e0a92e", cap: 0.2, to: "/broadcasts" },
};
const CH_KEYS = Object.keys(CH);
const DESKTOP_MQ = "(min-width:900px)";
const isVideo = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");
// מענה-AI: מסומן דרך source או קרדיט הבוט (רזיאל). לתיוג עתידי — source='ai' / credit='רזיאל · AI'.
const isAi = u => u.source === "ai" || /רזיאל|בינה מלאכות|\bai\b/i.test(u.credit || "");

// מגביל ערוץ לאחוז מקסימלי מהרשימה (אור הגאולה ≤20%) — משאיר את החדשים, מסמן שיש עוד בדף הערוץ.
function applyCaps(list) {
  let out = [...list];
  for (const k of CH_KEYS) {
    const cap = CH[k].cap; if (!cap) continue;
    const others = out.filter(x => x.ch !== k).length;
    const maxK = Math.max(1, Math.floor((others * cap) / (1 - cap)));
    const kept = out.filter(x => x.ch === k).slice(0, maxK).map((x, i) => ({ ...x, capMore: i === maxK - 1 }));
    out = [...out.filter(x => x.ch !== k), ...kept];
  }
  return out.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); // עולה (וואטסאפ: חדש למטה)
}

export default function LiveChannelFeed() {
  const P = usePalette();
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches);
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches);
  const [raw, setRaw] = useState([]);
  const [active, setActive] = useState(() => Object.fromEntries(CH_KEYS.map(k => [k, true])));
  const [unseen, setUnseen] = useState(0);
  const bodyRef = useRef(null);
  const seenTop = useRef(0);

  // מעקב אחרי רוחב המסך: דסקטופ → עמודה קבועה פתוחה; מובייל → כפתור פותח
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const on = () => { setIsDesktop(mq.matches); setOpen(mq.matches); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const docked = isDesktop && open; // דסקטופ פתוח = עמודה מעוגנת (בלי scrim)

  // בדסקטופ-מעוגן — מפנים מקום בצד ימין כדי שלא יכסה תוכן; מזיזים לשוניות-קצה גלובליות (שיתוף) שמאלה מהעמודה
  useEffect(() => {
    try {
      document.body.style.paddingInlineStart = docked ? "372px" : "";
      document.body.classList.toggle("lcf-docked", docked);
    } catch { /* ignore */ }
    return () => { try { document.body.style.paddingInlineStart = ""; document.body.classList.remove("lcf-docked"); } catch { /* ignore */ } };
  }, [docked]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const arr = await Promise.all(CH_KEYS.map(k => getChannelUpdates(12, k).then(r => (r || []).map(x => ({ ...x, ch: k })))));
        if (!live) return;
        const all = arr.flat().filter(u => u.text || u.image_url);
        const newestTs = Math.max(0, ...all.map(u => +new Date(u.created_at || 0)));
        setUnseen(u => (seenTop.current && newestTs > seenTop.current ? u + 1 : u));
        setRaw(all);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 90000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const items = useMemo(() => applyCaps(raw.filter(u => active[u.ch])).slice(-60), [raw, active]);

  // בפתיחה — גלילה לתחתית (החדש) + איפוס מונה-החדשים
  useEffect(() => {
    if (!open) return;
    seenTop.current = Math.max(0, ...raw.map(u => +new Date(u.created_at || 0)));
    setUnseen(0);
    const el = bodyRef.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [open, items.length, raw]);

  const dark = P.mode !== "light";
  return (
    <>
      <style>{`
        .lcf-fab{position:fixed;inset-inline-start:16px;bottom:18px;z-index:150;cursor:pointer;border:none;
          display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:11px 17px;
          background:linear-gradient(135deg,#25d366,#1aa851);color:#04170c;font-family:${F.heading};font-weight:800;font-size:14px;
          box-shadow:0 8px 26px rgba(37,211,102,.45)}
        .lcf-fab .live{width:7px;height:7px;border-radius:50%;background:#04170c;animation:lcf-dot 1.2s infinite}
        @keyframes lcf-dot{0%,100%{opacity:1}50%{opacity:.35}}
        .lcf-fab .badge{background:#c8102e;color:#fff;border-radius:999px;font-size:11px;font-weight:800;padding:0 6px;min-width:17px;text-align:center}
        .lcf-scrim{position:fixed;inset:0;z-index:159;background:rgba(4,6,10,.55);backdrop-filter:blur(2px);animation:lcf-fade .2s ease}
        @keyframes lcf-fade{from{opacity:0}to{opacity:1}}
        .lcf-panel{position:fixed;z-index:160;inset-block:0;inset-inline-start:0;width:min(400px,100vw);display:flex;flex-direction:column;
          background:${dark ? "#0d1512" : "#e9ede9"};border-inline-end:1px solid rgba(37,211,102,.3);box-shadow:14px 0 50px rgba(0,0,0,.5);animation:lcf-slide .28s cubic-bezier(.3,.8,.3,1)}
        @keyframes lcf-slide{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
        /* דסקטופ — עמודה מעוגנת קבועה בצד ימין, מתחת לנאבבר (64px), מתחת לתפריטי-הנאב (z 100/200) */
        .lcf-panel.docked{inset-block-start:64px;inset-block-end:0;width:360px;z-index:90;animation:none;border-top:1px solid rgba(37,211,102,.22)}
        /* לשוניית-הקצה הגלובלית «שתפו» עוברת אל מול העמודה, לא מעליה */
        body.lcf-docked .rsw-tab{right:360px}
        .lcf-head{display:flex;align-items:center;gap:9px;padding:11px 13px;background:#12312a;flex:0 0 auto}
        .lcf-head .ava{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e8c15a,#b98f2e);display:grid;place-items:center;font-size:17px}
        .lcf-head .nm{font-family:${F.heading};font-weight:800;font-size:14px;color:#fff}
        .lcf-head .st{font-size:10.5px;color:#8fe6b6}.lcf-head .st i{width:6px;height:6px;border-radius:50%;background:#25d366;display:inline-block;margin-inline-start:5px;box-shadow:0 0 7px #25d366}
        .lcf-head .x{margin-inline-start:auto;background:none;border:1px solid rgba(255,255,255,.25);color:#cfe;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:17px}
        .lcf-chips{display:flex;gap:5px;flex-wrap:wrap;padding:8px 10px;background:${dark ? "#101613" : "#dfe5df"};flex:0 0 auto;border-bottom:1px solid rgba(0,0,0,.15)}
        .lcf-chip{cursor:pointer;font-family:${F.heading};font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);color:${dark ? "#a9b8ae" : "#33413a"};background:transparent;user-select:none}
        .lcf-chip[aria-pressed="true"]{color:#0c130f}
        .lcf-body{flex:1;overflow-y:auto;padding:12px 11px;background:repeating-linear-gradient(0deg,transparent 0 22px,${dark ? "rgba(255,255,255,.012)" : "rgba(0,0,0,.015)"} 22px 23px),${dark ? "#0d1512" : "#e9ede9"};scroll-behavior:smooth}
        .lcf-msg{max-width:92%;margin:0 0 9px;padding:8px 11px 6px;border-radius:12px;border-top-right-radius:3px;background:${dark ? "#1f2c25" : "#fff"};box-shadow:0 1px 2px rgba(0,0,0,.18);animation:lcf-pop .3s ease both}
        @keyframes lcf-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .lcf-msg .snd{font-family:${F.heading};font-size:11px;font-weight:800;color:var(--sc);margin-bottom:3px;display:flex;align-items:center;gap:5px}
        .lcf-msg .tx{font-family:${F.body};font-size:13px;line-height:1.5;color:${dark ? "#e9f0ea" : "#1b241f"};white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
        .lcf-msg .md{margin-top:5px;display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,.22);border-radius:7px;padding:3px 9px;font-size:11px;color:${dark ? "#a9b8ae" : "#4a5a50"}}
        .lcf-msg .tm{font-size:9px;color:${dark ? "#5d6b62" : "#8a978d"};direction:ltr;text-align:start;margin-top:3px}
        .lcf-msg .ptr{margin-top:5px;font-size:11px;font-weight:800;color:var(--sc);text-decoration:none;display:inline-block}
        .lcf-msg.ai{background:${dark ? "linear-gradient(180deg,#122436,#0f1d2c)" : "#eaf4ff"};border:1px solid rgba(62,166,255,.4)}
        .lcf-ai{display:inline-flex;align-items:center;gap:4px;background:rgba(62,166,255,.16);border:1px solid rgba(62,166,255,.5);color:#3ea6ff;border-radius:999px;padding:1px 7px;font-size:9px;font-weight:800}
        .lcf-ai .rb{width:13px;height:13px;border-radius:4px;background:linear-gradient(135deg,#3ea6ff,#1e6fd0);display:grid;place-items:center;font-size:8px}
        .lcf-empty{color:${dark ? "#7d8c82" : "#5a6b60"};text-align:center;font-family:${F.body};padding:24px 12px;font-size:13px}
        @media (max-width:899.98px){ .lcf-panel{inset-inline:0;inset-block-start:auto;height:82vh;border-radius:16px 16px 0 0;border-inline-end:none;border-top:1px solid rgba(37,211,102,.3);animation:lcf-up .3s cubic-bezier(.3,.8,.3,1)} }
        @keyframes lcf-up{from{transform:translateY(30px);opacity:.4}to{transform:none;opacity:1}}
        @media (prefers-reduced-motion:reduce){.lcf-fab .live,.lcf-msg,.lcf-panel{animation:none}}
      `}</style>

      {!open && (
        <button className="lcf-fab" onClick={() => setOpen(true)} aria-label="פתח עדכונים חיים">
          <span className="live" aria-hidden />📡 עדכונים חיים{unseen > 0 && <span className="badge">{unseen}</span>}
        </button>
      )}

      {open && (
        <>
          {!docked && <div className="lcf-scrim" onClick={() => setOpen(false)} />}
          <aside className={"lcf-panel" + (docked ? " docked" : "")} role={docked ? "complementary" : "dialog"} aria-label="עדכונים חיים">
            <div className="lcf-head">
              <span className="ava">📡</span>
              <div><div className="nm">עדכונים חיים · סוד1820</div><div className="st">מחובר<i /></div></div>
              <button className="x" onClick={() => setOpen(false)} aria-label={docked ? "מזער" : "סגור"}>{docked ? "–" : "✕"}</button>
            </div>
            <div className="lcf-chips">
              {CH_KEYS.map(k => (
                <button key={k} className="lcf-chip" aria-pressed={active[k]}
                  style={active[k] ? { background: CH[k].c, borderColor: "transparent" } : { opacity: .5 }}
                  onClick={() => setActive(a => ({ ...a, [k]: !a[k] }))}>{CH[k].em} {CH[k].name}</button>
              ))}
            </div>
            <div className="lcf-body" ref={bodyRef}>
              {items.length === 0 ? <div className="lcf-empty">העדכונים בדרך — הערוצים יתעוררו בקרוב…</div> :
                items.map((u, i) => {
                  const c = CH[u.ch]; const ai = isAi(u);
                  return (
                    <div key={(u.id || i) + "" + u.ch} className={"lcf-msg" + (ai ? " ai" : "")} style={{ "--sc": ai ? "#3ea6ff" : c.c }}>
                      <div className="snd">
                        {ai ? <span className="lcf-ai"><span className="rb">🤖</span>AI עונה · רזיאל</span>
                          : <><span aria-hidden>{c.em}</span>{c.name}{u.credit ? " · " + u.credit : ""}</>}
                      </div>
                      <div className="tx">{stripHtml(u.text || (u.image_url ? (isVideo(u.image_url) ? "🎬 עדכון וידאו" : "📷 עדכון") : ""))}</div>
                      {u.image_url && <div className="md">{isVideo(u.image_url) ? "🎬 וידאו" : "📷 תמונה"} · הקש לצפייה</div>}
                      {u.capMore && c.to && <Link to={c.to} className="ptr" onClick={() => { if (!docked) setOpen(false); }}>→ לעוד עדכוני {c.name} · דף הערוץ</Link>}
                      <div className="tm">{timeAgoHe(u.created_at)}</div>
                    </div>
                  );
                })}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
