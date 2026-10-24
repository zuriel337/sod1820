import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  getNameMulti,
  getNameProtocol,
  getOrCreateMyPersonId,
  listFamily,
  supabase,
  upsertFamilyMember,
  upsertFamilyRelation,
  upsertSelfProfile,
} from "../lib/supabase.js";
import { track } from "../lib/tracking.js";
import {
  createSupabasePersonalDateCrossProvider,
  gregorianToHebrewDateRepresentation,
  runPersonalDateResearch,
} from "../lib/research/personalDateResearch.js";
import { buildAccessDescriptor } from "../lib/research/researchPlanV2.js";
import {
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyFamilySelectionPatch,
  buildLifeJourneyPersonContext,
  lifeJourneySelectedMemberRefs,
  lifeJourneyViewFromContext,
} from "../lib/research/lifeJourneyPersonContext.js";
import CanonicalProgress from "./CanonicalProgress.jsx";
import SignatureResearchIcon from "./SignatureResearchIcon.jsx";
import "./person-journey.css";

const RELATIONS = Object.freeze([
  { id: "none", label: "קשר יוגדר אחר כך" },
  { id: "parent_of_me", label: "הורה שלי" },
  { id: "child_of_me", label: "ילד/ה שלי" },
]);

const clean = (value) => String(value || "").trim();
const metaObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const joinName = (first, last) => [clean(first), clean(last)].filter(Boolean).join(" ");
const MAX_FAMILY_RESEARCH_MEMBERS = 12;

export function personJourneyErrorMessage(error) {
  const candidates = [error?.message, error?.error, error?.details, error?.hint, error];
  const message = candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "";
  if (/preview_read_only/i.test(message)) return "התצוגה המקדימה פתוחה לקריאה בלבד. הנתונים הקיימים זמינים, אך שמירה חסומה.";
  if (message && message !== "[object Object]") return message;
  return "לא ניתן לטעון כרגע את מסע החיים. נסו לרענן את הדף.";
}

function researchSummary(nameResult, dateBundle, dateRepresentation) {
  const values = nameResult?.input?.components?.values || {};
  const parts = values?.parts && typeof values.parts === "object" ? values.parts : {};
  const crossValues = [...new Set((Array.isArray(dateBundle?.findings) ? dateBundle.findings : [])
    .filter((finding) => finding?.kind === "date_cross")
    .map((finding) => Number(finding?.subject?.value))
    .filter(Number.isSafeInteger))];

  return Object.freeze({
    fullValue: Number.isSafeInteger(Number(values.full)) ? Number(values.full) : null,
    partValues: Object.entries(parts)
      .map(([label, value]) => ({ label, value: Number(value) }))
      .filter((item) => Number.isSafeInteger(item.value)),
    hebrewDate: dateRepresentation?.hebrew?.pretty || null,
    crossValues,
    tracksWithResults: Number(nameResult?.combo?.tracks_with_results ?? nameResult?.tracks_with_results ?? 0) || 0,
  });
}

function memberResearchProfile(member) {
  const meta = metaObject(member?.meta);
  const pieces = clean(member?.name).split(/\s+/).filter(Boolean);
  const first = clean(meta.first_name) || pieces.shift() || "";
  const last = clean(meta.surname) || pieces.join(" ");
  return Object.freeze({
    first,
    last,
    fullName: clean(member?.name) || joinName(first, last),
    birthdate: clean(meta.birthdate_iso),
  });
}

function validIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value));
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() + 1 !== Number(month)
    || date.getUTCDate() !== Number(day)) return null;
  return Object.freeze({ iso: `${year}-${month}-${day}`, display: `${day}.${month}.${year}` });
}

function familyBirthTimeline(members, selectedRefs) {
  const selected = new Set(selectedRefs.map(clean).filter(Boolean));
  return members.flatMap(member => {
    const memberRef = clean(member?.source_ref);
    if (!selected.has(memberRef)) return [];
    const profile = memberResearchProfile(member);
    const date = validIsoDate(profile.birthdate);
    if (!date) return [];
    let hebrewDate = null;
    try {
      hebrewDate = gregorianToHebrewDateRepresentation(date.iso)?.hebrew?.pretty || null;
    } catch { /* An invalid historical value stays absent instead of inventing a date. */ }
    return [Object.freeze({
      id: `${memberRef}:birth`,
      memberRef,
      name: profile.fullName || "אדם ללא שם",
      dateIso: date.iso,
      dateDisplay: date.display,
      hebrewDate,
    })];
  }).sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.name.localeCompare(b.name, "he"));
}

function familyResearchSummary(nameDocument, dateBundle, dateRepresentation) {
  const crossValues = [...new Set((Array.isArray(dateBundle?.findings) ? dateBundle.findings : [])
    .filter(finding => finding?.kind === "date_cross")
    .map(finding => Number(finding?.subject?.value))
    .filter(Number.isSafeInteger))];
  const rawFullValue = nameDocument?.input?.value;
  const fullValue = rawFullValue == null || rawFullValue === "" ? null : Number(rawFullValue);
  const agents = Array.isArray(nameDocument?.agents) ? nameDocument.agents : [];
  return Object.freeze({
    fullValue: Number.isSafeInteger(fullValue) ? fullValue : null,
    hebrewDate: dateRepresentation?.hebrew?.pretty || null,
    crossValues,
    tracksWithResults: agents.filter(agent => agent?.ran && agent?.ok && !agent?.empty).length,
    partial: !nameDocument,
  });
}

function sharedFamilyValues(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.state !== "ready") continue;
    const values = new Set([row.data?.fullValue, ...(row.data?.crossValues || [])]
      .filter(Number.isSafeInteger));
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value);
}

export default function PersonJourney({ variant = "legacy", CapabilitySurface = null }) {
  const { user, loading: authLoading } = useAuth();
  const research = useResearch();
  const [personId, setPersonId] = useState(null);
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState({ state: "idle", data: null, error: null });
  const [familyResearch, setFamilyResearch] = useState({ state: "idle", rows: [], sharedValues: [], error: null });

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBirthdate, setNewMemberBirthdate] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("none");

  const selfRef = personId ? `person:${personId}:self` : null;
  const persistedSelf = useMemo(
    () => selfRef ? members.find((member) => member.source_ref === selfRef) : null,
    [members, selfRef],
  );
  const familyMembers = useMemo(
    () => members.filter((member) => member.source_ref !== selfRef),
    [members, selfRef],
  );
  const selectedFamilyRefs = useMemo(() => {
    const availableRefs = new Set(members.map(member => clean(member.source_ref)));
    return lifeJourneySelectedMemberRefs(research.context, selfRef)
      .filter(ref => availableRefs.has(ref));
  }, [members, research.context, selfRef]);
  const selectedFamilyRefSet = useMemo(() => new Set(selectedFamilyRefs), [selectedFamilyRefs]);
  const birthTimeline = useMemo(
    () => familyBirthTimeline(members, selectedFamilyRefs),
    [members, selectedFamilyRefs],
  );
  const selectedWithoutBirthdate = useMemo(() => {
    const selected = new Set(selectedFamilyRefs);
    return members
      .filter(member => selected.has(clean(member.source_ref)) && !validIsoDate(memberResearchProfile(member).birthdate))
      .map(member => clean(member.name) || "אדם ללא שם");
  }, [members, selectedFamilyRefs]);
  const currentResearchSubjectId = research.context?.subject?.id || null;
  const currentLifeJourneyView = research.context?.dimensions?.lifeJourneyView || null;
  const currentLifeJourneyPersonRef = research.context?.dimensions?.lifeJourneyPersonRef || null;
  const currentReturnPersonRef = research.context?.returnTo?.subject?.id || null;

  const refresh = useCallback(async (pid) => {
    const data = await listFamily(pid);
    const nextMembers = Array.isArray(data?.members) ? data.members : [];
    setMembers(nextMembers);
    setRelations(Array.isArray(data?.relations) ? data.relations : []);

    const selfRow = nextMembers.find((member) => member.source_ref === `person:${pid}:self`);
    if (!selfRow) return;
    const meta = metaObject(selfRow.meta);
    const savedFirst = clean(meta.first_name);
    const savedSurname = clean(meta.surname);
    if (savedFirst || savedSurname) {
      setFirstName(savedFirst);
      setSurname(savedSurname);
    } else {
      const pieces = clean(selfRow.name).split(/\s+/).filter(Boolean);
      setFirstName(pieces.shift() || "");
      setSurname(pieces.join(" "));
    }
    setBirthdate(clean(meta.birthdate_iso));
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const pid = await getOrCreateMyPersonId();
        if (!alive) return;
        setPersonId(pid);
        await refresh(pid);
      } catch (error) {
        if (alive) setErr(personJourneyErrorMessage(error));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authLoading, refresh, user]);

  useEffect(() => {
    if (!selfRef || !user) return;
    if (variant === "2029") {
      if (lifeJourneyViewFromContext(research.context, selfRef)) return;
      research.setResearchContext?.(buildLifeJourneyPersonContext(selfRef, research.context));
      return;
    }
    const persistedName = clean(persistedSelf?.name);
    const personSubject = {
      id: selfRef,
      type: "person",
      label: persistedName || "מסע החיים שלי",
      href: "/research?tool=journey",
    };
    const selection = { entityId: selfRef, entityType: "person" };
    if (!currentResearchSubjectId) {
      research.setResearchContext?.({ subject: personSubject, selection, lens: "person" });
      return;
    }
    if (currentResearchSubjectId !== selfRef) {
      research.updateResearchContext?.({ selection, lens: "person" });
    }
    // Research Context is navigation state only; Person data remains in the private Ledger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLifeJourneyPersonRef, currentLifeJourneyView, currentResearchSubjectId,
    currentReturnPersonRef, persistedSelf?.name, selfRef, user?.id, variant]);

  const runInitialResearch = useCallback(async ({ first, last, date }) => {
    if (!user || !clean(first)) return null;
    setAnalysis({ state: "loading", data: null, error: null });
    try {
      const accessDescriptor = buildAccessDescriptor({
        user_ref: user.id,
        authenticated: true,
        verified_authority: { source: "supabase_auth", subject_verified: true },
      }, "authenticated_user");

      const dateRepresentation = date ? gregorianToHebrewDateRepresentation(date) : null;
      const crossProvider = createSupabasePersonalDateCrossProvider(supabase);
      const [nameResult, dateBundle] = await Promise.all([
        getNameMulti(clean(first), {
          surname: clean(last) || null,
          birthdate: null,
          question: null,
        }),
        date
          ? runPersonalDateResearch({
              name: clean(first),
              surname: clean(last) || null,
              birthdateIso: clean(date),
              crossProvider,
              accessDescriptor,
            })
          : Promise.resolve(null),
      ]);

      const data = researchSummary(nameResult, dateBundle, dateRepresentation);
      setAnalysis({ state: "ready", data, error: null });
      track("journey_person", null, "initial_research");
      return data;
    } catch (error) {
      const message = personJourneyErrorMessage(error);
      setAnalysis({ state: "error", data: null, error: message });
      return null;
    }
  }, [user]);

  const beginJourney = async () => {
    const first = clean(firstName);
    const last = clean(surname);
    const date = clean(birthdate);
    const fullName = joinName(first, last);
    if (!personId || !fullName) return;

    setBusy(true);
    setErr(null);
    try {
      const existingMeta = metaObject(persistedSelf?.meta);
      await upsertSelfProfile(personId, fullName, {
        ...existingMeta,
        first_name: first,
        surname: last || null,
        birthdate_iso: date || null,
        profile_version: "life_journey_2029_v1",
      });
      await refresh(personId);
      setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
      track("journey_person", null, "save_self");
      await runInitialResearch({ first, last, date });
    } catch (error) {
      setErr(personJourneyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    const name = clean(newMemberName);
    if (!personId || !name) return;
    setBusy(true);
    setErr(null);
    try {
      const member = await upsertFamilyMember(personId, null, name, {
        birthdate_iso: clean(newMemberBirthdate) || null,
        profile_version: "life_journey_2029_v1",
      });
      const memberRef = clean(member?.source_ref);
      if (memberRef && selfRef && newMemberRelation !== "none") {
        const parentRef = newMemberRelation === "parent_of_me" ? memberRef : selfRef;
        const childRef = newMemberRelation === "parent_of_me" ? selfRef : memberRef;
        await upsertFamilyRelation(personId, parentRef, childRef, "parent_of");
      }
      setNewMemberName("");
      setNewMemberBirthdate("");
      setNewMemberRelation("none");
      await refresh(personId);
      setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
      track("journey_person", null, "add_member");
    } catch (error) {
      setErr(personJourneyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const nameByRef = useCallback((ref) => {
    const member = members.find((item) => item.source_ref === ref);
    if (ref === selfRef) return member?.name ? `${member.name} (אני)` : "אני";
    return member?.name || ref;
  }, [members, selfRef]);

  const openCapability = useCallback((member, view) => {
    if (variant !== "2029" || !selfRef) return;
    const memberRef = clean(member?.source_ref);
    const name = clean(member?.name);
    const current = research.context || buildLifeJourneyPersonContext(selfRef);
    const patch = buildLifeJourneyCapabilityPatch(current, {
      personRef: selfRef,
      memberRef,
      name,
      view,
    });
    if (!patch) {
      setErr("לא ניתן לפתוח את היכולת בלי שם שמור והקשר אדם תקין.");
      return;
    }
    const result = research.continueResearchPath?.({
      context: patch,
      kind: view,
      mode: "organic",
      surface: "life_journey_2029",
      href: "/2029/journey",
      label: view === "name" ? "מסע השם" : "שם ותאריך",
      reason: "explicit_person_capability",
    });
    if (!result?.ok) setErr("לא ניתן לפתוח כרגע את מסלול המחקר.");
  }, [research, selfRef, variant]);

  const continueSelectedCapability = useCallback((view) => {
    const memberRef = clean(research.context?.dimensions?.lifeJourneyMemberRef);
    const member = members.find(item => item.source_ref === memberRef);
    if (!member) {
      setErr("האדם שנבחר אינו זמין כרגע במסע החיים.");
      return;
    }
    openCapability(member, view);
  }, [members, openCapability, research.context?.dimensions?.lifeJourneyMemberRef]);

  const returnToPerson = useCallback(() => {
    const patch = buildLifeJourneyExactReturnPatch(research.context);
    if (!patch || !research.updateResearchContext?.(patch)) {
      setErr("נקודת החזרה המדויקת אינה זמינה.");
    }
  }, [research]);

  const commitFamilySelection = useCallback((memberRefs) => {
    if (!selfRef) return;
    const patch = buildLifeJourneyFamilySelectionPatch(research.context, {
      personRef: selfRef,
      memberRefs,
    });
    if (!patch) {
      setErr("לא ניתן לעדכן כרגע את בחירת המחקר המשפחתי.");
      return;
    }
    if (!research.setResearchContext?.(patch)) {
      setErr("לא ניתן לעדכן כרגע את בחירת המחקר המשפחתי.");
      return;
    }
    setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
  }, [research, selfRef]);

  const updateFamilySelection = useCallback((memberRef, included) => {
    const nextRefs = included
      ? [...selectedFamilyRefs, memberRef]
      : selectedFamilyRefs.filter(ref => ref !== memberRef);
    commitFamilySelection(nextRefs);
  }, [commitFamilySelection, selectedFamilyRefs]);

  const runSelectedFamilyResearch = useCallback(async () => {
    if (!user) return;
    const selectedSet = new Set(selectedFamilyRefs);
    const selectedMembers = members.filter(member => selectedSet.has(clean(member.source_ref)));
    if (!selectedMembers.length) {
      setFamilyResearch({ state: "error", rows: [], sharedValues: [], error: "בחרו לפחות אדם אחד למחקר המשפחתי." });
      return;
    }
    if (selectedMembers.length > MAX_FAMILY_RESEARCH_MEMBERS) {
      setFamilyResearch({ state: "error", rows: [], sharedValues: [], error: `אפשר לבדוק עד ${MAX_FAMILY_RESEARCH_MEMBERS} אנשים בכל הפעלה.` });
      return;
    }

    setFamilyResearch({ state: "loading", rows: [], sharedValues: [], error: null });
    const accessDescriptor = buildAccessDescriptor({
      user_ref: user.id,
      authenticated: true,
      verified_authority: { source: "supabase_auth", subject_verified: true },
    }, "authenticated_user");
    const crossProvider = createSupabasePersonalDateCrossProvider(supabase);

    try {
      const rows = await Promise.all(selectedMembers.map(async member => {
        const profile = memberResearchProfile(member);
        try {
          const dateRepresentation = profile.birthdate
            ? gregorianToHebrewDateRepresentation(profile.birthdate)
            : null;
          const [nameDocument, dateBundle] = await Promise.all([
            getNameProtocol(profile.fullName),
            profile.birthdate
              ? runPersonalDateResearch({
                  name: profile.first,
                  surname: profile.last || null,
                  birthdateIso: profile.birthdate,
                  crossProvider,
                  accessDescriptor,
                })
              : Promise.resolve(null),
          ]);
          return Object.freeze({
            memberRef: clean(member.source_ref),
            name: profile.fullName,
            state: "ready",
            data: familyResearchSummary(nameDocument, dateBundle, dateRepresentation),
            error: null,
          });
        } catch {
          return Object.freeze({
            memberRef: clean(member.source_ref),
            name: profile.fullName,
            state: "error",
            data: null,
            error: "המחקר לא הושלם עבור האדם הזה.",
          });
        }
      }));
      setFamilyResearch({ state: "ready", rows, sharedValues: sharedFamilyValues(rows), error: null });
      track("journey_person", null, "family_research_explicit");
    } catch (error) {
      setFamilyResearch({ state: "error", rows: [], sharedValues: [], error: personJourneyErrorMessage(error) });
    }
  }, [members, selectedFamilyRefs, user]);

  if (authLoading || loading) {
    return <div className="person-journey"><div className="person-journey-state" aria-busy="true">טוען את מסע החיים…</div></div>;
  }

  if (!user) {
    return <section className="person-journey-login" data-experience-capability="life-journey-auth-gate">
      {variant === "2029" ? <div style={{ display: "flex", justifyContent: "center" }}>
        <SignatureResearchIcon name="journey" label="מסע החיים" />
      </div> : <span className="person-journey-symbol" aria-hidden="true">✦</span>}
      <h2>מסע החיים הוא מרחב פרטי</h2>
      <p>שם, תאריך ומשפחה נשמרים רק בהקשר האישי שלך. יש להתחבר כדי לפתוח מסע.</p>
      <a href="/login">התחברות</a>
    </section>;
  }

  const activeView = variant === "2029" ? lifeJourneyViewFromContext(research.context, selfRef) : "person";
  const selectedName = clean(research.context?.selection?.expression);
  const selectedMemberRef = clean(research.context?.dimensions?.lifeJourneyMemberRef);
  const selectedMember = members.find(member => member.source_ref === selectedMemberRef) || null;
  const selectedMemberMeta = metaObject(selectedMember?.meta);
  const selectedProfile = selectedMember ? {
    name: selectedName || clean(selectedMember.name),
    firstName: clean(selectedMemberMeta.first_name),
    surname: clean(selectedMemberMeta.surname),
    birthdate: clean(selectedMemberMeta.birthdate_iso),
  } : null;

  if (activeView === "name" && selectedName && CapabilitySurface) {
    return <CapabilitySurface view="name" name={selectedName} onContinue={() => continueSelectedCapability("date")} onReturn={returnToPerson} />;
  }

  if (activeView === "date" && selectedName && selectedProfile && CapabilitySurface) {
    return <CapabilitySurface
      view="date"
      user={user}
      profile={selectedProfile}
      onContinue={returnToPerson}
      onReturn={returnToPerson}
    />;
  }

  const analysisData = analysis.data;

  return <div
    className={`person-journey ${variant === "2029" ? "is-2029" : ""}`}
    data-experience-surface="life-journey"
  >
    <section className="person-journey-hero" data-experience-capability="life-journey-profile">
      <div className="person-journey-orbit" aria-hidden="true">
        <span>שם</span><span>תאריך</span><span>משפחה</span>
        <strong>אני</strong>
      </div>
      <div className="person-journey-hero-copy">
        <div className="person-journey-kicker">מסע חיים · פרטי</div>
        <h1>מתחילים ממך.<br />ומשם מחברים את הסיפור.</h1>
        <p>שם ותאריך פותחים את המסע הראשון. אחר כך אפשר להוסיף בני משפחה ואירועים — בלי לפתוח כלי חדש בכל פעם.</p>
      </div>
    </section>

    {err ? <div className="person-journey-error" role="alert">{err}</div> : null}

    <section className="person-journey-panel" data-experience-capability="life-journey-intake">
      <div className="person-journey-section-head">
        <div><small>01</small><h2>מי אני</h2></div>
        <span>נשמר פרטי</span>
      </div>
      <div className="person-journey-fields">
        <label>
          <span>שם פרטי</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="שם פרטי" dir="rtl" autoComplete="given-name" />
        </label>
        <label>
          <span>שם משפחה</span>
          <input value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="שם משפחה" dir="rtl" autoComplete="family-name" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input value={birthdate} onChange={(event) => setBirthdate(event.target.value)} type="date" dir="ltr" autoComplete="bday" />
        </label>
      </div>
      <div className="person-journey-actions">
        <button type="button" className="person-journey-primary" disabled={busy || !clean(firstName)} onClick={beginJourney}>
          {busy ? "פותח את המסע…" : persistedSelf ? "עדכן וחבר מחדש" : "פתח את מסע החיים"}
        </button>
        {variant === "2029" && persistedSelf ? <>
          <button type="button" disabled={busy} onClick={() => openCapability(persistedSelf, "name")}>פתח מסע שם</button>
          <button type="button" disabled={busy} onClick={() => openCapability(persistedSelf, "date")}>פתח שם ותאריך</button>
        </> : null}
        <small>המנועים מחשבים ומצליבים; הם לא קובעים אופי, גורל או אמת אישית.</small>
      </div>
    </section>

    <section className="person-journey-panel" data-experience-capability="life-journey-first-findings">
      <div className="person-journey-section-head">
        <div><small>02</small><h2>החיבורים הראשונים</h2></div>
        <span>{analysis.state === "ready" ? "מנועים חיים" : "ממתין לקלט"}</span>
      </div>

      {analysis.state === "idle" ? <div className="person-journey-empty">אחרי שמירה נציג כאן רק עובדות מנוע ונגזרות: ערכי השם, התאריך העברי ונקודות מפגש שנמצאו.</div> : null}
      {analysis.state === "loading" ? <CanonicalProgress
        title="מחבר את המסע הראשון"
        detail="בודק את השם, ממיר את התאריך ומחפש נקודות מפגש דרך המנועים הקנוניים."
        phase="מחקר אישי"
        compact
      /> : null}
      {analysis.state === "error" ? <div className="person-journey-error" role="alert">{analysis.error}</div> : null}
      {analysis.state === "ready" && analysisData ? <div className="person-journey-findings">
        <div className="person-journey-focal">
          <small>השם המלא</small>
          <strong>{analysisData.fullValue ?? "—"}</strong>
          <span>גימטריה רגילה · תוצאת מנוע</span>
        </div>
        <div className="person-journey-fact-grid">
          {analysisData.partValues.map((item) => <article key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <span>ערך רכיב</span>
          </article>)}
          {analysisData.hebrewDate ? <article>
            <small>התאריך העברי</small>
            <strong className="is-text">{analysisData.hebrewDate}</strong>
            <span>המרה דטרמיניסטית</span>
          </article> : null}
          <article>
            <small>מסלולים עם תוצאה</small>
            <strong>{analysisData.tracksWithResults}</strong>
            <span>כיסוי, לא ציון אמת</span>
          </article>
        </div>
        {analysisData.crossValues.length ? <div className="person-journey-crosses">
          <small>נקודות מפגש שם ↔ תאריך</small>
          <div>{analysisData.crossValues.map((value) => <span key={value}>{value}</span>)}</div>
          <p>נקודת מפגש היא עובדה מחושבת. המשמעות שלה נשארת שאלה למחקר.</p>
        </div> : null}
      </div> : null}
    </section>

    <section className="person-journey-panel" data-experience-capability="life-journey-family">
      <div className="person-journey-section-head">
        <div><small>03</small><h2>המשפחה שלי</h2></div>
        <span>{familyMembers.length ? `${familyMembers.length} אנשים` : "אפשר להתחיל מאדם אחד"}</span>
      </div>

      {members.length ? <fieldset className="person-journey-family-scope">
        <legend>מי משתתף במחקר המשפחתי?</legend>
        <p id="life-journey-family-scope-help">הבחירה נשמרת ב־Research Context בלבד. היא אינה מפעילה חיפוש או מנוע.</p>
        <div aria-describedby="life-journey-family-scope-help">
          {members.map(member => {
            const memberRef = clean(member.source_ref);
            return <label key={memberRef}>
              <input
                type="checkbox"
                checked={selectedFamilyRefSet.has(memberRef)}
                onChange={event => updateFamilySelection(memberRef, event.target.checked)}
              />
              <span>
                <strong>{member.name}</strong>
                <small>{memberRef === selfRef ? "חשבון ראשי מחובר" : "זהות משפחתית · חשבון עתידי אפשרי"}</small>
                <small className="person-journey-member-source">מקור: הוזן במסע הזה</small>
              </span>
            </label>;
          })}
        </div>
        <footer>
          <span role="status"><strong>{selectedFamilyRefs.length}</strong> נבחרו למחקר משותף עתידי</span>
          <div>
            <button type="button" onClick={() => commitFamilySelection(members.map(member => member.source_ref))}>בחר את כולם</button>
            <button type="button" disabled={!selectedFamilyRefs.length} onClick={() => commitFamilySelection([])}>נקה בחירה</button>
          </div>
        </footer>
      </fieldset> : null}

      {familyMembers.length ? <section
        className="person-journey-account-continuity"
        data-experience-capability="life-journey-account-continuity"
        aria-labelledby="life-journey-account-continuity-title"
      >
        <header>
          <div><small>זהות וחשבון</small><h3 id="life-journey-account-continuity-title">אותו אדם, גם כשנפתח חשבון נפרד</h3></div>
          <span>מנגנון Claim קנוני קיים</span>
        </header>
        <p>ה־person-ref המשפחתי נשאר העוגן. חשבון חדש מתחבר אליו בתהליך הזמנה ותביעת זהות מאומתת — בלי ליצור ילד נוסף ובלי לשנות את הזהות הראשית שלך.</p>
        <ul>
          <li>החשבון החדש מקבל Person ראשי משלו.</li>
          <li>ה־Claim מתעד שזה אותו בן משפחה שכבר נמצא במסע.</li>
          <li>החיבור אינו מעתיק מחקר פרטי ואינו מעניק גישה ל־Ledger שלך.</li>
        </ul>
      </section> : null}

      {selectedFamilyRefs.length ? <section
        className="person-journey-birth-timeline"
        data-experience-capability="life-journey-birth-timeline"
        aria-labelledby="life-journey-birth-timeline-title"
      >
        <header>
          <div><small>נגזר מה־Ledger הפרטי</small><h3 id="life-journey-birth-timeline-title">ציר אירועי היסוד</h3></div>
          <span>{birthTimeline.length} אירועי לידה</span>
        </header>
        <p>סדר כרונולוגי של תאריכי הלידה שכבר שמרת עבור האנשים שנבחרו. זו תצוגה בלבד — לא נוצר Event store חדש.</p>
        {birthTimeline.length ? <ol>
          {birthTimeline.map(event => <li key={event.id}>
            <time dateTime={event.dateIso} dir="ltr">{event.dateDisplay}</time>
            <i aria-hidden="true" />
            <div>
              <strong>{event.name}</strong>
              <span>לידה</span>
              {event.hebrewDate ? <small>{event.hebrewDate}</small> : null}
            </div>
          </li>)}
        </ol> : <div className="person-journey-empty">לאנשים שנבחרו עדיין אין תאריך לידה שמור.</div>}
        {selectedWithoutBirthdate.length ? <small className="person-journey-timeline-missing">
          ללא תאריך שמור: {selectedWithoutBirthdate.join(" · ")}
        </small> : null}
      </section> : null}

      {members.length ? <div className="person-journey-family-research-actions">
        <button
          type="button"
          className="person-journey-primary"
          disabled={!selectedFamilyRefs.length || selectedFamilyRefs.length > MAX_FAMILY_RESEARCH_MEMBERS || familyResearch.state === "loading"}
          onClick={runSelectedFamilyResearch}
        >
          {familyResearch.state === "loading"
            ? "מחבר את המחקר המשפחתי…"
            : selectedFamilyRefs.length === 1
              ? "חקור אדם אחד"
              : `חקור ${selectedFamilyRefs.length} אנשים יחד`}
        </button>
        <small>הפעלה מפורשת של שכבות השם והתאריך בלבד. ELS אינו משתתף בשלב הזה.</small>
      </div> : null}

      {familyResearch.state === "loading" ? <CanonicalProgress
        title="בונה מפת מחקר משפחתית"
        detail="בודק במקביל רק את האנשים שבחרת, דרך מנועי השם והתאריך הקיימים."
        phase="משפחה ↔ שם ↔ תאריך"
        compact
      /> : null}
      {familyResearch.state === "error" ? <div className="person-journey-error" role="alert">{familyResearch.error}</div> : null}
      {familyResearch.state === "ready" ? <section className="person-journey-family-research" aria-label="תוצאות המחקר המשפחתי">
        <div className="person-journey-family-research-head">
          <div><small>מחקר מפורש</small><h3>מפת המחקר המשפחתית</h3></div>
          <span>{familyResearch.rows.filter(row => row.state === "ready").length} מתוך {familyResearch.rows.length} הושלמו</span>
        </div>
        {familyResearch.sharedValues.length ? <div className="person-journey-family-shared">
          <small>ערכים שמופיעים אצל לפחות שני אנשים שנבחרו</small>
          <div>{familyResearch.sharedValues.map(item => <span key={item.value}><strong>{item.value}</strong> · {item.count} אנשים</span>)}</div>
          <p>זהו חיבור מחושב בלבד — לא פרשנות על המשפחה.</p>
        </div> : <p className="person-journey-note">לא נמצא כרגע ערך משותף בין תוצאות השם ונקודות המפגש. זו אינה קביעה שאין קשר.</p>}
        <div className="person-journey-family-research-grid">
          {familyResearch.rows.map(row => <article key={row.memberRef}>
            <header><strong>{row.name}</strong><small>{row.data?.hebrewDate || "תאריך עברי לא זמין"}</small></header>
            {row.state === "ready" ? <>
              <dl>
                <div><dt>ערך השם</dt><dd>{row.data.fullValue ?? "—"}</dd></div>
                <div><dt>שכבות עם תוצאה</dt><dd>{row.data.tracksWithResults}</dd></div>
                <div><dt>נקודות מפגש</dt><dd>{row.data.crossValues.length}</dd></div>
              </dl>
              {row.data.crossValues.length ? <div className="person-journey-family-cross-values">{row.data.crossValues.map(value => <span key={value}>{value}</span>)}</div> : null}
              {row.data.partial ? <small>שכבת השם לא הייתה זמינה; מוצג המידע שחושב מהתאריך בלבד.</small> : null}
            </> : <p>{row.error}</p>}
          </article>)}
        </div>
      </section> : null}

      {familyMembers.length ? <div className="person-journey-family-list">
        {familyMembers.map((member) => {
          const memberMeta = metaObject(member.meta);
          return <article key={member.source_ref}>
            <div>
              <strong>{member.name}</strong>
              {memberMeta.birthdate_iso ? <small>{memberMeta.birthdate_iso}</small> : null}
              <small className="person-journey-member-source">מקור: הוזן במסע הזה · זהות ניתנת לחיבור לחשבון</small>
            </div>
            {variant === "2029" ? <div className="person-journey-member-actions">
              <button type="button" disabled={busy} onClick={() => openCapability(member, "name")}>מסע שם</button>
              <button type="button" disabled={busy} onClick={() => openCapability(member, "date")}>שם ותאריך</button>
            </div> : <span>פרטי</span>}
          </article>;
        })}
      </div> : <div className="person-journey-empty">עוד לא הוספת בני משפחה. אפשר להוסיף שם ותאריך, ולקשור כהורה או ילד/ה כשזה ידוע.</div>}

      <div className="person-journey-family-form">
        <label>
          <span>שם בן/בת משפחה</span>
          <input value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} placeholder="שם מלא" dir="rtl" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input value={newMemberBirthdate} onChange={(event) => setNewMemberBirthdate(event.target.value)} type="date" dir="ltr" />
        </label>
        <label>
          <span>הקשר אליי</span>
          <select value={newMemberRelation} onChange={(event) => setNewMemberRelation(event.target.value)}>
            {RELATIONS.map((relation) => <option key={relation.id} value={relation.id}>{relation.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !clean(newMemberName)} onClick={addMember}>הוסף למסע</button>
      </div>

      {relations.length ? <div className="person-journey-relations" aria-label="קשרים משפחתיים">
        {relations.map((relation) => <div key={relation.source_ref}>
          <span>{nameByRef(relation.parent_ref)}</span>
          <b>הורה של</b>
          <span>{nameByRef(relation.child_ref)}</span>
        </div>)}
      </div> : null}
    </section>

    {variant === "2029" && CapabilitySurface ? <CapabilitySurface view="hints" user={user} /> : null}

    <section className="person-journey-next" data-experience-capability="life-journey-next">
      <div>
        <small>השלב הבא</small>
        <h2>המסע גדל איתך</h2>
        <p>אירועי חיים, מקומות וממצאים שנוגעים לאנשים האלה יוכלו להצטרף בהמשך לאותו Person context — לא לעוד מערכת.</p>
      </div>
      <span aria-hidden="true">→</span>
    </section>
  </div>;
}
