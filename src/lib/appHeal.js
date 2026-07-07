// 🩹 ריפוי-עצמי לאפליקציה המותקנת (PWA) — בלי להטריד את המשתמש.
// הבעיה (7.7.2026): אחרי יום מרובה-פריסות, PWA שמחזיקה באנדל ישן מנסה לטעון
// chunk שכבר נמחק מהשרת → מסך מת ("נפתח ונכבה"). המשתמשים לא אמורים להתקין מחדש.
// שתי שכבות, שתיהן שקופות:
//   1) chunk דינמי נכשל (vite:preloadError) → רענון מיידי חד-פעמי (עם שומר-לולאה).
//   2) אפליקציה מותקנת שחוזרת מרקע אחרי שינה ארוכה → השוואת גרסה מול השרת → רענון שקט.
// הבאנר הקיים (UpdateBanner) נשאר למקרה הרך בדפדפן — כאן מטפלים רק במקרים שהוא לא מציל.

const RELOAD_GUARD = "sod_heal_reload_v1";
const LONG_SLEEP_MS = 30 * 60 * 1000; // חצי שעה ברקע = מועמד לגרסה ישנה

function currentEntry() {
  const s = Array.from(document.querySelectorAll("script[src]")).map(x => x.getAttribute("src") || "");
  return s.find(src => /\/assets\/index-[\w-]+\.js/.test(src)) || "unknown";
}

function reloadOncePerVersion() {
  try {
    const cur = currentEntry();
    if (sessionStorage.getItem(RELOAD_GUARD) === cur) return false; // כבר ריעננו לגרסה הזו — לא נכנסים ללולאה
    sessionStorage.setItem(RELOAD_GUARD, cur);
  } catch { /* storage חסום — עדיין מרעננים פעם אחת */ }
  window.location.reload();
  return true;
}

export function initAppHeal() {
  // ── שכבה 1: נתיב-מת. Vite פולט את האירוע הזה כשטעינת chunk דינמי נכשלת
  // (הסימן המובהק לבאנדל ישן מול שרת חדש). רענון מביא HTML+באנדל טריים.
  window.addEventListener("vite:preloadError", (e) => {
    if (reloadOncePerVersion()) e.preventDefault?.();
  });

  // ── שכבה 2: רק באפליקציה מותקנת (standalone) — חזרה מרקע אחרי שינה ארוכה.
  const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    || window.navigator.standalone === true;
  if (!standalone) return;

  let hiddenAt = 0;
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (!hiddenAt || Date.now() - hiddenAt < LONG_SLEEP_MS) return;
    hiddenAt = 0;
    try {
      const res = await fetch("/", { cache: "no-store" });
      if (!res.ok) return;
      const m = (await res.text()).match(/\/assets\/index-[\w-]+\.js/);
      if (m && m[0] !== currentEntry()) reloadOncePerVersion(); // גרסה חדשה בשרת → רענון שקוף
    } catch { /* אין רשת — לא נוגעים */ }
  });
}
