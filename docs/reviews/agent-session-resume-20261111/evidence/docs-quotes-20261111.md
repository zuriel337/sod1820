# Documentation quotes (fetched 2026-11-11)

Source: https://code.claude.com/docs/en/routines ("Automate work with scheduled tasks")

> To see what a run did, click it in the **History** list on the detail page. The run [opens as a full session](#view-and-interact-with-runs), a new one for each run, where you can see what Claude did, review changes, and create a pull request.

> An API trigger gives a scheduled task a dedicated HTTP endpoint. POSTing to the endpoint with the task's bearer token starts a new session and returns a session URL. Use this to wire Claude Code into alerting systems, deploy pipelines, internal tools, or anywhere you can make an authenticated HTTP request.

> Each scheduled task has its own token, scoped to triggering that task only. To turn off API access or rotate the token, [open the task's **Edit scheduled task** dialog](#edit-and-control-scheduled-tasks) again. Both controls are next to the token in the API trigger's panel and take effect immediately:

> Send a POST request to the `/fire` endpoint with the bearer token in the `Authorization` header. The request body accepts an optional `text` field for run-specific context such as an alert body or a failing log, passed to the task alongside its saved prompt. The value is freeform text and is not parsed: if you send JSON or another structured payload, the task receives it as a literal string.

> The `text` value doesn't reach the routine as a bare message. It arrives wrapped in a `<routine-fire-payload>` block that labels it as untrusted data and tells Claude not to follow instructions inside it unless the routine's own prompt says to. The same wrapping applies to text supplied with **Run now** in the web UI.

> A successful request returns a JSON body with the new session ID and URL:

> In a [project](https://code.claude.com/docs/en/claude-projects.md), a run can continue a thread rather than start a new session. That run keeps whatever permission mode the thread is in at the time. When that thread was made, it started in auto mode unless auto mode was unavailable. To answer a prompt waiting in that thread, see [Unblock a thread waiting on approval](https://code.claude.com/docs/en/claude-projects.md#unblock-a-thread-waiting-on-approval).

Source: https://code.claude.com/docs/en/claude-projects

> * Choose **Continue as new project** to create a new project from the session. The project opens, and Claude reads the session and posts **Setup recommendations** in the project conversation for you to confirm. The original session stays in your session list. If it was in the middle of a turn it keeps running, so stop it yourself if you don't want both working at once.

> * Choose one of your existing projects to bring the session's work into that project. That project opens, and a message sent on your behalf asks Claude to read the session and pick up where it left off. The original session stays in your session list, unchanged.

> * A thread belongs to the one project that started it. You can't move or copy a thread to another project, or move it out to stand alone. [**Continue in project**](#start-from-an-existing-cloud-session) goes the other way only: it brings a cloud session's work into a project. You can't merge two projects into one.

