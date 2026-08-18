import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabase.js";

// 🙈 העדפת-הסתרה פר-משתמש-מחובר קבוע (לא localStorage אנונימי) — וידג'ט שהמשתמש הסיר
// "מהעדכונים" (כפתור ✕) נשאר מוסתר לתמיד, בכל מכשיר, כי הוא נשמר על החשבון (profiles.hidden_widgets
// דרך RPC set_hidden_widget — owner-gateway, כמו claim_daily_credit). בקשת צוריאל 18.8.2026.
async function getMyHiddenWidgets() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("profiles").select("hidden_widgets").maybeSingle();
    return Array.isArray(data?.hidden_widgets) ? data.hidden_widgets : [];
  } catch { return []; }
}

export function useHiddenWidget(key) {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setHidden(false); setReady(true); return; }
    setReady(false);
    getMyHiddenWidgets().then(list => { if (alive) { setHidden(list.includes(key)); setReady(true); } });
    return () => { alive = false; };
  }, [user?.id, key]);

  // אופטימי: נעלם מיד עם הלחיצה, ואז נכתב לענן. בכשל — נשאר מוסתר בסשן הנוכחי בכל מקרה.
  const remove = useCallback(() => {
    if (!user) return;
    setHidden(true);
    supabase.rpc("set_hidden_widget", { p_key: key, p_hidden: true }).catch(() => {});
  }, [user, key]);

  return { canRemove: !!user, hidden, ready, remove };
}
