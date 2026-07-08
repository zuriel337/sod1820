import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe, stripHtml } from "../lib/format.js";
import { thumb } from "../lib/img.js";

// 📡💬 «העדכונים החיים» — פיד חי בעיצוב וואטסאפ אמיתי (אותם צבעים/בועות/זנבות).
// דסקטופ: עמודה קבועה תמיד-פתוחה בצד ימין (מתחת לנאבבר). מובייל: כפתור פותח → גיליון תחתון.
// כתבים (נכנס) = בועה אפורה מימין עם שם-הכתב צבעוני. הבוט «רזיאל» (source='ai') = בועה ירוקה «נשלח» משמאל + ✓✓.
// אור הגאולה עד 20% (מצביע לדף הערוץ). וידאו מתנגן רק בהקשה (Egress).
const CH = {
  "torat-haremez": { name: "תורת הרמז", em: "☀️", c: "#e0902e" },
  "gilui-yomi":    { name: "הגילוי היומי", em: "🏛️", c: "#b79bff" },
  "site-news":     { name: "עדכוני האתר", em: "🆕", c: "#53bdeb" },
  "reality-code":  { name: "קוד המציאות", em: "🎬", c: "#9d7bff" },
  "sod-hachashmal":{ name: "סוד החשמל", em: "⚡", c: "#5ec8e0" },
  "or-geula":      { name: "אור הגאולה", em: "✨", c: "#f0b232", cap: 0.2, to: "/broadcasts" },
};
const CH_KEYS = Object.keys(CH);
const DESKTOP_MQ = "(min-width:900px)";
const isVideo = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");
// מענה-AI: מסומן דרך source או קרדיט הבוט (רזיאל). תיוג-אמת מהאינג'סט: source='ai'.
const isAi = u => u.source === "ai" || /רזיאל|בינה מלאכות|\bai\b/i.test(u.credit || "");

// 👁 תצוגה-מקדימה לשורת-הגלולה (סגנון וואטסאפ): טקסט→הטקסט; תמונה→«📷 תמונה»; סרטון→«🎥 סרטון».
const snip = t => stripHtml(t || "").replace(/\s+/g, " ").trim().slice(0, 40);
function previewOf(u) {
  const cap = (u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו") ? snip(u.text) : "";
  if (u.image_url && isVideo(u.image_url)) return cap ? `🎥 ${cap}` : "🎥 סרטון חדש";
  if (u.image_url) return cap ? `📷 ${cap}` : "📷 תמונה חדשה";
  return cap || "💬 עדכון חדש";
}

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
  const [open, setOpen] = useState(false); // סגור כברירת-מחדל בשני המצבים (מחשב+מובייל) — המשתמש פותח בעצמו
  const [raw, setRaw] = useState([]);
  const [active, setActive] = useState(() => Object.fromEntries(CH_KEYS.map(k => [k, true])));
  const [unseen, setUnseen] = useState(0);
  const [zoom, setZoom] = useState(null);   // תמונה מוגדלת (לייטבוקס)
  const [tick, setTick] = useState(0);       // רוטציה של שורת-העדכון האחרון בגלולה הצפה
  const bodyRef = useRef(null);
  const seenTop = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const on = () => { setIsDesktop(mq.matches); }; // שינוי גודל חלון לא פותח מחדש — נשאר סגור/כפי שהמשתמש השאיר
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const docked = isDesktop && open;

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
        const arr = await Promise.all(CH_KEYS.map(k => getChannelUpdates(12, k, true).then(r => (r || []).map(x => ({ ...x, ch: k })))));
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
  // שורת-העדכון האחרון לגלולה הצפה (מובייל) — מתחלפת בין ה-6 החדשים
  const latest = useMemo(() => items.slice(-6).reverse(), [items]);
  const cur = latest.length ? latest[tick % latest.length] : null;
  useEffect(() => {
    if (open || latest.length < 2) return;
    const id = setInterval(() => { if (!document.hidden) setTick(t => t + 1); }, 4200);
    return () => clearInterval(id);
  }, [open, latest.length]);

  useEffect(() => {
    if (!open) return;
    seenTop.current = Math.max(0, ...raw.map(u => +new Date(u.created_at || 0)));
    setUnseen(0);
    const el = bodyRef.current; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [open, items.length, raw]);

  const dark = P.mode !== "light";
  // 🎨 פלטת וואטסאפ אמיתית — כהה (#0b141a / #202c33) · בהיר (בז' #efeae2 / כותרת ירוקה #008069)
  const WA = dark
    ? { chat: "#0b141a", head: "#202c33", headInk: "#e9edef", headSub: "#8696a0", recv: "#202c33", recvInk: "#e9edef", sent: "#005c4b", sentInk: "#e9edef", time: "#8696a0", chip: "#182229", chipInk: "#8696a0", edge: "rgba(255,255,255,.08)", doodle: "%23ffffff", doodleOp: "0.03" }
    : { chat: "#efeae2", head: "#008069", headInk: "#ffffff", headSub: "rgba(255,255,255,.85)", recv: "#ffffff", recvInk: "#111b21", sent: "#d9fdd3", sentInk: "#111b21", time: "#667781", chip: "#e9e2d6", chipInk: "#3b4a54", edge: "rgba(0,0,0,.1)", doodle: "%236a5f4d", doodleOp: "0.05" };
  const wallpaper = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cg fill='none' stroke='${WA.doodle}' stroke-opacity='${WA.doodleOp}' stroke-width='2'%3E%3Ccircle cx='24' cy='26' r='6'/%3E%3Cpath d='M78 62 l0 18 M69 71 l18 0'/%3E%3Ccircle cx='120' cy='110' r='5'/%3E%3Cpath d='M34 116 q12 -14 24 0'/%3E%3Cpath d='M110 30 l10 6 -10 6z'/%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <>
      <style>{`
        /* פתיחה צפה — גלולה עם אייקון וואטסאפ + «עדכונים» + שורת העדכון האחרון (מתחלף) */
        .lcf-fab{position:fixed;inset-inline-start:14px;bottom:16px;z-index:150;cursor:pointer;border:none;direction:rtl;text-align:start;
          display:inline-flex;align-items:center;gap:10px;border-radius:16px;padding:8px 13px 8px 9px;max-width:min(345px,calc(100vw - 28px));
          background:${dark ? "#1f2c33" : "#ffffff"};color:${dark ? "#e9edef" : "#111b21"};box-shadow:0 8px 26px rgba(0,0,0,${dark ? ".5" : ".22"});border:1px solid ${dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.08)"}}
        .lcf-fab .wic{position:relative;width:36px;height:36px;border-radius:50%;background:#25d366;display:grid;place-items:center;flex:0 0 auto}
        .lcf-fab .wic svg{width:21px;height:21px}
        .lcf-fab .wic::after{content:"";position:absolute;top:-1px;inset-inline-end:-1px;width:9px;height:9px;border-radius:50%;background:#25d366;border:2px solid ${dark ? "#1f2c33" : "#fff"};animation:lcf-dot 1.3s infinite}
        @keyframes lcf-dot{0%,100%{opacity:1}50%{opacity:.4}}
        .lcf-fab .ftxt{display:flex;flex-direction:column;min-width:0;line-height:1.25}
        .lcf-fab .flbl{font-family:${F.heading};font-weight:800;font-size:13px;color:#25d366;display:inline-flex;align-items:center;gap:6px}
        .lcf-fab .flatest{font-family:${F.body};font-size:11.5px;color:${dark ? "#c4cfca" : "#54656f"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px}
        .lcf-fab .ftime{color:${dark ? "#8696a0" : "#8a978d"};font-style:normal}
        @keyframes lcf-swap{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .lcf-fab .badge{background:#c8102e;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:0 6px;min-width:16px;text-align:center}
        .lcf-scrim{position:fixed;inset:0;z-index:159;background:rgba(4,6,10,.55);backdrop-filter:blur(2px);animation:lcf-fade .2s ease}
        @keyframes lcf-fade{from{opacity:0}to{opacity:1}}
        .lcf-panel{position:fixed;z-index:160;inset-block:0;inset-inline-start:0;width:min(400px,100vw);display:flex;flex-direction:column;direction:rtl;
          background:${WA.chat};border-inline-end:1px solid ${WA.edge};box-shadow:14px 0 50px rgba(0,0,0,.5);animation:lcf-slide .28s cubic-bezier(.3,.8,.3,1)}
        @keyframes lcf-slide{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
        .lcf-panel.docked{inset-block-start:64px;inset-block-end:0;width:360px;z-index:90;animation:none}
        body.lcf-docked .rsw-tab{right:360px}
        /* כותרת וואטסאפ */
        .lcf-head{display:flex;align-items:center;gap:10px;padding:9px 13px;background:${WA.head};flex:0 0 auto;box-shadow:0 1px 2px rgba(0,0,0,.25)}
        .lcf-head .ava{width:38px;height:38px;border-radius:50%;background:#25d366;display:grid;place-items:center;flex:0 0 auto;box-shadow:0 0 0 2px rgba(37,211,102,.28)}
        .lcf-head .ava svg{width:22px;height:22px;display:block}
        .lcf-head .nm{font-family:${F.heading};font-weight:700;font-size:15px;color:${WA.headInk};line-height:1.15}
        .lcf-head .st{font-size:11px;color:${WA.headSub};display:flex;align-items:center;gap:5px;margin-top:1px}
        .lcf-head .st i{width:6px;height:6px;border-radius:50%;background:#25d366;display:inline-block;box-shadow:0 0 6px #25d366}
        .lcf-head .x{margin-inline-start:auto;background:none;border:none;color:${WA.headInk};opacity:.85;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:20px}
        .lcf-head .x:hover{opacity:1;background:rgba(255,255,255,.1)}
        /* מסנני-ערוצים (שורת שבבים דקה) */
        .lcf-chips{display:flex;gap:6px;flex-wrap:wrap;padding:7px 10px;background:${WA.head};filter:brightness(.9);flex:0 0 auto}
        .lcf-chip{cursor:pointer;font-family:${F.heading};font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;border:none;background:${WA.chip};color:${WA.chipInk};user-select:none;opacity:.65}
        .lcf-chip[aria-pressed="true"]{opacity:1;color:#fff}
        /* אזור-הצ'אט + טפט דודל של וואטסאפ */
        .lcf-body{flex:1;overflow-y:auto;padding:14px 12px 16px;display:flex;flex-direction:column;gap:2px;
          background-color:${WA.chat};background-image:${wallpaper};scroll-behavior:smooth}
        .lcf-row{display:flex;width:100%;margin-top:6px}
        .lcf-row.recv{justify-content:flex-start}
        .lcf-row.sent{justify-content:flex-end}
        .lcf-b{position:relative;max-width:82%;padding:6px 9px 5px;border-radius:8px;box-shadow:0 1px .5px rgba(0,0,0,.13);animation:lcf-pop .28s ease both}
        @keyframes lcf-pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        .lcf-b.rb{background:${WA.recv};color:${WA.recvInk};border-top-right-radius:0}
        .lcf-b.sb{background:${WA.sent};color:${WA.sentInk};border-top-left-radius:0}
        /* זנבות הבועה (משולש בפינה העליונה) */
        .lcf-b.rb::before{content:"";position:absolute;top:0;right:-7px;border:7px solid transparent;border-top-color:${WA.recv};border-right:0}
        .lcf-b.sb::before{content:"";position:absolute;top:0;left:-7px;border:7px solid transparent;border-top-color:${WA.sent};border-left:0}
        .lcf-snd{font-family:${F.heading};font-size:12px;font-weight:700;margin-bottom:2px;line-height:1.2}
        .lcf-ai{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:800;color:${dark ? "#7fe0c4" : "#027a5f"};margin-bottom:2px}
        .lcf-ai .rb2{width:15px;height:15px;border-radius:5px;background:linear-gradient(135deg,#25d366,#009e78);display:grid;place-items:center;font-size:9px}
        .lcf-tx{font-family:${F.body};font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden}
        .lcf-md{margin-top:5px;display:inline-flex;align-items:center;gap:5px;background:rgba(0,0,0,.16);border-radius:6px;padding:3px 9px;font-size:11px;opacity:.9}
        /* תמונה בבועה — תצוגה מקדימה, הקשה מגדילה */
        .lcf-imgw{display:block;margin:4px 0 3px;padding:0;border:none;background:none;cursor:pointer;width:100%;border-radius:7px;overflow:hidden;position:relative;line-height:0}
        .lcf-imgw img{width:100%;max-height:230px;object-fit:cover;display:block;border-radius:7px}
        .lcf-imgw .lcf-tap{position:absolute;inset-block-end:6px;inset-inline-end:6px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px;backdrop-filter:blur(2px)}
        /* לייטבוקס */
        .lcf-zoom{position:fixed;inset:0;z-index:2000;background:rgba(3,4,8,.94);display:flex;align-items:center;justify-content:center;padding:22px;cursor:zoom-out;animation:lcf-fade .18s ease}
        .lcf-zoom img{max-width:96vw;max-height:92vh;border-radius:10px;box-shadow:0 12px 60px rgba(0,0,0,.6)}
        /* קישור-סיום: כשנגמרים העדכונים → מרכז השידורים */
        .lcf-foot{margin-top:12px;text-align:center;flex:0 0 auto}
        .lcf-foot a{display:inline-flex;align-items:center;gap:6px;font-family:${F.heading};font-weight:800;font-size:12px;text-decoration:none;
          color:${dark ? "#8fe6b6" : "#008069"};background:${dark ? "rgba(37,211,102,.1)" : "rgba(0,128,105,.08)"};border:1px solid ${dark ? "rgba(37,211,102,.28)" : "rgba(0,128,105,.28)"};border-radius:999px;padding:7px 15px}
        .lcf-foot .sub{display:block;font-size:10px;font-weight:600;color:${WA.time};margin-top:5px}
        .lcf-ptr{margin-top:5px;font-size:11.5px;font-weight:800;color:${dark ? "#53bdeb" : "#027eb5"};text-decoration:none;display:inline-block}
        .lcf-meta{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px;font-size:10px;color:${WA.time}}
        .lcf-ck{color:#53bdeb;font-size:11px;letter-spacing:-2px}
        .lcf-empty{margin:auto;text-align:center;font-family:${F.body};font-size:13px;color:${WA.time};background:${dark ? "rgba(0,0,0,.3)" : "rgba(255,255,255,.6)"};padding:8px 14px;border-radius:8px}
        @media (max-width:899.98px){ .lcf-panel{inset-inline:0;inset-block-start:auto;height:82vh;border-radius:14px 14px 0 0;border-inline-end:none;animation:lcf-up .3s cubic-bezier(.3,.8,.3,1)} }
        @keyframes lcf-up{from{transform:translateY(30px);opacity:.4}to{transform:none;opacity:1}}
        @media (prefers-reduced-motion:reduce){.lcf-fab .live,.lcf-b,.lcf-panel{animation:none}}
      `}</style>

      {!open && (
        <button className="lcf-fab" onClick={() => setOpen(true)} aria-label="פתח עדכונים">
          <span className="wic" aria-hidden>
            <svg viewBox="0 0 24 24" fill="#fff"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.728-.977zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          </span>
          <span className="ftxt">
            <span className="flbl">עדכונים{unseen > 0 && <span className="badge">{unseen}</span>}</span>
            <span className="flatest" key={tick} style={{ animation: "lcf-swap .4s ease" }}>
              {cur
                ? <>{cur.credit || CH[cur.ch]?.name} · {previewOf(cur)}<em className="ftime"> · {timeAgoHe(cur.created_at)}</em></>
                : "העדכונים בדרך…"}
            </span>
          </span>
        </button>
      )}

      {open && (
        <>
          {!docked && <div className="lcf-scrim" onClick={() => setOpen(false)} />}
          <aside className={"lcf-panel" + (docked ? " docked" : "")} role={docked ? "complementary" : "dialog"} aria-label="עדכונים חיים">
            <div className="lcf-head">
              <span className="ava" aria-hidden>
                <svg viewBox="0 0 24 24" fill="#fff"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.728-.977zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </span>
              <div><div className="nm">עדכונים מכל הערוצים</div><div className="st"><i />מחובר · עכשיו</div></div>
              <button className="x" onClick={() => setOpen(false)} aria-label={docked ? "מזער" : "סגור"}>{docked ? "–" : "✕"}</button>
            </div>
            <div className="lcf-chips">
              {CH_KEYS.map(k => (
                <button key={k} className="lcf-chip" aria-pressed={active[k]}
                  style={active[k] ? { background: CH[k].c } : undefined}
                  onClick={() => setActive(a => ({ ...a, [k]: !a[k] }))}>{CH[k].em} {CH[k].name}</button>
              ))}
            </div>
            <div className="lcf-body" ref={bodyRef}>
              {items.length === 0 ? <div className="lcf-empty">העדכונים בדרך — הערוצים יתעוררו בקרוב…</div> :
                items.map((u, i) => {
                  const c = CH[u.ch]; const ai = isAi(u);
                  return (
                    <div key={(u.id || i) + "" + u.ch} className={"lcf-row " + (ai ? "sent" : "recv")}>
                      <div className={"lcf-b " + (ai ? "sb" : "rb")}>
                        {ai
                          ? <div className="lcf-ai"><span className="rb2">🤖</span>רזיאל · AI</div>
                          : <div className="lcf-snd" style={{ color: c.c }}>{c.em} {u.credit || c.name}</div>}
                        {u.image_url && !isVideo(u.image_url) && (
                          <button className="lcf-imgw" onClick={() => setZoom(u.image_url)} aria-label="הגדל תמונה">
                            <img src={thumb(u.image_url, 360)} alt="" loading="lazy" />
                            <span className="lcf-tap">🔍 הקש להגדלה</span>
                          </button>
                        )}
                        {u.text && u.text !== "📷 עדכון" && u.text !== "🎬 עדכון וידאו" &&
                          <div className="lcf-tx">{stripHtml(u.text)}</div>}
                        {u.image_url && isVideo(u.image_url) && <div className="lcf-md">🎬 וידאו · הקש לצפייה</div>}
                        {u.capMore && c.to && <Link to={c.to} className="lcf-ptr" onClick={() => { if (!docked) setOpen(false); }}>→ לעוד עדכוני {c.name} · דף הערוץ</Link>}
                        <div className="lcf-meta">{timeAgoHe(u.created_at)}{ai && <span className="lcf-ck">✓✓</span>}</div>
                      </div>
                    </div>
                  );
                })}
              {items.length > 0 && (
                <div className="lcf-foot">
                  <Link to="/broadcasts" onClick={() => { if (!docked) setOpen(false); }}>📡 כל העדכונים · מרכז השידורים ←</Link>
                  <span className="sub">הגעת לסוף — כאן כל הערוצים במלואם</span>
                </div>
              )}
            </div>
            {zoom && (
              <div className="lcf-zoom" onClick={() => setZoom(null)} role="dialog" aria-label="תמונה מוגדלת">
                {/* גרסה מוקטנת בשרת (contain) — לא התמונה המקורית הכבדה */}
                <img src={thumb(zoom, 1200)} alt="" />
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
