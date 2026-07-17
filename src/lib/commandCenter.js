// 🧭 מרכז הפיקוד — עדשות-לקוח לשלב 1+2 (personal_command_center_law).
// «עץ אחד»: נבנה על נתונים קיימים (visitor_events / research_items / getForumFeed / profiles),
// בלי טבלאות/מערכות מקבילות. הכל beta — הקרדיטים בהרצה.
import { supabase } from "./supabase.js";
import { getVisitorId } from "./tracking.js";
import { getForumFeed } from "./contributions.js";

// 💰 הפרופיל+יתרת-הקרדיטים של המשתמש (RLS: כל אחד רואה רק את שלו). null אם אין עדיין רשומה.
export async function getMyProfile() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("profiles").select("credits,xp,level,tier,streak").maybeSingle();
    return data || null;
  } catch { return null; }
}

// 🎁 תביעת מענקי-מייסד ממתינים לפי המייל המאומת (idempotent). מחזיר את הסכום שנוסף (0 אם אין).
export async function claimFoundingGrants() {
  if (!supabase) return 0;
  try { const { data } = await supabase.rpc("claim_my_founding_grants"); return data || 0; } catch { return 0; }
}

// 🧠 «מה כדאי לי לעשות עכשיו?» — עד 3 פעולות, מנתונים קיימים בלבד (בלי RPC חדש).
// module → פותח מודול במגירה · link → ניווט. center = תוצאת my_center שכבר נטענה.
export async function getNextActions({ center } = {}) {
  const out = [];
  const vid = (() => { try { return getVisitorId(); } catch { return null; } })();

  // 1) המשך מהמקום שעצרת — הישות האחרונה שנחקרה (visitor_events לפי visitor_id)
  if (supabase && vid) {
    try {
      const { data } = await supabase.from("visitor_events")
        .select("section,slug,created_at")
        .eq("visitor_id", vid).in("section", ["number", "beit-midrash", "research"])
        .not("slug", "is", null).order("created_at", { ascending: false }).limit(1);
      const e = data && data[0];
      if (e && e.slug) {
        const link = e.section === "number" ? `/number/${encodeURIComponent(e.slug)}`
          : e.section === "beit-midrash" ? "/beit-midrash" : "/research";
        out.push({ icon: "↩️", text: `המשך מהמקום שעצרת — «${e.slug}»`, cta: "פתח", link });
      }
    } catch { /* noop */ }
  }

  // 2) מחקר פעיל (מ-my_center שכבר נטען)
  if ((center?.research_items ?? 0) > 0) {
    out.push({ icon: "🔬", text: `יש לך ${center.research_items} פריטים במחקר הפעיל`, cta: "למחקר שלי", module: "research" });
  }

  // 3) חדש בקהילה — הפריט האחרון בפורום (מצביע, לא משכפל)
  try {
    const feed = await getForumFeed({ limit: 1 });
    const f = feed && feed[0];
    if (f) {
      const title = (f.title || (f.body || "").slice(0, 60)).trim();
      const link = f.kind === "post" ? `/${f.slug}` : "/forum";
      out.push({ icon: "🆕", text: `חדש בקהילה: ${title.length > 54 ? title.slice(0, 54) + "…" : title}`, cta: "לצפייה", link });
    }
  } catch { /* noop */ }

  return out.slice(0, 3);
}
