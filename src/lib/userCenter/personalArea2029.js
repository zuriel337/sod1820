// "האזור האישי שלי" (2029): the pure model of what the personal panel offers.
//
// One entry for the account, one destination per capability, one data source per capability. Nothing here fetches, stores or owns data:
// every card names the EXISTING owner it opens (a WriterPersonal2029Page module, an existing route, or an in-panel section whose data
// the panel already reads from ResearchProvider / notification_prefs / the user's own profile). A card whose capability is closed says
// so with the real reason; it is never a dead tile.
import { WRITER_PERSONAL_MODULES, writerPersonalHref } from "./writerPersonal2029.js";

export const PERSONAL_GROUPS = Object.freeze([
  { id: "me", title: "החשבון והדף שלי", hue: "me" },
  { id: "research", title: "המחקר והמסע", hue: "research" },
  { id: "connect", title: "קשר ועדכונים", hue: "connect" },
  { id: "account", title: "קרדיטים וגישה", hue: "account" },
]);

const MODULES = new Set(WRITER_PERSONAL_MODULES.map(([id]) => id));
const count = value => (Number.isFinite(value) ? value : null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// A destination is one of: { module } (WriterPersonal2029Page), { href } (an existing route), { section } (in-panel, same data as before),
// { signIn } (guest: the account form on top of this panel) or null (closed, with a reason).
export function personalCards({ signedIn = false, stats = null, follows = null, inbox = null, research = null, savedConversations = null,
  journeyLocked = false, elsLocked = false, razielLocked = false } = {}) {
  const cards = [];
  const add = card => cards.push({ state: "live", reason: "", ...card });
  const needSignIn = signedIn ? null : { signIn: true };
  const researchCount = research ? [research.saved, research.cart, research.pinned].reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0) : null;
  const level = count(stats?.level), xp = count(stats?.xp), credits = count(stats?.credits);

  add({ id: "profile", group: "me", icon: "personal", title: "הפרופיל והתמונה", hint: "שם, תמונה ופרטים אישיים",
    to: needSignIn || { module: "profile" }, owner: "ProfileSettings + WriterPublicPortrait2029 (users)" });
  add({ id: "public-page", group: "me", icon: "kingdom", title: "הדף שלי", hint: "הדף הציבורי שלי: צפייה ויצירה",
    to: needSignIn || { module: "public-page" }, owner: "WriterPersonalHome2029 (contributors.user_id)" });
  add({ id: "page-editor", group: "me", icon: "edit", title: "עורך הדף", hint: "כתבים, הקדמה ותצוגה בדף שלי",
    to: needSignIn || { module: "page-editor" }, owner: "PageEditor (contributor-self)" });
  add({ id: "notes", group: "me", icon: "journal", title: "הפנקס שלי", hint: "הערות פרטיות, נשמרות בחשבון",
    to: needSignIn || { module: "notes" }, owner: "PersonalNotes2029 (user_notes)" });
  add({ id: "progress", group: "me", icon: "graph", title: "ההתקדמות שלי",
    hint: signedIn ? ([level != null && `שלב ${level}`, xp != null && `${xp} XP`, stats?.streak ? `רצף ${stats.streak}` : null].filter(Boolean).join(" · ") || "הנתונים עדיין אינם זמינים") : "שלב פעילות ו־XP אישיים",
    to: needSignIn || { module: "progress" }, owner: "WriterPrivateProgress2029 (getMyProfile)" });

  add({ id: "research", group: "research", icon: "research", title: "המחקר והשמורים",
    hint: researchCount != null ? (researchCount ? plural(researchCount, "פריט", "פריטים") + " · עריכה והסרה" : "אין עדיין פריטים שמורים") : "המסלולים, השמורים וההמשך שלי",
    to: { section: "research" }, owner: "ResearchProvider (research_items / user_research)" });
  add({ id: "codes", group: "research", icon: "cipher", title: "הצפנים שלי", hint: elsLocked ? "הצופן פתוח כרגע למנהל בלבד" : "צפנים ששמרתי ויצרתי",
    to: elsLocked ? null : needSignIn || { href: "/els?library=mine" }, state: elsLocked ? "locked" : "live",
    reason: elsLocked ? "הצופן סגור כרגע לציבור (lock_els)" : "", owner: "ElsSavedLibrary2029 (/els?library=mine)" });
  add({ id: "life-journey", group: "research", icon: "journey", title: "מסע החיים שלי", hint: journeyLocked ? "סגור כרגע · בבנייה" : "שם, תאריך ומשפחה — פרטי",
    to: journeyLocked ? null : needSignIn || { href: "/2029/journey" }, state: journeyLocked ? "building" : "live",
    reason: journeyLocked ? "הדגל lock_life_journey סגור (site_flags)" : "", owner: "LifeJourney2029Page (/2029/journey)" });
  add({ id: "hints", group: "research", icon: "spark", title: "הרמזים שלי", hint: journeyLocked ? "סגור כרגע · בבנייה" : "רמזים פרטיים, בדיקה ופענוח",
    to: journeyLocked ? null : needSignIn || { section: "hints" }, state: journeyLocked ? "building" : "live",
    reason: journeyLocked ? "הדגל lock_life_journey סגור (site_flags)" : "", owner: "openPrivateHints → LifeJourney (private hints)" });
  add({ id: "raziel", group: "research", icon: "raziel", title: "השיחות שלי עם רזיאל",
    hint: savedConversations != null ? (savedConversations ? plural(savedConversations, "שיחה שמורה", "שיחות שמורות") : "אין עדיין שיחות שמורות") : razielLocked ? "השיחות השמורות זמינות; ההמשך נעול" : "המשך מאיפה שעצרת",
    to: { section: "raziel" }, owner: "RazielCenter2029 (RazielSessionProvider2029 saved sessions)" });

  add({ id: "messages", group: "connect", icon: "mail", title: "הודעות פרטיות", hint: "שיחות פרטיות עם כותבים",
    to: needSignIn || { module: "messages" }, owner: "MessagesHub (private messages)" });
  add({ id: "replies", group: "connect", icon: "conversation", title: "תגובות אליי", hint: "תגובות להודעות שלי בקהילה",
    to: needSignIn || { module: "messages", tab: "replies" }, owner: "MessagesHub tab=replies (community replies)" });
  add({ id: "follow", group: "connect", icon: "signal", title: "מעקב ועדכונים",
    hint: signedIn && inbox?.status === "ready" ? plural(inbox.unread, "עדכון חדש", "עדכונים חדשים") + (follows?.status === "ready" ? ` · ${follows.topics.length} מעקבים` : "")
      : follows?.status === "ready" ? plural(follows.topics.length, "מעקב", "מעקבים") : "מה אני עוקב אחריו",
    to: { section: "follow" }, owner: "notification_prefs (getNotificationPrefs) → FollowCenterController2029 (/2029/me/notifications)" });
  add({ id: "contributions", group: "connect", icon: "community", title: "התרומות שלי", hint: "התרומות שמוצגות בדף הציבורי שלי",
    to: needSignIn || { href: "/community/researcher/me" }, owner: "WriterMe2029Redirect → public writer page (research_contributions via contributors.user_id)" });

  add({ id: "credits", group: "account", icon: "discovery", title: "הקרדיטים שלי",
    hint: credits != null ? `יתרה: ${credits} · פירוט התנועות ייפתח בהמשך` : "היתרה אינה זמינה כרגע", to: null, state: "building",
    reason: "פירוט התנועות עדיין לא נחשף: הקריאה אליו סגורה בשער הציבורי (membership_credit_summary_v1)", owner: "profiles.credits via getMyProfile (balance only)" });
  add({ id: "access", group: "account", icon: "privacy", title: "גישה ומנוי", hint: "בהכנה · ההצטרפות למסלול בתשלום אינה זמינה", to: null, state: "building",
    reason: "אין מנוי פעיל במערכת; ההצטרפות בתשלום אינה נחשפת", owner: "—" });
  return cards;
}

// The main action (gold): the first thing a person most likely came for.
export function personalPrimaryAction({ signedIn, hasContext, hasSavedPath } = {}) {
  if (!signedIn) return { id: "sign-in", label: "כניסה או הרשמה", to: { signIn: true } };
  if (hasContext) return { id: "resume", label: "המשך בדיוק מהמקום שעצרתי", to: { resume: true } };
  if (hasSavedPath) return { id: "resume-path", label: "המשך מהמסלול השמור", to: { resumePath: true } };
  return { id: "research", label: "המחקר והשמורים שלי", to: { section: "research" } };
}

// Resolves a card destination to the exact address the frame navigates to (always an existing, verified route), or null.
export function personalCardHref(card, { returnTo } = {}) {
  const to = card?.to;
  if (!to || to.signIn || to.section) return null;
  if (to.module) return MODULES.has(to.module) ? writerPersonalHref(to.module, { returnTo, ...(to.tab ? { tab: to.tab } : {}) }) : null;
  return typeof to.href === "string" && to.href.startsWith("/") && !to.href.startsWith("//") ? to.href : null;
}
