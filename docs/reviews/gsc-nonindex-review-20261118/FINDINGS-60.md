# URL Inspection: all 60 answers (read 19.11.2026, ~00:05 UTC)

Source: `url-inspection-all-60.json` holds every answer, as Google returned it.
- Read from `net._http_response` (requests 47141–47143 and 47156–47157) with a read-only SELECT.
- No new call to Google was made.
- `pg_net.ttl` is 6 hours, so these rows would have expired at about 02:40 UTC.

Not decided here:
- Nothing changes the identity of `/number/נטע`.
- Nothing decides 404 or 410 for the old `/journey`. That address is Legacy; it is not the 2029 "מסע החיים".

## By Google's coverage state

| State (Google) | Count | Crawl times |
|---|---|---|
| Submitted and indexed | 26 | 2026-08-21 to 2026-11-18 |
| Duplicate: Google chose a different canonical | 5 | 2026-07-10 to 2026-10-16 |
| Alternate page with a proper canonical tag | 2 | 2026-07-11, 2026-09-22 |
| Crawled, currently not indexed | 5 | no crawl time given |
| URL unknown to Google | 16 | — |
| Blocked by robots.txt | 4 | 2026-08-11 to 2026-09-24 |
| Server error (5xx) | 1 | 2026-11-12 23:23 |
| Blocked: access forbidden (403) | 1 | 2026-08-20 17:52 |

## Declared canonical vs Google's choice

**Each of these pages declared itself as canonical, and Google chose another number page.** All five are number pages for a phrase, and all were crawled before 17.10:

| Page | Google chose | Crawled |
|---|---|---|
| `/number/אור בהיר` | `/number/אליהו` | 24.9 |
| `/number/אלהים שולט על הכל` | `/number/מספר שמות יהוה בכל התורה` | 16.10 |
| `/number/אפר פרה אדומה` | `/number/אליהו` | 12.7 |
| `/number/נטע` | `/number/2` | 18.9 |
| `/number/צֹמאה נפשי לאלהים לאל חי` | `/number/5` | 10.7 |

**At the time of the crawl, each of these pages declared the home page `/` as canonical:**
- `/101-גדולי-עולם-…` (22.9): Google also chose `/`.
- `/number/כלי שרת` (11.7): Google chose none.
- `/codes/וישבתביום-5541` (9.9): Google chose the page itself, and it is indexed.

These crawls are old (July–September). Whether the pages still declare `/` today was **not checked** in this pass.

## Single cases

**`/archive` (5xx).** Today it answers on purpose with 503, `Retry-After: 2592000` (30 days), `noindex` and "זרם המציאות בבנייה". This is the closed-area rule, not a fault; Google reports it as a server error.

**`/number/27010` (403, crawled 20.8).** This predates the eligibility rule of 7.9. Its cause was not proven.

**robots.txt.** `/journey` (Legacy), `/login`, `/profile` and `/research` are disallowed, as intended.

**Indexed without a declared canonical.** `/heichal` (crawled 17.9) is indexed, and Google reported no declared canonical for it.

**Unknown to Google.** These are mostly test or private addresses: big numbers outside the sitemap, `/2029/me`, `/lab`, `/galaxy`, `/reveal`, `/unsubscribe` and similar.
