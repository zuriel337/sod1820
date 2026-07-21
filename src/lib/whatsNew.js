import { getChannelUpdates, getRealityHints, getPostsFromSupabase } from "./supabase.js";
import { getForumFeed } from "./contributions.js";
import { getSystemCiphers } from "./elsMatrices.js";
import { seenCutoff } from "./crossesNew.js";

// 🔔 «מה חדש מאז ביקורך» — ספירה מאוחדת של 4 הזרמים, פר-משתמש (whats_new_law).
// מקור אחד: אותם מפתחות-«נראה» של מרכז השידורים ("bc-forum"/"bc-channels"/"bc-activity"/"bc-dev"),
// כך שפתיחת טאב במרכז מורידה גם את המונה בבית — אף פעם לא סותר. משמש את הכרטיס בדף הבית.
const REAL_CHANNELS = ["gilui-yomi", "torat-haremez", "sod-hachashmal", "reality-code", "or-geula"];
const ms = v => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : 0; };

export async function getWhatsNewCounts() {
  const cut = k => ms(seenCutoff("bc-" + k));
  try {
    const [forum, hints, posts, sysCiphers, chanArr, dev] = await Promise.all([
      getForumFeed({ limit: 30, includePosts: false }).catch(() => []),   // פורום = קהילה בלבד
      getRealityHints(25).catch(() => []),
      getPostsFromSupabase({ limit: 20, orderBy: "modified" }).then(r => r?.posts || []).catch(() => []),
      getSystemCiphers(20).catch(() => []),
      Promise.all(REAL_CHANNELS.map(ch => getChannelUpdates(20, ch, true).catch(() => []))),
      getChannelUpdates(30, "site-news", true).catch(() => []),
    ]);
    const cF = cut("forum"), cC = cut("channels"), cA = cut("activity"), cD = cut("dev");
    const forumN = (forum || []).filter(x => ms(x.ts) > cF).length;   // כבר בלי פוסטים
    // פעילות = עדכונים אחרונים (כל הפוסטים, כולל מערכת) + זרם המציאות + צפני-מערכת
    const postsN = (posts || []).filter(p => ms(p.modified || p.date) > cA).length;
    const hintsN = (hints || []).filter(h => ms(h.occurred_at || h.created_at) > cA).length;
    const ciphersN = (sysCiphers || []).filter(c => ms(c.created_at) > cA).length;
    const activityN = postsN + hintsN + ciphersN;
    const channelsN = (chanArr || []).flat().filter(u => ms(u.created_at) > cC).length;
    const devN = (dev || []).filter(u => ms(u.created_at) > cD).length;
    // ⛔ ערוצים לא נספרים ב-total: הם תמיד מלאים + יש טיקר-ערוצים חי → אחרת «מכריחים» את הכרטיס להיפתח כל הזמן.
    // השדה channels נשמר (מצביע-בלבד בכרטיס), אך מה שמחליט אם יש «חדש» = פורום + פעילות + פיתוח.
    return { forum: forumN, channels: channelsN, activity: activityN, dev: devN, total: forumN + activityN + devN };
  } catch {
    return { forum: 0, channels: 0, activity: 0, dev: 0, total: 0 };
  }
}
