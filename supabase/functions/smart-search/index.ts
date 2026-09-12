// G0 tombstone — legacy smart-search had no current runtime caller and exposed a service-role read surface.
// Modern Number/Research/Gematria APIs own searchable research capability. Do not revive this endpoint as a parallel search owner.

Deno.serve(() => new Response(JSON.stringify({
  success: false,
  retired: true,
  error: "gone",
}), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
