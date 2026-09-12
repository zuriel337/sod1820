import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// wa-christina was renamed to the canonical wa-raziel path in July 2026.
// The live cron has pointed only to wa-raziel since that migration; this legacy deployment is orphaned.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired", replacement: "wa-raziel" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
