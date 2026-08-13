// src/lib/handled.js — CC-1.3 · marker אישי «handled» חוצה-מכשירים על גבי research_items הקיים.
// ⚠️ reuse-first: אין schema חדש. bucket='handled', entity_type='cc_handled', entity_ref=item.key (מזהה יציב).
// חוקי-ברזל: נפרד לחלוטין מסטטוס-המקור · אין מחיקת חומר · אין Claim→Fact · אין קידום Canonical.
// «handled» = מצב תור-העבודה האישי של המשתמש, לא מצב הממצא. provenance נשמר ב-metadata כל עוד ה-marker קיים.
// חוזה שאומת מול הסכמה החיה (13.8.2026): user_id/bucket/entity_type NOT NULL · metadata jsonb NOT NULL ·
//   RLS ri_select/insert/update/delete_own (user_id=auth.uid()) · GRANT ל-authenticated קיים.
import { supabase } from "./supabase.js";

export const HANDLED_BUCKET = "handled";
export const HANDLED_TYPE = "cc_handled";

// כל ה-markers של המשתמש → Map(entity_ref → {id, at, reason, source, orig_status, ...}).
export async function getHandledMap(uid) {
  if (!uid) return new Map();
  const { data, error } = await supabase.from("research_items")
    .select("id, entity_ref, title, metadata, created_at")
    .eq("user_id", uid).eq("bucket", HANDLED_BUCKET).eq("entity_type", HANDLED_TYPE);
  const m = new Map();
  if (error) return m;
  for (const r of (data || [])) m.set(r.entity_ref, { id: r.id, at: r.created_at, ...(r.metadata || {}) });
  return m;
}

// סגירה-מהתור — insert marker (RLS ri_insert_own: user_id=auth.uid()). לא נוגע בסטטוס-המקור.
export async function markHandled(uid, item, reason) {
  if (!uid) throw new Error("סגירה חוצה-מכשירים דורשת התחברות");
  const row = {
    user_id: uid, bucket: HANDLED_BUCKET, entity_type: HANDLED_TYPE, entity_ref: item.key,
    title: ((item.raw || "").trim().slice(0, 140)) || item.source || item.key,
    link: item.link || null,
    metadata: {
      reason: reason || null, source: item.source || null,
      orig_status: item.status || (item.published ? "published" : (item.engineVerified ? "engine" : "raw")),
      rawAuthor: item.rawAuthor || item.author || null,
      tier: item.tier?.key || null, at: new Date().toISOString(), actor: "zuriel",
    },
  };
  const { data, error } = await supabase.from("research_items").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

// ביטול-סגירה — delete marker (RLS ri_delete_own). מחזיר לתור.
// tradeoff מאושר (13.8.2026): מחיקה מסירה את ה-marker; היסטוריית-הטיפול-שלו לא נשמרת (אין מנגנון-audit קיים; לא הומצא).
export async function unmarkHandled(uid, item) {
  if (!uid) return;
  await supabase.from("research_items").delete()
    .eq("user_id", uid).eq("bucket", HANDLED_BUCKET).eq("entity_type", HANDLED_TYPE).eq("entity_ref", item.key);
}
