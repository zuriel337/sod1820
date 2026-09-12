// G0 tombstone — the legacy wa-daily-digest cron is disabled and this path must not be re-enabled
// without Truth/Human-Gate/auth reconciliation. Admin alerts belong to public.notify_admin();
// public/social publication requires its owning publication authority.

Deno.serve(() => new Response(JSON.stringify({
  ok: false,
  retired: true,
  error: "gone",
}), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
