# One upper counter and public lower conversation name

The user requested that the message counter appear only beside the upper `שיחה` heading. The repeated lower counter and its unused CSS are removed. The lower conversation section and its jump link now say `ממשיכים לשוחח`, with `בחזרה לשיחה` for the return link and a short `פתיחת השיחה` link in protected Preview. The canonical source URL, conversation ID, launcher/SSO boundaries, lazy activation and existing old-chat placement are unchanged.

The upper `134.9K` remains the previously verified OpenWeb snapshot. **It does not currently update automatically when new messages are posted.** No local increment, fake live total, new counter owner, DB/RLS/function deployment or external polling was added. This limitation was stated directly to the user; future automatic counting requires an authoritative server/source reader under the existing owners.

Existing public browser checks are updated for the single upper count and the new lower heading, retaining the touch/keyboard disclosure, three themes, 320/360/390/1440, pagination/search/reload, error/retry and old-chat navigation checks. No implementation-mirroring tests were added for this presentation-only change. Build:2029, integrated build, graph/lazy, isolation, hardening and Legacy lock are checked; exact outcomes and protected Preview are recorded in the task receipt.

The parallel request about Emili/Esther login dates is read-only. Their known legacy contributors remain unlinked and have no verified Person/account bridge. Their current site email addresses are required before looking up last sign-in; no names are treated as proof, and no account is linked or modified.

Branch `gpt/community-auth-publish-media-20261031`, base `f5ee28a2e09ee6f901f00eefcff434c27cf58495`. BEFORE `ce652d6b-a835-40b0-b359-81e03682f924`. No main merge, Production/Edge deployment, migration/RLS change or live product test writes.
