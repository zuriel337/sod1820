import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// One-off GA4 Israel new/returning analysis utility; not a permanent analytics API.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired", reason: "one_off_analysis_complete" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
