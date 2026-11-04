# Renewal notice and direct global share

Date: 2026-11-03. Branch: `gpt/2029-url-community-20261103`.
Base: `adce61a68c7f0ba4891faf65b5fc9dcab68b1887`.
Status: **IMPLEMENTED / FOCUSED_UNIT_TESTED**. Browser and actual-service acceptance remain open.

The root integrator authorized the System Frame/ribbon scope and the bounded ContactGateway/IssueReport source-context expansion. No transport policy, server, database, mail, auth or deployment changes are included.

## Header and existing contact gateway

The static notice appears on every surface using SystemFrame2029:

> האתר מתחדש ונבנה בהדרגה. נתקלתם בתקלה או שיש לכם רעיון לשיפור? עזרו לנו לבנות אותו יחד.

The single `דיווח או הצעה ←` button opens the existing on-demand ContactGateway through the existing ISSUE transient. The ribbon does not rotate, animate, consume feed rows or own a timer. Its CSS uses existing theme/font tokens, normal wrapping, an intrinsic height and a 44px contact target. The mobile layout has one flexible column; no line clamp or ellipsis hides the notice.

Opening the gateway snapshots the current URL through `contactSourceHref`. That scoped helper accepts only same-origin HTTP(S) locations, retaining pathname and explicitly validated reading selectors. It drops all hashes, unknown/repeated query keys, free text, return links, ref values and authentication/mail/access parameters. Auth, mail, payment and personal routes retain pathname only. Optional `source_href` remains metadata separate from the user's text. Existing callers that omit it retain their original context shape and path-only data behavior.

In PUBLIC_READING_RELEASE, contact/idea and issue submissions are explicitly unavailable. Their handlers return before send/track or success-state changes; the form says `השליחה אינה זמינה בפריוויו הזה` and permits copying the draft through the existing clipboard helper. No server restriction is relaxed. Locked public visitors cannot mount the private hint status reader or hint submission widget. Normal builds retain the existing ContactGateway send and IssueReport tracking emitters.

## Global dock and preserved owners

Only the global dock's final More button becomes `שיתוף`. It opens the existing MORE transient with a bounded `shareOnly` payload and the existing ShareActions component with native, WhatsApp, Telegram, Facebook and copy channels. Native sharing remains conditional on browser support. No external share action executes when the panel opens.

The share target follows the current route, query and hash through the existing public URL utility. A stale canonical link for a different document cannot replace the current destination. Existing personal/auth/mail routes and claim/DM state are suppressed. Research tool dock actions, existing More/Tools callers, Now feed reader/subscription, unseen count and context remain in place. The existing shared public URL utility retains authority over additional route and parameter restrictions.

## Focused verification

```sh
node --test src/components/experience2029/contactSource2029.test.js src/components/experience2029/frameRenewalShare2029.test.js
```

Result: **10/10 passed**. The tests execute the changed form handlers with isolated hooks and explicit transport call counters. Both blocked contact modes and the issue form emit zero calls and never show success, even if invoked directly rather than through their disabled buttons. Ordinary-build tests verify the existing send/tracking paths, idempotent issue emission, optional safe source metadata and unchanged path-only default data. Other tests cover exact notice/CTA, private-widget suppression, stale-canonical navigation, private share suppression and direct ShareActions channel selection.

The four changed JSX files were parsed with Vite/Oxc. `git diff --check` passed. No browser run, full build, network submission or test message was performed.

## Integration acceptance still required

The root integrator must inspect 320px, 390px and desktop layouts in the existing Day/Night/Parchment presets, including sticky-header geometry, keyboard focus, the contact panel and the share choices. Browser native share/copy behavior and external channel destinations are not service-tested here. Contact submission remains deliberately held in the public reading preview; opening the form is not evidence of delivery. This change grants no write permission and makes no release or production assertion.
