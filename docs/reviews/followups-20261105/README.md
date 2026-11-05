# Follow-ups 5.11.2026 — ZURIEL's list (central session)

Branch `claude/followups-20261105`, stacked on #1205 (footer), #1206 (entrance intro), #1207 (home title). Code only; nothing deployed.

| Item | Result |
|---|---|
| Golden 1237 default method = מסתתר | Root cause reproduced offline with the real `fn_method_profile` rows: the drawer target carried no `method`, and the profile response (closure over a stale `selectedMethodKey`) fell back to `profile[0]`. Fix: the Golden entry passes `method`+`resultValue` in the drawer target; the profile resolve reads the latest requested method from a ref. Probe before: `אותיות אחרי` pressed; after: `מסתתר 1237` pressed. |
| Footer newsletter card | Replaced by a compact strip (`NewsletterSignup2029 variant="compact"`): one line on desktop, email control + "עדכונים בוואטסאפ" + privacy. On Home only the WhatsApp entry is added (Home keeps its own updates section). Screenshot: `footer-updates-strip-1440.png`. |
| WhatsApp group | "עדכונים בוואטסאפ" = joining the group (same verified Legacy URL, new tab, `noopener`). The internal join counter is unchanged and is not the label. |
| Button/text gap | Design Contract V2 §13 + `.sod29-action-row` primitive + `--s29-action-gap` token + legacy safety net; `test/action-adjacency-2029.test.mjs` fails when the primitive is missing or a `.sod29-action` button is followed by a bare link. |
| Beit Midrash | Registry entry (closed, alt books), footer "research" group, menu ("בית המדרש · בבנייה" while the router keeps it closed; a link for admins/when opened). No dedicated icon exists in the approved family — it reuses the books glyph; a dedicated icon is a visual-owner decision. |
| Gematria calculator | Already in the menu group "גילוי וכלים" (desktop and mobile); verified in a browser. Added to the footer too. |
| Number page → calculator | Permanent "← חזרה למחשבון גימטריה" link at the top of the Number page. |

## Not done
- `entry-learn` synthetic admin fixture: needs an authenticated-session fixture under the read-only egress guard, which cannot be validated from this sandbox (no production read access). Product visibility of "כאן" is unchanged (admin-only).
- Bennett ×2 scenarios remain red.
- New node tests are not wired into CI (gate change).
