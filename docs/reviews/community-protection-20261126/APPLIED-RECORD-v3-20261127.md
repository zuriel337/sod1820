# רשומת החלה: SQL הגנת הקהילה v3 (הוחל בבסיס החי ב־27.11.2026). אין להחיל שוב.

**מצב: APPLIED + VERIFIED.** המסמך הוא הראיה הקנונית. הקבצים `supabase/proposed/20261126200000_community_net_blocks_PROPOSAL.sql` ו־`..._ROLLBACK.sql` בעץ הזה הם **בדיוק** הקבצים שהוחלו (לא נערכו בשום שלב, כדי לשמור על ההאש), ושם "proposed" נשאר היסטורי.

| פריט | ערך |
|---|---|
| מסד | `linswmnnkjxvweumprav` |
| דרך ההחלה | `apply_migration`, טרנזקציה אחת, שם `community_net_blocks_v3_20261126200000` |
| אישור | ZURIEL, 27.11.2026, לקומיט `9ee38011c1190f4d4a907c625d87640b60063c26` ולהאש PROPOSAL |
| PROPOSAL sha256 | `c3518b8e7d3cd33dcf35e65481af69e1eeef18db8a4513e4c1b56cf028edf67e` (אומת מול `git show 9ee38011c:` לפני ההחלה) |
| ROLLBACK sha256 | `d1be4fe2e2041f8d6865e8fd2cf9c7084b3e5d6b731bca90fba886df71295bb1` (לא הורץ) |
| גרסאות קודמות | v1 `31194d25…b246` ו־v2 `f36d299c…f901`: לא הוחלו מעולם |
| סדר | D3b, D4, D5 הוחלו ואומתו לפני כן (md5 prosrc של `add_contribution` לפני: `abbcf299635c0a8462c07274c10a9e4f`) |

## ראיות (קריאה מהמסד החי, לפני ואחרי)
| פונקציה | md5(prosrc) לפני | md5(prosrc) אחרי |
|---|---|---|
| `add_contribution` | `abbcf299635c0a8462c07274c10a9e4f` (גוף D5) | `ddcdc0df8bf48de68cc862ed1c3c5333` (D5 + הגנת קהילה; `rc_unique_contributor_for_user_v1` ו־`community_net_ref_v1` שניהם בגוף) |
| `add_guest_community_message` | `4eb11358227e6b3d8d77b933e076b28a` | `22f7e534c8468bd44563a1558a7df7fd` |
| `toggle_contribution_reaction` | `96af69da3d9d8b1b82113248b09e97fa` | `f5e708e23bd18455471d4f78695ade8f` |

- ACL ו־`search_path` של שלוש הפונקציות: ללא שינוי (`add_contribution` = PUBLIC, postgres, anon, authenticated; השתיים האחרות = postgres, anon, authenticated; `search_path` = `public`, `public`, `""`).
- טריגרים על `research_contributions`: 6 לפני ואחרי (בהם `trg_rc_notify`, `trg_community_thread_bump_v1`, `trg_00_rc_resolve_author_contributor`).
- אחרי: `permanent_enabled=false`, 0 חסימות, 0 אירועים, שורת מפתח אחת. anon: אין הרשאה על `community_net_ref_v1`, על `community_guest_block_from_message_v1` ועל הטבלאות; authenticated: אין גישה לטבלאות וליעזרים הפנימיים, יש הרשאת ביצוע לפונקציות הצוות בלבד (הן בודקות `community_can_moderate_guests()`).
- 46 שורות IP גולמיות ב־`anon_contrib_log` נשארו (מחיקה: החלטה נפרדת). לא נמחק נתון היסטורי.
- בדיקות לפני האישור: `test/community-net-blocks-20261126-realpg.sh`, 76 בדיקות על Postgres אמיתי מבודד, ו־CI ירוק (run 45916472929 על `9ee38011c`).

## ציונים
- לא הופעלה אף חסימה בפועל; חסימה לצמיתות כבויה עד אימות זהות הבעלים ואישור מפורש.
- השינוי בצד הלקוח (הפאנל והפעולות על ההודעה) כבר ב־`main` מ־#1578; הוא נראה לצוות רק מרגע ההחלה הזו.
- החזרה, אם תידרש: `..._ROLLBACK.sql` (מחזיר את שלוש הפונקציות לגוף D5 המדויק ושומר כל טבלה ושורה), באישור נפרד.

**השפעה על התיעוד הקנוני:** הקבצים והרשומה הזו הם המקור לגרסה המוחלת.
