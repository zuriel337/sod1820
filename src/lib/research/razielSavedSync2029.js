// Presentation only over the existing ResearchProvider ACK/status. No storage,
// queue, authorization, retry loop or cloud-success inference from saveItem().
export function razielSavedSyncCopy(status) {
  if (status === "synced") return "השיחות השמורות מסונכרנות באופן פרטי לחשבון";
  if (status === "local_only") return "נשמר בדפדפן הזה בלבד; השיחות אינן מסונכרנות לחשבון";
  if (["pending", "syncing", "resolving"].includes(status)) return "נשמר מקומית · ממתין לאישור סנכרון מהחשבון";
  if (["loading", "auth_loading"].includes(status)) return "טוען את השיחות מהחשבון…";
  if (status === "local_error") return "השמירה בדפדפן נכשלה; אין אישור שהשיחה נשמרה";
  if (status === "local_recovery_required") return "נדרש שחזור השמירה המקומית; אין אישור סנכרון לחשבון";
  if (status === "conflict") return "קיים שינוי אחר בחשבון; יש לפתור את התנגשות הסנכרון לפני שמירה בענן";
  if (status === "error") return "הסנכרון נכשל; אין עדיין אישור שמירה בחשבון";
  return "מצב הסנכרון אינו ידוע; אין עדיין אישור שמירה בחשבון";
}

export const canRetryRazielSync = status => ["error", "pending"].includes(status);
export const RAZIEL_LOCAL_SAVE_NOTICE = "השיחה נשמרה בדפדפן. אישור הסנכרון לחשבון מוצג בנפרד.";
