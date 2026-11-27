# traffic_intelligence_law: תוספת מוצעת לגרסה 14 (27.11.2026). לא מוחלת.

OWNER-ROUTING: EXTEND_EXISTING traffic_intelligence_law

**מצב: טקסט מוצע.** ההחלה היא `04-contract-v14.sql` (retire v13 והכנסת v14 בטרנזקציה אחת, באותו דפוס שבו הוכנסה v13), ודורשת אישור נפרד של ZURIEL להחלת החוזה ולקומיט המדויק. התוספת היא `EXTEND_EXISTING`: אינה משנה סעיף קיים אלא מוסיפה.

הנוסח (אנגלית, כבשאר החוק):

```
MEASUREMENT IDENTITY LAYERS (27.11.2026). Four things are never merged, counted as one another or published as one another:
(1) SESSION: a run of events closed by 30 minutes of inactivity. It is not a person. (2) VISITOR: one browser identity (sod_id). It is the unit of every
privacy and popularity floor. (3) IDENTIFIED PERSON: a person_id linked to an account. It is never published, never counted as "people", never a floor unit.
(4) ACTIVITY: events and item opens. A public number named "people" or "visitors" still follows PUBLIC PRESENCE TRUTH.

INTENSITY IS NOT EVIDENCE OF AUTOMATION. Volume, speed, hours of the day, number of items, or number of sessions of one visitor MUST NOT classify a session or
visitor as a bot or as suspected. Only positive bot evidence may (the raw bot flag, or a documented positive signal such as the single-view rule). A heavy visitor
may be shown as a "heavy visitor" for information only. No visitor is blocked, throttled or deleted on the basis of intensity, and no data is deleted or rewritten.

ENGAGEMENT VERSION 2. engaged_ms counts only after a real activity signal (scroll, pointer, key, touch) and only inside the idle window after it. There is NO
automatic credit for opening a page. engagement_version 2 is sent with every event; rows of version 1 are kept as written and are never rewritten.
Dwell evidence for the human class ("dwell>=15s") requires, for engagement events at or after the cutover date, proof of activity: scrolling, an engaged_ms above
the idle window, or a version-2 event with engaged_ms above zero. A session whose only evidence is the automatic credit is "unknown", never "bot".

FLOOR UNIT. The popularity and privacy floors (10 events and 5) count distinct visitors, not sessions. The thresholds are unchanged.

OPEN ACTIVITY TIER. A public statistics surface MAY list every public canonical item that was opened at least once, from verified human sessions only, when ALL hold:
(1) the item matches a canonical public row (never address text); (2) the window is a set of complete Asia/Jerusalem days, today excluded; (3) the window holds at least
25 distinct human visitors; (4) only the item reference and its open count are published: no session or visitor count, no time, no device, country or source, no
per-session linking; (5) order is fixed and is not by count or recency among items below the popularity floor; (6) each list is capped and the remainder is a count;
(7) sessions not classified human appear as totals only; machines appear apart from people. Popularity (the floor above) and activity (this tier) are shown apart.

PUBLIC BY DEFAULT, PERSONAL SEARCH MASKED (ZURIEL 27.11.2026). The statistics are open to the public by default and show the breadth of activity on the site: opens
of public pages, numbers, posts and ciphers, and the use of the research tools. An action whose content is a person's own search (a typed expression, name, number or
query, or a search result that could reveal it) is shown only in aggregate, with the content replaced by a fixed mask: the same number of asterisks for every item,
whatever its length or content. The system records WHICH action was performed and WHETHER it succeeded (MEASURED ACTION TRIAD), never what was typed. No identity,
personal expression or search result that could reveal either is published, listed, ranked, or recoverable by comparing windows or snapshots. Personal search text is
not stored in analytics. This clause adds no mechanism: it limits what the existing readers may show.

SUPPORT TEXT IS NOT ANALYTICS. What a person types in a report, message or search is never written into events. Issue reports are stored in the authorized support
store (administrator-read); analytics may count that a report exists, never what it says.

MEASURED ACTION TRIAD. For every principal action the system separates CLICK (pressed), START (operation begun), SUCCESS and FAILURE, using the closed event families
only (tokens, booleans and bounded integers). An action whose truth is held in a domain table (registration, sign-in, message, reaction, follow) is counted from that
table by this law's readers, aggregated and without identity, instead of by a second event.

REACTIONS POLICY UNCHANGED. This law counts reactions (likes, dislikes) only as aggregate counts read from the domain table. It does not change the existing reactions
policy (who may react, whether a reaction repeats, how it is shown) and it never creates, changes or removes a reaction.

PRESERVED FUTURE CAPABILITIES. Approved capabilities that are not yet active (stories, the 2029 journey, and their closed measurement families) stay preserved and
allow-listed; their emitters are built when the capability launches. The silence of a preserved capability is shown as "preserved, not active", never as a failure,
and is never a reason to remove it or its family.
```
