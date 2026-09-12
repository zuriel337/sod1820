import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// 🔒 מנוטרל — שימש חד-פעמית להעלאת תמונות פוסט. ניתן למחיקה מה-Dashboard.
Deno.serve(() => new Response("gone", { status: 410 }));
