import { getChannelUpdates, getRealityHints } from "./supabase.js";
import { getForumFeed } from "./contributions.js";
import { seenCutoff } from "./crossesNew.js";

// 🔔 «מה חדש מאז ביקורך» — ספירה מאוחדת של 4 הזרמים, פר-משתמש (whats_new_law).
// מקור אחד: אותם מפתחות-«נראה» של מרכז השידורים ("bc-forum"/"bc-channels"/"bc-activity"/"bc-dev"),
// כך שפתיחת טאב במרכז מורידה גם את המונה בבית — אף פעם לא סותר. משמש את הכרטיס בדף הבית.
const REAL_CHANNELS = ["gilui-yomi", "torat-haremez", "sod-hachashmal", "reality-code", "or-geula"];
const ms = v => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : 0; };

export async function getWhatsNewCounts() {
  const cut = k => ms(seenCutoff("bc-" + k));
  try {
    const [forum, hints, chanArr, dev] = await Promise.all([
      getForumFeed({ limit: 30 }).catch(() => []),
      getRealityHints(25).catch(() => []),
      Promise.all(REAL_CHANNELS.map(ch => getChannelUpdates(20, ch, true).catch(() => []))),
      getChannelUpdates(30, "site-news", true).catch(() => []),
    ]);
    const cF = cut("forum"), cC = cut("channels"), cA = cut("activity"), cD = cut("dev");
    const forumN = (forum || []).filter(x => x.kind !== "post" && ms(x.ts) > cF).length;
    // פעילות = עדכונים אחרונים (פוסטים) + זרם המציאות (רמזים)
    const postsN = (forum || []).filter(x => x.kind === "post" && ms(x.ts) > cA).length;
    const hintsN = (hints || []).filter(h => ms(h.occurred_at || h.created_at) > cA).length;
    const activityN = postsN + hintsN;
    const channelsN = (chanArr || []).flat().filter(u => ms(u.created_at) > cC).length;
    const devN = (dev || []).filter(u => ms(u.created_at) > cD).length;
    return { forum: forumN, channels: channelsN, activity: activityN, dev: devN, total: forumN + channelsN + activityN + devN };
  } catch {
    return { forum: 0, channels: 0, activity: 0, dev: 0, total: 0 };
  }
}
