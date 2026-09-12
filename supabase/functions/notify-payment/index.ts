// G0 tombstone — payment admin alerts now belong to admin_alert_direct_law.
// The DB trigger replacement calls public.notify_admin() directly; this Edge sender must not become a parallel alert path.

Deno.serve(() => new Response(JSON.stringify({
  ok: false,
  retired: true,
  replacement: "payment trigger -> public.notify_admin",
}), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
