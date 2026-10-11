import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  getOrCreateMyPersonId,
  listFamily,
  upsertFamilyMember,
  upsertFamilyRelation,
  upsertSelfProfile,
} from "../lib/supabase.js";
import { track } from "../lib/tracking.js";
import LifeJourneyResearch from "./LifeJourneyResearch.jsx";
import "./person-journey.css";

const RELATIONS = Object.freeze([
  { id: "none", label: "קשר יוגדר אחר כך" },
  { id: "parent_of_me", label: "הורה שלי" },
  { id: "child_of_me", label: "ילד/ה שלי" },
]);

const clean = (value) => String(value || "").trim();
const metaObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const joinName = (first, last) => [clean(first), clean(last)].filter(Boolean).join(" ");

export default function PersonJourney(props) {
  const { user } = useAuth();
  return <PersonJourneyContent key={user?.id || "signed-out"} {...props} />;
}

function PersonJourneyContent({ variant = "legacy" }) {
  const { user, loading: authLoading } = useAuth();
  const research = useResearch();
  const [personId, setPersonId] = useState(null);
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startRequest, setStartRequest] = useState(0);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [allowSameName, setAllowSameName] = useState(false);
  const [memberNotice, setMemberNotice] = useState("");
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

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
    if (!aliveRef.current) return;
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
        if (alive && aliveRef.current) setErr("לא ניתן לטעון את הפרטים. בדקו את החיבור ונסו שוב.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authLoading, refresh, user]);

  const currentResearchSubjectId = research.context?.subject?.id || null;

  useEffect(() => {
    if (!selfRef || !user) return;
    const personSubject = {
      id: selfRef,
      type: "person",
      label: "מסע חיים פרטי",
      href: variant === "2029" ? "/2029/journey" : "/research?tool=journey",
    };
    const selection = { entityId: selfRef, entityType: "person" };
    if (!currentResearchSubjectId) {
      research.setResearchContext?.({ subject: personSubject, selection, lens: "person", access: { tier: "personal", scope: "private" } });
      return;
    }
    // Research Context is navigation state only; Person data remains in the private Ledger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResearchSubjectId, persistedSelf?.name, selfRef, user?.id, variant]);

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
      if (aliveRef.current) setStartRequest((value) => value + 1);
    } catch (error) {
      if (aliveRef.current) setErr("הפעולה לא הושלמה. בדקו את החיבור ונסו שוב.");
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  };

  const addMember = async () => {
    const name = clean(newMemberName);
    if (!personId || !name) return;
    if (!editingRef && members.some((m) => m.name === name) && !allowSameName) {
      setMemberNotice("השם כבר מופיע ברשימה. אפשר לערוך את האדם הקיים, או לסמן שזה אדם נוסף בעל אותו שם.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMemberNotice("");
    const writeRef = editingRef || `person:${personId}:p:${crypto.randomUUID()}`;
    setEditingRef(writeRef);
    let savedMemberRef = null;
    try {
      const existing = members.find((m) => m.source_ref === editingRef);
      const member = await upsertFamilyMember(personId, writeRef.slice(`person:${personId}:p:`.length), name, {
        ...metaObject(existing?.meta),
        first_name: name.split(/\s+/)[0],
        surname: name.split(/\s+/).slice(1).join(" ") || null,
        birthdate_iso: clean(newMemberBirthdate) || null,
        profile_version: "life_journey_2029_v1",
      });
      if (!aliveRef.current) return;
      const memberRef = clean(member?.source_ref);
      if (!memberRef.startsWith(`person:${personId}:p:`)) throw new Error("invalid_member_response");
      savedMemberRef = memberRef;
      setEditingRef(memberRef);
      if (memberRef && selfRef && newMemberRelation !== "none") {
        const parentRef = newMemberRelation === "parent_of_me" ? memberRef : selfRef;
        const childRef = newMemberRelation === "parent_of_me" ? selfRef : memberRef;
        await upsertFamilyRelation(personId, parentRef, childRef, "parent_of");
      }
      await refresh(personId);
      if (!aliveRef.current) return;
      setNewMemberName("");
      setNewMemberBirthdate("");
      setNewMemberRelation("none");
      setEditingRef(null);
      setAllowSameName(false);
      if (aliveRef.current) { setFamilyOpen(false); setMemberNotice("הפרטים נשמרו. אפשר להמשיך במחקר על עצמך או לבחור אדם מהמשפחה."); }
      track("journey_person", null, "add_member");
    } catch {
      if (aliveRef.current) {
        setErr(savedMemberRef ? "האדם נשמר, אך שמירת הקשר או רענון הרשימה לא הושלמו. ניסיון נוסף יעדכן את אותו אדם." : "הפעולה לא הושלמה. בדקו את החיבור ונסו שוב.");
        if (savedMemberRef) await refresh(personId).catch(() => {});
      }
    } finally {
      if (aliveRef.current) setBusy(false);
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
        <p>שם ותאריך פותחים את המסע הראשון. אחר כך אפשר להוסיף בני משפחה ולבחור מנועי מחקר — בלי לפתוח כלי חדש בכל פעם.</p>
      </div>
    </section>

    {err ? <div className="person-journey-error" role="alert">{err}</div> : null}

    <section id="life-intake" className="person-journey-panel" data-experience-capability="life-journey-intake">
      <div className="person-journey-section-head">
        <div><small>01</small><h2>מי אני</h2></div>
        <span>נשמר פרטי</span>
      </div>
      <div className="person-journey-fields">
        <label>
          <span>שם פרטי</span>
          <input disabled={busy} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="שם פרטי" dir="rtl" autoComplete="given-name" />
        </label>
        <label>
          <span>שם משפחה</span>
          <input disabled={busy} value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="שם משפחה" dir="rtl" autoComplete="family-name" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input disabled={busy} value={birthdate} onChange={(event) => setBirthdate(event.target.value)} type="date" dir="ltr" autoComplete="bday" />
        </label>
      </div>
      <div className="person-journey-actions">
        <button type="button" className="person-journey-primary" disabled={busy || !clean(firstName)} onClick={beginJourney}>
          {busy ? "פותח את המסע…" : persistedSelf ? "שמור פרטים והמשך למחקר" : "שמור ופתח את מסע החיים"}
        </button>
        <small>המנועים מחשבים ומצליבים; הם לא קובעים אופי, גורל או אמת אישית.</small>
      </div>
    </section>

    {personId ? <LifeJourneyResearch key={`${user.id}:${personId}`} ownerId={personId} userId={user.id} members={members} startRequest={startRequest} /> : null}

    <section id="life-family" className="person-journey-panel" data-experience-capability="life-journey-family">
      <div className="person-journey-section-head">
        <div><small>03</small><h2>המשפחה שלי</h2></div>
        <span>{familyMembers.length ? `${familyMembers.length} אנשים` : "אפשר להתחיל מאדם אחד"}</span>
      </div>

      {familyMembers.length ? <div className="person-journey-family-list">
        {familyMembers.map((member) => {
          const memberMeta = metaObject(member.meta);
          return <article key={member.source_ref}>
            <div><strong>{member.name}</strong>{memberMeta.birthdate_iso ? <small>{memberMeta.birthdate_iso}</small> : null}</div>
            <button type="button" disabled={busy} onClick={() => {
              setEditingRef(member.source_ref); setNewMemberName(member.name); setNewMemberBirthdate(memberMeta.birthdate_iso || "");
              setNewMemberRelation("none"); setMemberNotice(""); setFamilyOpen(true);
            }}>ערוך פרטים</button>
          </article>;
        })}
      </div> : <div className="person-journey-empty">עוד לא הוספת בני משפחה. אפשר להוסיף שם ותאריך, ולקשור כהורה או ילד/ה כשזה ידוע.</div>}

      <p>הוספת משפחה היא רשות. אפשר להמשיך למחקר על עצמך בלי למלא דבר נוסף.</p>
      <div className="person-journey-actions">
        <button type="button" aria-expanded={familyOpen} aria-controls="life-family-form" onClick={() => setFamilyOpen(!familyOpen)}>{familyOpen ? "סגור את הטופס" : editingRef ? "המשך עריכת בן משפחה" : "הוסף בן משפחה"}</button>
        <button type="button" onClick={() => { setFamilyOpen(false); document.getElementById("life-research")?.scrollIntoView({ block: "start" }); }}>חזרה למחקר שלי</button>
      </div>
      {memberNotice ? <p role="status">{memberNotice}</p> : null}
      {familyOpen ? <div id="life-family-form" className="person-journey-family-form">
        <label>
          <span>שם בן/בת משפחה</span>
          <input disabled={busy} value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} placeholder="שם מלא" dir="rtl" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input disabled={busy} value={newMemberBirthdate} onChange={(event) => setNewMemberBirthdate(event.target.value)} type="date" dir="ltr" />
        </label>
        <label>
          <span>הוסף קשר אליי (רשות)</span>
          <select aria-label="הוסף קשר אליי (רשות)" disabled={busy} value={newMemberRelation} onChange={(event) => setNewMemberRelation(event.target.value)}>
            {RELATIONS.map((relation) => <option key={relation.id} value={relation.id}>{relation.label}</option>)}
          </select>
        </label>
        {!editingRef && members.some((m) => m.name === clean(newMemberName)) ? <label className="life-checkbox"><input type="checkbox" checked={allowSameName} onChange={(event) => setAllowSameName(event.target.checked)} /><span>זה אדם נוסף בעל אותו שם</span></label> : null}
        <button type="button" disabled={busy || !clean(newMemberName)} onClick={addMember}>{busy ? "שומר…" : editingRef ? "שמור את השינויים" : "שמור בן משפחה"}</button>
        <button type="button" disabled={busy} onClick={() => { setFamilyOpen(false); setEditingRef(null); setNewMemberName(""); setNewMemberBirthdate(""); setNewMemberRelation("none"); setAllowSameName(false); }}>ביטול</button>
      </div> : null}

      {relations.length ? <div className="person-journey-relations" aria-label="קשרים משפחתיים">
        {relations.map((relation) => <div key={relation.source_ref}>
          <span>{nameByRef(relation.parent_ref)}</span>
          <b>הורה של</b>
          <span>{nameByRef(relation.child_ref)}</span>
        </div>)}
      </div> : null}
    </section>

  </div>;
}
