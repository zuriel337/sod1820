import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPhraseValueFamilies, getValuePhraseList, getRandomStartPhrase, logView, zeroScales, getJourneyMessage, subscribeEmail, logJourneySave } from "../lib/supabase.js";
import { visitorId } from "../lib/feedback.js";
import { shareJourney as shareJourneyCard } from "../lib/numberCard.js";
import { track, trackAi } from "../lib/tracking.js";
import { emit } from "../lib/events.js"; // M3: מדידת משפך-המסע לרמת-אדם (surface=journey), additive לצד logView הישן
import { enablePush, PUSH_CONFIGURED, pushPermission } from "../lib/push.js"; // M2: הוק פוש-קודם
import { stitchPush } from "../lib/identity.js"; // M2: קישור מנוי-פוש לזהות-אדם
import { trackSubscribe } from "../lib/marketing.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { clamp, isNumeric, dominantWorld } from "../lib/journey.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { entityFromNumber } from "../lib/research/entity.js";

// ===== «מסע ההתכנסות» — טיול בתוך הערך (value-as-trunk) =====
// המסע מטייל בין ביטויים ששווים לאותו ערך גימטרי (משפחת-הערך מ-bidim). ערך-היעד נסתר עד השיא,
// ואז נחשף: "לא טיילת בין מילים — טיילת בתוך הערך 596". כשמשפחת-הערך נגמרת, המסע אינו נעצר מיד —
// הוא «קופץ» לסקאלת-אפס עשירה (zero_scale_law: 560→5600) וממשיך. הערך מהדהד כלפי מעלה. רק כשגם
// משפחת-התהודה נגמרת — נעצר ביושר. אין קפיצות מומצאות.

const LINES = [
  "ומה עוד נפגש כאן —",
  "החוט ממשיך אל",
  "ומשם נפתח שביל אל",
  "הערך לוחש לך גם על",
  "תחנה הבאה במסע —",
  "ומכאן אל",
];

// 🤖 «מסר מהמנוע» (בטא) — הודעה שנגזרת מנתוני המסע עצמם (לא טקסט קבוע). בעתיד תהפוך ל-AI מותאם.
function engineMessage({ root, bases = [], stations = 0, dWorld }) {
  const out = [];
  if (stations > 0) out.push(`ראיתי אותך עובר ${stations} תחנות — וכולן, ללא יוצא מן הכלל, נפלו על ${root}.`);
  if (bases.length > 1) out.push(`והערך לא נעצר: הוא המשיך להדהד בסדרי גודל — ${bases.join(" → ")}. מה שראית קטן ממה שיש מתחת.`);
  if (dWorld) out.push(`השדה ששב וחזר אליך הוא «${dWorld}» — שם נמצא הלב של המסע שלך.`);
  if (KEY_NUMBERS[root]) out.push(`וזכור: ${root} הוא ${KEY_NUMBERS[root]}.`);
  out.push("זה רק קצה הקצה. בגרסה הבאה אדבר אליך אישית — לפי בדיוק מה שחיפשת.");
  return out;
}

// 🔮 ריבוע פיתוחים עתידיים — מה שבדרך (כולל גרסה 2 של המסע)
const FUTURE = [
  { icon: "🧭", title: "מסע מודרך לפי שדה/עולם", note: "לבחור נושא — והמנוע בונה מסע סביבו" },
  { icon: "🎴", title: "כרטיס-מסע מעוצב לשיתוף", note: "תמונה שמספרת את כל המסע במבט אחד" },
];

export default function JourneyPage() {
  const P = usePalette();
  const { addJourney, saveItem } = useResearch();
  const { verified } = useAuth();   // מחובר/מאומת → כבר ברשימה, מדלג על שער-המייל
  const [sp] = useSearchParams();
  const startFrom = (sp.get("from") || "").trim();
  const [target, setTarget] = useState(null);     // ערך-היעד הנסתר (הסקאלה הפעילה)
  const [bases, setBases] = useState([]);          // [value, value*10, ...] — סקאלות שהמסע עבר (שורש→תהודה)
  const [family, setFamily] = useState([]);        // [{phrase, world}] — כל הביטויים = target
  const [path, setPath] = useState([]);            // [{phrase, world} | {leap:true, phrase}] — התחנות שעברנו
  const [goal, setGoal] = useState(5);             // תחנות להתכנסות מלאה
  const [finished, setFinished] = useState(null);  // null | "complete" | "stopped"
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiMsg, setAiMsg] = useState(null);        // מסר אישי מהמנוע (AI) — null עד שלוחצים
  const [aiState, setAiState] = useState("idle");  // idle | busy | done | off (לא פעיל/נכשל)
  const [unlocked, setUnlocked] = useState(false); // 🔓 האם מסר-העומק נפתח (בזכות שיתוף)
  const [deepMsg, setDeepMsg] = useState(null);    // מסר-העומק (שכבה שנייה) — נפתח בשיתוף
  const [deepState, setDeepState] = useState("idle"); // idle | busy | done | off
  const [shareBusy, setShareBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false); // 🔖 משוב «נשמר»
  // ✉️ שער-מייל למסר-העומק: השכבה השנייה נפתחת תמורת הרשמה לרשימה (lead magnet).
  const [email, setEmail] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateErr, setGateErr] = useState("");
  const [emailGiven, setEmailGiven] = useState(() => { try { return localStorage.getItem("sod_jdeep_email") === "1"; } catch { return false; } });
  const [declinedDeep, setDeclinedDeep] = useState(false); // «לא עכשיו» → שקט על המסך הזה (בלי להציק שוב)
  const journeyIdRef = useRef(null);  // מזהה מופע-מסע — לתפירת המשפך לרמת-אדם
  const hookShownRef = useRef(false); // שההוק ייספר פעם אחת למסע
  const [hookBusy, setHookBusy] = useState(false); // M2: לחיצת-פוש בעבודה
  const [showEmail, setShowEmail] = useState(false); // M2: מייל = אופציה מודחקת (רגע 3)

  useEffect(() => { document.title = "מסע ההתכנסות · סוד 1820"; try { emit("journey", "landing"); } catch { /* noop */ } }, []);

  // מאתחל מסע: בוחר ערך-יעד נסתר (משפחה עשירה) וטוען את משפחת-הערך לטייל בה.
  async function begin(fromParam) {
    journeyIdRef.current = (crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
    hookShownRef.current = false;
    setLoading(true); setFinished(null); setPath([]); setTarget(null); setFamily([]); setBases([]);
    setAiMsg(null); setAiState("idle");
    setUnlocked(false); setDeepMsg(null); setDeepState("idle");
    let value = null, startPhrase = null;
    if (isNumeric(fromParam)) {
      value = parseInt(fromParam, 10);
    } else {
      startPhrase = fromParam || await getRandomStartPhrase() || "ירושלים";
      const fams = await getPhraseValueFamilies(startPhrase);
      value = (fams.find(f => f.size >= 3) || fams[0])?.value ?? null;
    }
    if (value == null) { setFinished("stopped"); setLoading(false); return; }
    const fam = await getValuePhraseList(value);
    if (!fam.length) { setTarget(value); setFinished("stopped"); setLoading(false); return; }
    // תחנת הפתיחה: הביטוי שהמשתמש בא ממנו (אם במשפחה) או הראשון במשפחה.
    const startIdx = startPhrase ? fam.findIndex(f => f.phrase === startPhrase) : -1;
    const start = startIdx >= 0 ? fam[startIdx] : fam[0];
    setTarget(value);
    setBases([value]);
    setFamily(fam);
    setGoal(clamp(fam.length, 3, 7));
    setPath([start]);
    setLoading(false);
    logView("journey_start", String(value));   // 📊 פאנל: התחלת מסע
    try { emit("journey", "start", { journeyId: journeyIdRef.current, props: { value } }); } catch { /* noop */ }
  }

  useEffect(() => { begin(startFrom); }, [startFrom]); // eslint-disable-line

  // 🔢 קפיצת-תהודה — כשמשפחת-הערך נגמרת, מחפש סקאלת-אפס עשירה בביטויים חדשים (zero_scale_law).
  async function tryLeap(seen) {
    if (bases.length >= 3) return null;            // עד 2 קפיצות — לא רץ לאינסוף
    let best = null;
    for (const s of zeroScales(target)) {
      if (bases.includes(s.v)) continue;           // לא חוזרים לסקאלה שכבר היינו בה
      const fam = await getValuePhraseList(s.v).catch(() => []);
      const fresh = fam.filter(f => !seen.has(f.phrase));
      if (fresh.length >= 2 && (!best || fresh.length > best.fresh.length)) best = { v: s.v, fam, fresh };
    }
    if (!best) return null;
    return { value: best.v, fam: best.fam, first: best.fresh[Math.floor(Math.random() * best.fresh.length)] };
  }

  async function step() {
    if (finished || busy || !family.length) return;
    const seen = new Set(path.filter(p => !p.leap).map(p => p.phrase));
    const pool = family.filter(f => !seen.has(f.phrase));
    if (!pool.length) {
      // משפחת-הערך נגמרה → לפני עצירה, ננסה לקפוץ לסקאלת-אפס (הערך מהדהד כלפי מעלה)
      setBusy(true);
      const leap = await tryLeap(seen);
      setBusy(false);
      if (leap) {
        setBases(b => [...b, leap.value]);
        setTarget(leap.value);
        setFamily(leap.fam);
        setGoal(g => g + clamp(leap.fam.length, 2, 4));
        setPath(p => [...p, { leap: true, phrase: `⚡ הערך מהדהד · ${target} → ${leap.value}` }, leap.first]);
        logView("journey_leap", `${target}->${leap.value}`);  // 📊 פאנל: קפיצת-תהודה
        return;
      }
      setFinished("stopped");
      logView("journey_stall", String(target));            // 📊 פאנל: נעצר (גם התהודה נגמרה)
      logView("journey_target_revealed", String(bases[0])); // 📊 פאנל: הערך נחשף
      try { emit("journey", "stalled", { journeyId: journeyIdRef.current, depth: path.filter(p => !p.leap).length, props: { root: bases[0] } }); } catch { /* noop */ }
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    const np = [...path, next];
    setPath(np);
    const _depth = np.filter(p => !p.leap).length;
    logView("journey_step", String(_depth));  // 📊 עומק-צעד — למדד-הנטישה (איפה עוזבים)
    try { emit("journey", "step", { journeyId: journeyIdRef.current, depth: _depth }); } catch { /* noop */ }
    if (_depth >= goal) {
      setFinished("complete");
      logView("journey_complete", String(bases[0]));         // 📊 פאנל: השלמת מסע (100%)
      logView("journey_target_revealed", String(bases[0]));  // 📊 פאנל: הערך נחשף
      try { emit("journey", "complete", { journeyId: journeyIdRef.current, depth: _depth, props: { root: bases[0] } }); } catch { /* noop */ }
    }
  }

  function restart() { begin(""); }

  const root = bases[0] ?? target;                 // הערך-שורש שאליו התכנס המסע (לפני קפיצות)
  const leaped = bases.length > 1;

  // 🤖 מסר אישי מהמנוע — אוטומטי כשמגיעים למסך הגילוי. **נצבר (cache) לפי מספר** →
  // אותו מספר לא קורא ל-AI פעמיים (חוסך קרדיט; המסר נשמר במכשיר).
  async function fetchAiMessage() {
    if (aiState === "busy" || root == null) return;
    const ck = "sod_jmsg_" + root;
    try { const c = localStorage.getItem(ck); if (c) { setAiMsg(c); setAiState("done"); try { emit("journey", "ai_result", { journeyId: journeyIdRef.current, depth: path.filter(s => !s.leap).length, props: { root, cached: true } }); } catch { /* noop */ } return; } } catch { /* noop */ }
    setAiState("busy");
    logView("journey_ai_message", String(root));   // 📊 פאנל: מסר אישי נוצר
    trackAi("journey_msg", "journey");              // 📊 שימוש ב-AI — מסר-מסע (ראשון)
    const msg = await getJourneyMessage({
      value: root,
      path: path.filter(s => !s.leap).map(s => s.phrase),
      world: dWorld || null,
      meaning: KEY_NUMBERS[root] || null,
    });
    if (msg) { setAiMsg(msg); setAiState("done"); try { localStorage.setItem(ck, msg); } catch { /* noop */ } try { emit("journey", "ai_result", { journeyId: journeyIdRef.current, depth: path.filter(s => !s.leap).length, props: { root } }); } catch { /* noop */ } }
    else { setAiState("off"); }   // אין מפתח/שגיאה → נשארת הודעת-התבנית
  }

  // ▶️ מסר אוטומטי — ברגע שמגיעים למסך הגילוי (finished) ויש מספר-שורש.
  useEffect(() => {
    if (finished && root != null && aiState === "idle") fetchAiMessage();
  }, [finished, root]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🧭 «המסעות שלי» — רושם את המסע כשמסתיים (ומעדכן עם המסר כשהוא מגיע).
  useEffect(() => {
    if (finished && root != null) {
      addJourney({ root, path: path.filter(s => !s.leap).map(s => s.phrase), world: dWorld || null, msg: aiMsg });
    }
  }, [finished, root, aiMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔓 אם המספר כבר נפתח בעבר (שיתוף קודם) — משחזרים את מסר-העומק בלי לבקש שיתוף שוב.
  useEffect(() => {
    if (!finished || root == null) return;
    try {
      if (localStorage.getItem("sod_jdeep_" + root) === "1") { setUnlocked(true); if (deepState === "idle") fetchDeepMessage(); }
    } catch { /* noop */ }
  }, [finished, root]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📊 hook_shown — כרטיס-הלכידה שמופיע אחרי הפלט הראשון (פעם אחת למסע)
  useEffect(() => {
    if (finished && aiState === "done" && !unlocked && !declinedDeep && root != null && !hookShownRef.current) {
      hookShownRef.current = true;
      try { emit("journey", "hook_shown", { journeyId: journeyIdRef.current, props: { root, gated: !(verified || emailGiven) } }); } catch { /* noop */ }
    }
  }, [finished, aiState, unlocked, declinedDeep, root]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔓 מסר-העומק — נפתח *רק אחרי* שהמשתמש קיבל את המסר הראשון ואז שיתף. נשמר פתוח לפי מספר.
  // force=true → מתעלם מה-cache ומבקש מהמנוע מסר *נוסף* (בקשת צוריאל: אפשר לפתוח AI פעמיים אם רוצים).
  async function fetchDeepMessage(force = false) {
    if (root == null) return;
    if (deepState === "busy") return;
    const ck = "sod_jmsgdeep_" + root;
    if (!force) {
      try { const c = localStorage.getItem(ck); if (c) { setDeepMsg(c); setDeepState("done"); return; } } catch { /* noop */ }
    }
    setDeepState("busy");
    trackAi("journey_deep", "journey");   // 📊 שימוש ב-AI — מסר-עומק (מסע)
    const msg = await getJourneyMessage({
      value: root,
      path: path.filter(s => !s.leap).map(s => s.phrase),
      world: dWorld || null,
      meaning: KEY_NUMBERS[root] || null,
      depth: "deep",
      again: force || undefined,   // רמז למנוע: מסר נוסף/שונה
    });
    if (msg) { setDeepMsg(msg); setDeepState("done"); try { localStorage.setItem(ck, msg); } catch { /* noop */ } }
    else setDeepState("off");
  }

  // ✨ שיתוף ממותג (כפתור «שתפו את המסע») — משתף + מתעד. לא-חוסם.
  async function shareJourney() {
    if (shareBusy || root == null) return;
    setShareBusy(true);
    logView("journey_share", String(root));   // 📊 פאנל: שיתוף מסע
    try { emit("journey", "share", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    try {
      await shareJourneyCard(root, path.filter(s => !s.leap).map(s => ({ phrase: s.phrase })), KEY_NUMBERS[root] || null);
    } finally { setShareBusy(false); }
  }

  // 🔓 פתיחת מסר-העומק — השכבה השנייה. נפתחת אחרי שער-המייל (או ישירות למי שכבר מנוי/מחובר).
  function unlockDeep() {
    if (root == null) return;
    setUnlocked(true);
    try { localStorage.setItem("sod_jdeep_" + root, "1"); } catch { /* noop */ }
    track("journey", `journey/${root}`, "deep_unlock", { root });   // 📊 דשבורד: מי פתח עומק
    try { emit("journey", "hook_tap_unlock", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    fetchDeepMessage();
  }

  // ✉️ שער-המייל: השארת מייל → הרשמה לרשימה (source=journey-deep) → פתיחת המסר. אמין: גם אם
  // ✉️ שער-מייל יחיד בסיום — «להמשיך את הגילוי». קודם ערך (המסר חינם), ואז בקשה אחת בלבד:
  // מייל → פותח את מסר-העומק *וגם* רושם לרשימת אירועי-הגילוי (source=journey). כישלון רשת → פותחים בכל זאת.
  async function submitEmailGate(e) {
    e?.preventDefault?.();
    setGateErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setGateErr("נא להזין מייל תקין"); return; }
    setGateBusy(true);
    try {
      await subscribeEmail({ email: email.trim(), source: "journey" });
      try { trackSubscribe({ source: "journey" }); } catch { /* noop */ }
      try { localStorage.setItem("sod_jdeep_email", "1"); } catch { /* noop */ }
      setEmailGiven(true);
      logView("journey_signup", String(root));   // 📊 פאנל: הרשמה מהמסע
      try { emit("journey", "email_left", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    } catch {
      setGateErr("לא הצלחנו לשמור כרגע — פותחים בכל זאת");
    } finally {
      setGateBusy(false);
      unlockDeep();
    }
  }

  // 🔖 שמירת המסע — נשמר ל«המסעות שלי» (שורד בין דפים/מכשירים) + כישות ל«שמורים». משוב «נשמר ✓».
  function saveJourney() {
    if (root == null) return;
    const steps = path.filter(s => !s.leap).map(s => s.phrase);
    addJourney({ root, path: steps, world: dWorld || null, msg: aiMsg });
    saveItem?.(entityFromNumber(root, KEY_NUMBERS[root]));
    logJourneySave(visitorId(), { root, path: steps, world: dWorld || null });  // 🔖 פרסוס ל-DB (בקשת צוריאל A)
    logView("journey_save", String(root));
    try { emit("journey", "save", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  // 🪝 M2 — הוק «פוש/שמירה קודם» אחרי הפלט הראשון. מייל נדחה לרגע 3. ההבטחה («הרובד הבא») נשמרת בכל מקרה.
  const pushPerm = PUSH_CONFIGURED ? pushPermission() : "unsupported";
  async function hookPush() {
    if (hookBusy || root == null) return;
    setHookBusy(true);
    try { emit("journey", "hook_tap_push", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    let granted = false;
    try { const r = await enablePush({ topics: ["journey"] }); granted = !!r?.ok; if (granted) { try { stitchPush({ source: "journey", root }); } catch { /* noop */ } } } catch { /* noop */ }
    try { emit("journey", "push_result", { journeyId: journeyIdRef.current, props: { granted } }); } catch { /* noop */ }
    setHookBusy(false);
    unlockDeep(); // פותחים את הרובד הבא בכל מקרה — ההבטחה נשמרת
  }
  function hookSave() {
    try { emit("journey", "hook_tap_save", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ }
    saveJourney();
    unlockDeep();
  }

  const cur = path[path.length - 1];
  const prev = path.length > 1 ? path[path.length - 2] : null;
  const stations = path.filter(p => !p.leap);
  const dWorld = dominantWorld(stations);
  const progress = goal > 0 ? clamp(Math.round((stations.length / goal) * 100), 0, 100) : 0;

  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "34px 18px 90px", position: "relative", zIndex: 1 }}>
      <style>{`@keyframes jArrive{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes jReveal{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.08)}100%{opacity:1;transform:none}}`}</style>

      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>מסע התכנסות</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 800, margin: "6px 0 6px", textShadow: `0 0 40px ${P.onAccent}` }}>✨ קחו אותי למסע</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 470, margin: "0 auto" }}>
          כל תחנה היא ביטוי חדש — וכולן מובילות אל מספר אחד נסתר. גלו לאיזה ערך כל המסע מתכנס.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>טוען את המסע…</div>
      ) : finished ? (
        /* ───────── מסך הגילוי — העלה מתקפל אל הגזע ───────── */
        <div style={{ textAlign: "center" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
            {finished === "complete" ? "🌳 התכנסות הושלמה" : "המסע נעצר כאן"}
          </div>
          {finished === "stopped" && (
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, marginBottom: 12 }}>הקשרים הידועים הובילו אותך עד לנקודה זו.</div>
          )}
          {root != null && (
            <>
              <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, marginBottom: 4 }}>הגילוי</div>
              <div style={{ animation: "jReveal .7s ease both", color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(64px,16vw,120px)", fontWeight: 900, lineHeight: 1, textShadow: `0 0 50px ${P.glow}` }}>
                {root}
              </div>
              {KEY_NUMBERS[root] && <div style={{ color: P.accent, fontFamily: F.body, fontSize: 14, marginTop: 8, fontStyle: "italic" }}>{KEY_NUMBERS[root]}</div>}
              {leaped && (
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, marginTop: 12, display: "inline-flex", gap: 7, alignItems: "center", flexWrap: "wrap", justifyContent: "center", background: P.glow, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "6px 16px" }}>
                  <span>⚡ הערך מהדהד בסדרי גודל:</span>
                  {bases.map((b, i) => <React.Fragment key={b}>{i > 0 && <span style={{ color: P.accentDim }}>→</span>}<b style={{ color: P.accentText }}>{b}</b></React.Fragment>)}
                </div>
              )}
              <p style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(16px,3vw,20px)", fontWeight: 700, lineHeight: 1.6, maxWidth: 460, margin: "18px auto 6px" }}>
                {leaped ? "לא טיילת בין מילים. טיילת בתוך הערך — והוא הִדהד מעלה." : "לא טיילת בין מילים. טיילת בתוך הערך."}
              </p>
            </>
          )}
          {dWorld && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginBottom: 18 }}>השדה המשותף: <b style={{ color: P.ink }}>{dWorld}</b></div>}

          {/* השביל — מההתחלה אל הגזע */}
          {path.length > 0 && (
            <div style={{ display: "inline-flex", flexDirection: "column", gap: 7, alignItems: "center", margin: "6px auto 24px" }}>
              {path.map((s, i) => (
                <React.Fragment key={i}>
                  {s.leap
                    ? <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, fontStyle: "italic" }}>{s.phrase}</span>
                    : <span style={{ color: i === 0 ? P.accentText : P.ink, fontFamily: F.body, fontSize: 15, fontWeight: i === 0 ? 800 : 600,
                      border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "4px 16px", background: P.glow }}>{s.phrase}</span>}
                  {i < path.length - 1 && <span style={{ color: P.accentDim, fontSize: 14 }}>↓</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ✨ רגע השיא — סגירת המסע. בלי בקשת-מייל: קודם ערך, אחר-כך בקשה (החלטת צוריאל, פסיכולוגיית-הרשמה). */}
          {root != null && (
            <div style={{ maxWidth: 520, margin: "2px auto 16px", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 2 }}>✨</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>המסע על {root} הושלם</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>ראיתם את שכבות המספר — הנה מה שהמנוע כתב עבורכם.</div>
            </div>
          )}

          {/* 🤖 מסר מהמנוע — תבנית נגזרת + מסר אישי (AI) בלחיצה */}
          {root != null && (
            <div style={{ maxWidth: 520, margin: "0 auto 18px", textAlign: "right", background: P.cardGrad, border: `1.5px solid ${P.borderStrong}`, borderRadius: 18, padding: "16px 18px", boxShadow: `0 0 30px ${P.glow}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "space-between" }}>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 0.5 }}>🤖 מסר מהמנוע</span>
                {aiState === "done"
                  ? <span style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, border: "1px solid #3ea6ff", borderRadius: 999, padding: "2px 9px" }}>🔵 נכתב עבורך</span>
                  : <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 9px" }}>בטא</span>}
              </div>

              {aiState === "done" && aiMsg ? (
                /* המסר האישי מהמנוע */
                <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{aiMsg}</p>
              ) : (aiState === "busy" || aiState === "idle") ? (
                /* נכתב אוטומטית — מצב טעינה */
                <div style={{ display: "flex", alignItems: "center", gap: 9, color: P.accentDim, fontFamily: F.body, fontSize: 14, fontStyle: "italic", padding: "4px 0" }}>
                  <span style={{ animation: "jReveal 1s ease-in-out infinite" }}>✍️</span> המנוע כותב לך מסר אישי…
                </div>
              ) : (
                /* off — נפילה חיננית להודעת-התבנית + ניסיון חוזר */
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    {engineMessage({ root, bases, stations: stations.length, dWorld }).map((line, i, a) => (
                      <p key={i} style={{ margin: 0, color: i === a.length - 1 ? P.accentDim : P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, fontStyle: i === a.length - 1 ? "italic" : "normal" }}>{line}</p>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <button onClick={() => setAiState("idle")} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 16px" }}>↻ נסה מסר אישי</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ✦ מסר-עומק — נפתח *רק אחרי* שהמסר הראשון הגיע (aiState==="done"). שכבה שנייה, אישית ועמוקה
              יותר. שער-מייל (lead magnet): נפתח תמורת הרשמה לרשימה. מנוי/מחובר קיים — נפתח ישירות.
              אחרי פתיחה — נשאר פתוח לתמיד. */}
          {root != null && aiState === "done" && !declinedDeep && (
            !unlocked ? (
              /* 🪝 M2 — הוק «פוש/שמירה קודם» (במקום שער-מייל). אחרי הפלט הראשון: המשך בלחיצה אחת. */
              <div style={{ maxWidth: 520, margin: "0 auto 18px", textAlign: "center", background: `linear-gradient(135deg, ${P.accent}14, ${P.cardSoft})`, border: `1.5px dashed ${P.accentText}`, borderRadius: 18, padding: "18px 18px" }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>✨</div>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>זו רק הנקודה הראשונה בחוט שלך</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, maxWidth: 410, margin: "0 auto 14px" }}>
                  המסע נבנה סביב המספר שלך — ומכאן הוא נפתח: <b style={{ color: P.accentText }}>מספרים קשורים, הצלבות, שורשים ומסרי-עומק</b>.
                </div>
                <div style={{ display: "grid", gap: 9, maxWidth: 340, margin: "0 auto" }}>
                  {PUSH_CONFIGURED && pushPerm !== "denied" && (
                    <button onClick={hookPush} disabled={hookBusy}
                      style={{ cursor: hookBusy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "13px 22px", boxShadow: `0 8px 26px ${P.glow}` }}>
                      {hookBusy ? "פותח…" : "🔔 שמרו לי — ותנו לי את הרובד הבא"}
                    </button>
                  )}
                  <button onClick={hookSave}
                    style={{ cursor: "pointer", background: P.card, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 750, padding: "12px 22px" }}>
                    📌 שמור בלי הרשמה — ופתחו את ההמשך
                  </button>
                  <Link to={`/number/${root}`} onClick={() => { logView("journey_open", String(root)); try { emit("journey", "goto_number", { journeyId: journeyIdRef.current, props: { root, via: "hook" } }); } catch { /* noop */ } }}
                    style={{ textDecoration: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, padding: "6px" }}>
                    המשך למספר שלי →
                  </Link>
                </div>
                <div style={{ marginTop: 12 }}>
                  {!verified && !emailGiven && (
                    <button onClick={() => setShowEmail(s => !s)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>או קבלו את ההמשך במייל</button>
                  )}
                  <button onClick={() => setDeclinedDeep(true)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 600, marginInlineStart: 14 }}>לא עכשיו</button>
                </div>
                {showEmail && !verified && !emailGiven && (
                  <form onSubmit={submitEmailGate} style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center", maxWidth: 360, margin: "12px auto 0" }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" placeholder="המייל שלכם" required
                      style={{ flex: "1 1 100%", minWidth: 160, background: "rgba(255,255,255,0.06)", border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink, padding: "11px 16px", fontSize: 16, textAlign: "center", outline: "none" }} />
                    <button type="submit" disabled={gateBusy} style={{ cursor: gateBusy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "11px 20px" }}>{gateBusy ? "…" : "שלחו לי"}</button>
                  </form>
                )}
                {gateErr && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12.5, marginTop: 9 }}>{gateErr}</div>}
              </div>
            ) : (
              <div style={{ maxWidth: 520, margin: "0 auto 18px", textAlign: "right", background: P.cardGrad, border: `1.5px solid #3ea6ff`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 0 30px rgba(62,166,255,0.22)" }}>
                {emailGiven && !verified && (
                  <div style={{ textAlign: "center", color: P.accent, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>✨ נרשמת למסע הרמזים — נעדכן רק כשמתגלה משהו אמיתי</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "space-between" }}>
                  <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 0.5 }}>✦ מסר עומק</span>
                  <span style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, border: "1px solid #3ea6ff", borderRadius: 999, padding: "2px 9px" }}>שכבה שנייה · אישית</span>
                </div>
                {deepState === "done" && deepMsg ? (
                  <>
                    <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{deepMsg}</p>
                    {/* 🔁 מסר נוסף מהמנוע — לפי בקשה בלבד (אפשר פעמיים אם רוצים) */}
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <button onClick={() => fetchDeepMessage(true)}
                        style={{ cursor: "pointer", background: "none", border: `1px solid ${P.borderStrong}`, color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "8px 18px" }}>
                        🔁 קבלו מסר נוסף מהמנוע
                      </button>
                    </div>
                  </>
                ) : deepState === "off" ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, fontStyle: "italic", marginBottom: 8 }}>מסר-העומק אינו זמין כרגע.</div>
                    <button onClick={fetchDeepMessage} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 16px" }}>↻ נסו שוב</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 9, color: P.accentDim, fontFamily: F.body, fontSize: 14, fontStyle: "italic", padding: "4px 0" }}>
                    <span style={{ animation: "jReveal 1s ease-in-out infinite" }}>✍️</span> נפתח מסר-עומק…
                  </div>
                )}
              </div>
            )
          )}

          {/* 🔮 ריבוע פיתוחים עתידיים + גרסה 2 */}
          <div style={{ maxWidth: 520, margin: "0 auto 24px", textAlign: "right", background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>🔮 מה עוד בדרך</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>המסע הזה רק מתחיל לגדול. הנה מה שהמנוע יֵדע לעשות בקרוב:</div>
            {/* 💾 «המסעות שלי» — כבר פעיל: פותח את האזור האישי (עולם המשתמש) עם המסעות שנשמרו + כל השמורים */}
            <Link to="/profile" onClick={() => logView("journey_myjourneys", "profile")}
              style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none",
                background: `linear-gradient(135deg, ${P.accent}22, ${P.glow})`, border: `1.5px solid ${P.accent}`,
                borderRadius: 12, padding: "11px 13px", marginBottom: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1.2 }}>💾</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>המסעות שלי · האזור האישי</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>לצפות במסעות שעשית ובכל מה ששמרת — פרטי לחלוטין.</div>
              </div>
              <span style={{ flex: "0 0 auto", color: P.accentText, fontSize: 15, fontWeight: 800 }}>←</span>
            </Link>
            <div style={{ display: "grid", gap: 8 }}>
              {FUTURE.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: P.glow, border: `1px solid ${P.border}`, borderRadius: 12, padding: "9px 12px" }}>
                  <span style={{ fontSize: 17, lineHeight: 1.2 }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>{f.title}{f.soon && <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 10, fontWeight: 800, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "1px 7px", marginInlineStart: 8 }}>בקרוב</span>}</div>
                    <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{f.note}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* גרסה 2 — הכותרת הגדולה */}
            <div style={{ marginTop: 12, background: `linear-gradient(135deg, ${P.accent}22, ${P.glow})`, border: `1.5px solid ${P.accent}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>✨ מסע · גרסה 2</span>
                <span style={{ color: P.onAccent, background: P.accentBtn, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 10px" }}>בדרך</span>
              </div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65, marginTop: 6 }}>
                מסע מודרך עם הסתעפויות לבחירתך, בחירת עומק (קצר/עמוק), ומסר-מנוע אישי שנכתב בזמן אמת. אתה תכוון את המסע — לא רק תצפה בו.
              </div>
            </div>
          </div>

          {/* 💬 וו-ההמרה בוואטסאפ — הוסר זמנית (בקשת צוריאל: «עוד לא מוכן»). לכשיבשיל — להחזיר. */}

          {/* כפתורים — פתיחת הגזע · שיתוף · מסע חדש */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {root != null && (
              <Link to={`/number/${root}`} onClick={() => { logView("journey_open", String(root)); try { emit("journey", "goto_number", { journeyId: journeyIdRef.current, props: { root } }); } catch { /* noop */ } }} style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 30px", boxShadow: `0 0 30px ${P.onAccent}` }}>
                פתח את {root} →
              </Link>
            )}
            {root != null && (
              <button onClick={saveJourney} style={{ cursor: "pointer", background: savedFlash ? P.accentBtn : P.card, color: savedFlash ? P.onAccent : P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 22px", transition: "all .2s" }}>
                {savedFlash ? "✓ נשמר למסעות שלי" : "🔖 שמרו את המסע"}
              </button>
            )}
            {root != null && (
              <button onClick={() => shareJourney()} disabled={shareBusy} style={{ cursor: shareBusy ? "wait" : "pointer", background: P.card, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 22px" }}>
                {shareBusy ? "מכין…" : "שתפו את המסע ✦"}
              </button>
            )}
            <button onClick={restart} style={{ cursor: "pointer", background: "none", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, padding: "13px 18px" }}>
              מסע חדש 🎲
            </button>
          </div>
        </div>
      ) : cur ? (
        /* ───────── המסע עצמו (ערך-היעד נסתר) ───────── */
        <>
          {/* מד ההתכנסות — מטפס לקראת הגילוי (במקום "תחנה N מתוך M") */}
          <div style={{ maxWidth: 460, margin: "0 auto 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 1.5, textTransform: "uppercase" }}>התכנסות</span>
              <span style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: P.cardSoft, borderRadius: 999, overflow: "hidden", border: `1px solid ${P.border}` }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${P.accent}, ${P.accentText})`, transition: "width .5s ease" }} />
            </div>
          </div>

          {/* קריינות התחנה */}
          {prev && (
            <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13.5, marginBottom: 10 }}>
              <span style={{ color: P.inkSoft }}>{prev.phrase}</span>　{LINES[(path.length - 2) % LINES.length]}…
            </div>
          )}
          <div key={path.length} style={{
            animation: "jArrive .55s ease both", textAlign: "center",
            background: P.cardGrad,
            border: `1.5px solid ${P.borderStrong}`, borderRadius: 20, padding: "34px 22px", boxShadow: `0 0 40px ${P.onAccent}`,
          }}>
            <div style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13, marginBottom: 6 }}>תחנה {path.length}</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5.5vw,44px)", fontWeight: 800, lineHeight: 1.25 }}>{cur.phrase}</div>
            {cur.world && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 8 }}>{cur.world}</div>}
          </div>

          {/* כפתורים */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
            <button onClick={step} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 30px", boxShadow: `0 0 30px ${P.onAccent}` }}>
              המשיכו במסע ✨
            </button>
            <Link to={`/number/${encodeURIComponent(cur.phrase)}`} style={{ textDecoration: "none", background: P.card, color: P.ink, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 20px" }}>
              פתחו את {cur.phrase} →
            </Link>
            <button onClick={restart} style={{ cursor: "pointer", background: "none", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, padding: "13px 18px" }}>
              מסע חדש 🎲
            </button>
          </div>

          {/* שביל המסע */}
          {path.length > 1 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}>השביל שעברתם</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", alignItems: "center" }}>
                {path.slice(-12).map((s, i, a) => (
                  <React.Fragment key={i}>
                    {s.leap
                      ? <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, fontStyle: "italic" }}>{s.phrase}</span>
                      : <span style={{ color: s === cur ? P.accentText : P.inkSoft, fontFamily: F.body, fontSize: 13, border: `1px solid ${s === cur ? P.borderStrong : P.border}`, borderRadius: 999, padding: "3px 11px" }}>{s.phrase}</span>}
                    {i < a.length - 1 && <span style={{ color: P.accentDim, fontSize: 12 }}>←</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>לא נמצא מסע מתאים. <button onClick={restart} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontWeight: 700 }}>נסו מסע חדש 🎲</button></div>
      )}
    </div>
  );
}
