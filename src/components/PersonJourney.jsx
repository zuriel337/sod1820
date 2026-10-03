import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  getNameMulti,
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
import CanonicalProgress from "./CanonicalProgress.jsx";
import "./person-journey.css";

const RELATIONS = Object.freeze([
  { id: "none", label: "קשר יוגדר אחר כך" },
  { id: "parent_of_me", label: "הורה שלי" },
  { id: "child_of_me", label: "ילד/ה שלי" },
]);

const clean = (value) => String(value || "").trim();
const metaObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const joinName = (first, last) => [clean(first), clean(last)].filter(Boolean).join(" ");

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

export default function PersonJourney({ variant = "legacy" }) {
  const { user, loading: authLoading } = useAuth();
  const research = useResearch();
  const [personId, setPersonId] = useState(null);
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState({ state: "idle", data: null, error: null });

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
        if (alive) setErr(error?.message || String(error));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authLoading, refresh, user]);

  const currentResearchSubjectId = research.context?.subject?.id || null;

  useEffect(() => {
    if (!selfRef || !user) return;
    const persistedName = clean(persistedSelf?.name);
    const personSubject = {
      id: selfRef,
      type: "person",
      label: persistedName || "מסע החיים שלי",
      href: variant === "2029" ? "/2029/journey" : "/research?tool=journey",
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
  }, [currentResearchSubjectId, persistedSelf?.name, selfRef, user?.id, variant]);

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
      const message = error?.message || String(error);
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
      track("journey_person", null, "save_self");
      await runInitialResearch({ first, last, date });
    } catch (error) {
      setErr(error?.message || String(error));
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
      track("journey_person", null, "add_member");
    } catch (error) {
      setErr(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  };

  const nameByRef = useCallback((ref) => {
    const member = members.find((item) => item.source_ref === ref);
    if (ref === selfRef) return member?.name ? `${member.name} (אני)` : "אני";
    return member?.name || ref;
  }, [members, selfRef]);

  if (authLoading || loading) {
    return <div className="person-journey"><div className="person-journey-state" aria-busy="true">טוען את מסע החיים…</div></div>;
  }

  if (!user) {
    return <section className="person-journey-login" data-experience-capability="life-journey-auth-gate">
      <span className="person-journey-symbol" aria-hidden="true">✦</span>
      <h2>מסע החיים הוא מרחב פרטי</h2>
      <p>שם, תאריך ומשפחה נשמרים רק בהקשר האישי שלך. יש להתחבר כדי לפתוח מסע.</p>
      <a href="/login">התחברות</a>
    </section>;
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

      {familyMembers.length ? <div className="person-journey-family-list">
        {familyMembers.map((member) => {
          const memberMeta = metaObject(member.meta);
          return <article key={member.source_ref}>
            <div><strong>{member.name}</strong>{memberMeta.birthdate_iso ? <small>{memberMeta.birthdate_iso}</small> : null}</div>
            <span>פרטי</span>
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
