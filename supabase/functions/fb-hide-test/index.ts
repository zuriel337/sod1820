import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// One-off Meta API capability probe from June 2026. The tested path was not a viable canonical capability.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
