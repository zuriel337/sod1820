# Community editing, saved messages and thread follow

ZURIEL selected option 2, then explicitly continued with the recommended saved
messages and thread following. The source base is the published formatting
commit `3d97c7c28f98d074b7512bfe03211f8363c9ca92`; main remains unchanged.

The visual editor supports bold, underline, two existing semantic colors,
clear formatting, emoji and exact selected-text quotation. New formatting is
versioned text in the existing body, rendered only through safe React/DOM
nodes. Legacy text is unchanged. URLs remain one LTR anchor across formatting
runs. Guest posts still require an account; guest repeated likes remain open.

The per-message personal menu reuses PersonalSaveButton and ResearchProvider:
one private library item of existing contribution identity, with a relative
public reading link. Saving does not imply following. The separated Follow
section uses the existing WatchButton/controller, notification preferences and
the existing `thread:<root UUID>` namespace. Its reader mounts on explicit
opening. Guests receive the account entry; account verification is required.

Only the exact Community source/topic contract is added to the existing
verified personal worker. Other Follow additions, visitor assignments, channels,
model operations and unrelated shared settings remain as before.

Migration `20261104135237_community_thread_follow_notifications.sql` was applied
with baseline hash guards. It extends existing watch_toggle and the existing
contribution trigger, calling canonical notify_topic with its existing partial
UNIQUE dedupe index. Direct parent authors share the same recipient/event key.
Approved public ancestry, mute, actor exclusion and recipient deduplication are
enforced. Ordinary edits and historical imports do not send thread updates.
Activation is stamped at `2026-11-04 13:52:37.850713+00`, preventing historical
approval replay. The existing trigger also handles subsequent approval.
Grants are unchanged; no new table, identity, inbox or delivery channel exists.

Observed function hashes after application:

- watch_toggle: `807aaccbb3b7f8d8ed412eb0b3dbea3e`
- notify_on_contribution: `eef6d744bbb6067655aa1f49f3ba8898`

Validation: 88 focused tests pass. The unchanged Legacy/One Tree build gates
pass. The disposable Postgres runner passes 18 assertions, including nested
replies, approval, replay/deduplication, nonpublic ancestry, mute, actor exclusion,
unfollow, preserved old topics/channels and guest denial. Four controlled
full-client browser cases at 390/1440 verify private save with server receipt and
reload, follow/reload/unfollow, failed-follow rollback, and guest account entry.
Four further cases verify formatted text/image publication, reload, owned edit,
exact quote, emoji, safe pasted text and a URL split by formatting.

No real account post, test follow, saved item or notification was inserted into
the product database for verification. Authenticated browser coverage uses
synthetic Auth/API data; SQL behavior runs in disposable Postgres. Security
advisors were read before and after the migration. Exact final release/browser
receipts are recorded in the passive work log under
`COMMUNITY_SAVE_THREAD_FOLLOW_20261104`.

The source candidate advanced concurrently to
`082fcb20b4f8834639157842c7e6d57a60e127b8` with the separately requested
Calculator, Now, header/brand and public metadata integrations. The rejected
compare-and-swap preserved that newer head. Its 103 nonoverlapping files are
retained byte-for-byte as the final integration base; the Community delta does
not edit their scopes. A fresh artifact and 117 combined unit cases pass, and
the eight controlled Community browser cases pass again on that combined build.
