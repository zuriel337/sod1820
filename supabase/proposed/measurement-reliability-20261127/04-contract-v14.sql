-- PROPOSAL ONLY - NOT APPLIED (S1, 27.11.2026). Needs ZURIEL's explicit approval of the contract text (CONTRACT_V14.md) AND this exact file.
-- Same pattern as the v13 insertion of 27.11.2026: in ONE transaction retire the active v13 and insert v14 = v13 + the amendment; the rule guard's own
-- metadata key is not copied. NOT RUN LOCALLY (the rule guard trigger is not part of the local harness): the pattern is the one that succeeded for v13.
-- Guard: the active v13 description must have the md5 read on 27.11.2026.
\set ON_ERROR_STOP on
begin;
  do $$
  begin
    if (select count(*) from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and is_active) <> 1 then raise exception 'expected exactly one active traffic_intelligence_law'; end if;
    if (select md5(description) from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and is_active and rule_version=13) is distinct from 'e7ad8ffbe9e4a612f53fa1d8c3799693' then
      raise exception 'traffic_intelligence_law v13 changed since the 27.11.2026 read; re-read before applying'; end if;
    if exists (select 1 from public.nodes where type='rule' and rule_id='traffic_intelligence_law' and rule_version=14) then raise exception 'v14 already exists'; end if;
  end $$;
  update public.nodes set is_active=false where type='rule' and rule_id='traffic_intelligence_law' and rule_version=13 and is_active;
  insert into public.nodes(type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight)
  select n.type,n.label,
    n.description || E'\n\n' || $amend$MEASUREMENT IDENTITY LAYERS (27.11.2026). Four things are never merged, counted as one another or published as one another:
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
and is never a reason to remove it or its family.$amend$,
    (n.metadata - 'rule_guard') || jsonb_build_object('amended','27.11.2026 measurement reliability (ZURIEL)','supersedes','v13'),
    true,n.rule_id,14,n.depends_on,13,n.weight
  from public.nodes n where n.type='rule' and n.rule_id='traffic_intelligence_law' and n.rule_version=13;
commit;
