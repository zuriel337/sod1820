# Account merge with consent — Phase 1 execution gate

**Owner request (2026-11-05):** Proceed with an opt-in verification-and-merge workflow for all users. In Torah Tamima's specific case, the account created on 2026-11-04 remains the primary/canonical destination.

**Current status:** Phase 1 security/architecture plan on isolated branch only. No product/Auth/DB data changes, no production release, no credentials or identity linking changed.

## Existing foundation / constraints
- Current canonical identity stack: `persons.account_user_id`, `identity_edges`, `person_foundation_contract_law v6`, `identity_architecture_law`, existing `link_identity` RPC. Identity links preserve provenance and do not imply account merge.
- Existing verified historical OpenWeb links are evidence for Community attribution only; they do not grant control of a separate Supabase Auth user.
- Two live Auth users cannot be assumed to be merged by Supabase's identity-link API. Official Supabase docs currently describe manual linking of an OAuth identity to a signed-in user; if an identity is already linked to another user, linking fails. This API must not be treated as a general merge of two existing user rows. Source: https://supabase.com/docs/guides/auth/auth-identity-linking
- No account candidate may be surfaced to a user using display-name/avatar/IP/device fingerprint matching. No email enumeration. Do not disclose whether another account exists until proof/eligibility conditions are met.

## Phase 1 UX and security proposal
### Entry points
- On login, show a merge suggestion only if a server-side, exact, non-probabilistic eligibility signal exists and a private server response indicates the current account has an actionable claim. The response must not reveal candidate account ID, email, provider or profile fields.
- Otherwise, provide a user-initiated **“יש לי חשבון נוסף”** entry in Account/Personal Area. This is the default and safe path for accounts with different email addresses.
- Copy: **“נראה שאולי יש לך חשבון נוסף. אפשר לבדוק אם ניתן לאחד את החשבונות. האיחוד לא יבוצע ללא אימות ואישור שלך.”**
- Buttons: “בדיקת איחוד”, “לא עכשיו”. No push/email/SMS notifications; no repeated blocking prompt. Respect existing consent/attention law and user dismiss state.

### Proof-of-control sequence
1. Current session is authenticated; require recent re-authentication for initiating.
2. Server creates short-lived, single-use merge-intent nonce bound to current auth user, session context, expiry, CSRF, and purpose; never client-chosen target ID.
3. User explicitly switches to or authenticates the second account through its actual OAuth/email/OTP provider. Do not silently sign out and do not store a raw token/credential in localStorage.
4. Prove control of both Auth users in isolated server flow. The proof must be fresh, provider-authenticated, bound to the same intent, and not reusable. One current session alone cannot prove the second account.
5. Only after both proofs may server return limited preview: names/photos only if permitted, counts for messages/replies/community history/media/research/saved/follows/credits/subscriptions/person data; no sensitive content disclosure. Confirm destination; Torah Tamima destination defaults to 2026-11-04 account because owner explicitly chose it. All others choose destination.
6. Require final explicit confirmation; cancel/reject safely discards intent. No background merge, no push, no partial merge.

### Backend/migration gate (not Phase 1 UI)
- Must be a reviewed server-side atomic/idempotent operation; lock both user IDs in stable order; revalidate auth and proofs inside transaction; RLS/ACL fail closed; write audit/decision ledger and rollback record.
- Do not SQL-delete/update `auth.users` ad hoc. Do not move Auth identity/provider until supported procedure has been verified with Supabase/Auth version and collision/recovery behavior.
- Inventory all foreign keys, ownership columns, Storage objects, `persons`, `identity_edges`, `contributors`, `research_contributions`, community replies, profile/avatar preferences, credit ledger, subscriptions/billing, push prefs/tokens, follows/notifications, saved items, Journey/Raziel, consent and privacy/erasure exports.
- Credits: append-only ledger; idempotent transfer/reconciliation, never duplicate balance or grants. Subscriptions/payment identities are never silently moved; require separate billing provider policy.
- Preserve original authored timestamps, moderation states, source provenance, deletion requests, privacy scope and user-selected display name/photo. Pending content remains pending.
- Revoke/refresh both sessions safely, notify only within explicitly consented security messaging (no marketing push), and provide rollback/support path.
- Create a durable canonical alias/redirect only after the merge succeeds. Distinguish the existing “היסטוריה אוחדה” seal from the future “חשבונות אוחדו” status.

## Phase 1 deliverables
1. Read active law v6 + current auth entry/sign-in components and establish a non-invasive UI entry.
2. Implement only the safe opt-in entry/intent UX and state transitions in isolated preview, with no candidate enumeration or data mutation.
3. Add server proof-intent endpoint/RPC only after owner-specific contract and security review; no merge operation in this phase.
4. Tests: no enumeration; same-name strangers; old/new login; cancel; stale/replayed nonce; account switching; current account still usable; guest; no push/email; RTL/mobile; accessibility; no private fields leak.
5. Separate Phase 2 approval required for the actual account migration and Auth consolidation.

## Specific Torah Tamima behavior
- Canonical primary target: account created 2026-11-04 (already explicitly chosen).
- The previous Google account remains separate until its owner signs into both accounts and accepts a preview.
- Existing OpenWeb history link stays as-is; do not reinterpret it as Auth proof.
- When old account login occurs, do not automatically transfer sessions, permissions, Auth providers, credit balance, email, or subscription.

## Stop/release rules
- Branch: `gpt/account-merge-consent-phase1-20261105`, base `03e74edfbeaeb7f1d191fb87dee9f8a3854c73ed`.
- No main merge, deploy, SQL write, auth admin action, RLS change, push setting change, or deletion.
- CI/Preview must be independently checked before any phase 1 UI release; Phase 2 requires a fresh explicit approval after design, threat model, migration plan, and rollback proof.
