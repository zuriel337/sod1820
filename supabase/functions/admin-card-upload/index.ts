import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Disabled one-time uploader. Kept as a no-op to avoid an open write endpoint.
Deno.serve(() => new Response(JSON.stringify({ error: "disabled" }), { status: 410, headers: { "Content-Type": "application/json" } }));
