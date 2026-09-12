import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// One-off Facebook cleanup/audit utility from June 2026. Not a canonical publishing or analytics owner.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
