# Measurement package: adversarial review of the worker admission

What is reviewed: the admission of `track_visit`, page engagement and the action family in `public-reading-deploy/transport.js`
as the preserved commit `139f16214` left it (a window of the public site plus a per-window budget), and the one change this package adds (a budget for engagement).
The worker is a **client-side transport policy** running in the visitor's own browser: it narrows what the application can send, it is not a server boundary.
`track_visit` and `ingest_event` stay callable by anyone who holds the public anon key (`def005` keeps the telemetry sinks callable), so nothing below can stop a person who talks to the database directly.
Every claim has a test in `test/measurement-transport-hardening-2029.test.mjs` (T) or in the older worker tests (O).

## The three questions

**1. Can one client exhaust the budget of another?**
No, by identity. A budget is keyed by `event.clientId`, which the browser assigns to each document; a page cannot choose another document's id. A window that spends its 120 / 240 / 60 leaves every other window, and the other two families of the same window, untouched (T: "N per window per 10 minutes… another window is untouched", "the three families have separate budgets").
What is shared is the size of the table. Each family keeps at most 500 live windows; a window already in the table keeps its budget, and a new one is refused while 500 are live (T: "the budget map is bounded at 500 live windows and ages out"). One browser can fill it only with 500 distinct documents inside 10 minutes (500 page loads, or 500 same-origin frames opened by a hostile script). The effect is **lost measurement in that browser for up to 10 minutes**; no write is amplified, no other browser is affected (the table is per worker instance, that is per browser profile).

**2. Can an anonymous caller write for a route it is not on?**
Yes, from inside a window of the public site: any route label that passes the shape check, within the budget (T: "residual risk, pinned"). The shape check still refuses a raw slug, a query, an account or admin path, a double slash and free text, and a visitor token outside 8 to 64 characters of `[0-9a-z-]`.
Why this is accepted and not fixed here:
- The only address the worker can see is `Client.url`, the address the document was **created** with. It does not follow `history.pushState`, which is the whole reason in-app navigation was refused (found 13.11.2026). Binding to it again brings the fault back.
- Any other route information comes from the page, which is the party the worker constrains.
- The worker never was a boundary against deliberate pollution (see the first paragraph); it protects against accidents and loops, which the shape and the budget still do.
- Hard-load Web Vitals keep the strict binding: their route **is** the creation address, so a vital for another route is refused (T: "hard-load Web Vitals keep the creation-address binding").
A later tightening might use the request's referrer if a browser exposes the live address there; that was **not verified** and behaves differently by browser and referrer policy, so it is not proposed as a fix.

**3. Is the Map bounded?**
Yes. Three maps (visits, engagement, actions) plus the older one for Web Vitals; each holds at most 500 records of `{ at, count }`, every request first drops the records older than 10 minutes (30 minutes for Web Vitals), a refused request creates no record, and an invalid body is refused **before** the table is touched (T: "a refused request never spends a budget"). The purge is linear in at most 500 entries.

## Findings

| # | Finding | Status |
|---|---|---|
| F1 | **Engagement had no budget.** It was bound to a public-site window only (the preserved commit's message says "visits, engagement and actions", the code limited visits and actions). A script in a window could write unlimited engagement rows. | **Fixed here**: 240 per window per 10 minutes (one flush per admitted page view, at most 120, plus the pagehide flush, with room). T: two cases fail on the previous `transport.js`. |
| F2 | The budgets live in the worker's memory. A browser stops an idle worker after a short time and starts it empty, so every budget starts again. The effective cap is "per worker lifetime and per 10 minutes". | **Residual**, pinned by T ("a worker restart starts every budget again"). Enough for accidents and loops; not for an adversary. |
| F3 | A window may write a route other than its own (question 2). | **Residual**, pinned by T. |
| F4 | `p_visitor` is any token of 8 to 64 characters: a client can invent visitor ids and inflate unique visitors. | **Residual**, same as direct database access; no change. |
| F5 | `p_is_bot` is accepted from the client for visits. The database marks bots and keeps them, so a client can only mark its own rows. | No change. |
| F6 | 120 visits per window per 10 minutes is one page view every 5 seconds. A person or a script that navigates faster loses the excess silently (the application ignores the refusal; the console shows a failed request). | Accepted; the number is the preserved commit's. |
| F7 | A window is identified by its client id; each hard refresh is a **new** window with a new budget. A reload loop therefore gets a new budget each time, and only the table bound (500) limits it. | Accepted; covered by the 500-window bound. |
| F8 | The engagement beacon sent at `pagehide` needs the worker to still find the window (`clients.get`). This was already so before the package and is not changed. | Known, not changed. |

Not reviewed here: the other admissions in the file (community, newsletter, Meta relay, storage). They are not part of this package.
