export async function persistExplicitIssueReport(payload, client) {
  if (!client) throw new Error("issue_report_unavailable");
  const {error} = await client.rpc("ingest_event", {
    p_sod_id: null, p_surface: "issue_report", p_event_type: "issue_report",
    p_path: payload.path, p_props: payload, p_is_bot: false,
  });
  if (error) throw error;
  return {saved: true};
}
