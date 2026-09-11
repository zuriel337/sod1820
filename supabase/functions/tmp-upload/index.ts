import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Disabled one-time uploader. Kept inert (no service-role access).
Deno.serve(() => new Response("gone", { status: 410 }));
