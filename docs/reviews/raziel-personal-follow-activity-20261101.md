# Raziel personal Follow/activity consumer — review receipt

Status: implementation complete on an isolated branch; internal review only; not deployed.

Task: `RAZIEL_PERSONAL_FOLLOW_ACTIVITY_CONSUMER`

Base SHA: `7649e46c199ade990fd75ea8400f60f93522ef82`

Branch: `gpt/2029-raziel-personal-follow-activity-20261101`

## Delivered behavior

`personal_continue` now reads three bounded owner-controlled sources after the required personal research snapshot succeeds:

- `notification_prefs(topics, updated_at)`: at most one row and 20 distinct explicit topics.
- `subscribe_events(topic, source, action, created_at)`: at most 100 recent rows, used only to attach the source and time of an explicit `follow` action.
- `user_activity(kind, ref, title, created_at)`: at most 12 `post` rows from the last 30 days.

Every request uses the already verified caller JWT, an explicit `user_id=eq.<verified uid>` filter and existing owner RLS. No service role is used. No table, policy, RPC, migration or write path was added.

## Meaning and failure states

Follow and content activity remain separate inputs. Activity is not converted into a Follow, preference, interest, recommendation, score or audience membership. Absence of activity is not interpreted as lack of interest.

The projection preserves `measured`, `measured_empty`, `missing`, `access_filtered` and `failed`. A `401` on any of the three reads is treated as an identity change/revocation: the personal continuation fails closed and discards every partially read signal. A source-level `403` or operational failure remains visible as a bounded state and does not invent data.

Operational `network` spans contain only the source name, canonical outcome, latency and read-only replay classification. They exclude the caller JWT, UID, selected topics, activity items and raw payloads. Consumer states still retain the more specific `failed` label.

## Verification

- Phase L, Phase M cross-surface, focused Follow/activity and quota/trace suites: 51/51 passed.
- The user released a narrowly bounded Phase M test expectation after the initial run exposed the old two-RPC-only assertion. That assertion now verifies two RPCs plus the three authorized owner GETs; no other Phase M logic changed.
- `git diff --check`: passed.

## Release boundary

No database or RLS changes. No Supabase function deployment. No Preview or Production deployment. No merge or push to `main`.
