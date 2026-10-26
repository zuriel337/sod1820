import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  getNameMulti,
  getNameProtocol,
  getAiAnalysis,
  getOrCreateMyPersonId,
  listFamily,
  removeFamilyMember,
  supabase,
  upsertFamilyMember,
  upsertFamilyRelation,
  upsertSelfProfile,
} from "../lib/supabase.js";
import { track } from "../lib/tracking.js";
import { addHint, getMyHints } from "../lib/hints.js";
import {
  createSupabasePersonalDateCrossProvider,
  gregorianToHebrewDateRepresentation,
  runPersonalDateResearch,
} from "../lib/research/personalDateResearch.js";
import { buildAccessDescriptor } from "../lib/research/researchPlanV2.js";
import {
  createFamilyInvitation,
  familyClaimErrorMessage,
  listMyFamilyClaims,
  redeemFamilyInvitation,
  reverseFamilyClaim,
  revokeFamilyClaim,
  sendFamilyInvitationEmail,
  shareFamilyInvitationPrivately,
} from "../lib/research/familyClaimAdapter.js";
import {
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyFamilySelectionPatch,
  buildLifeJourneyFindingTraversalPatch,
  buildLifeJourneyPersonContext,
  buildLifeJourneyMapPositionPatch,
  lifeJourneyMapPosition,
  lifeJourneySelectedMemberRefs,
  lifeJourneyViewFromContext,
} from "../lib/research/lifeJourneyPersonContext.js";
import { runLifeJourneyNameResearch } from "../lib/research/lifeJourneyNameResearch.js";
import { saveLifeJourneyHintCapture } from "../lib/research/lifeJourneyHintCapture.js";
import {
  createSupabaseLifeJourneyFamilyProviders,
  runLifeJourneyFamilyResearch,
} from "../lib/research/lifeJourneyFamilyResearch.js";
import {
  createLifeJourneyFamilySourceReaders,
  runLifeJourneyFamilySourceResearch,
} from "../lib/research/lifeJourneyFamilySourceResearch.js";
import {
  lifeJourneyFamilySelectionSignature,
  lifeJourneyFamilySnapshotPatch,
  materializeLifeJourneyFamilySnapshot,
  readLifeJourneyFamilySnapshot,
  serializeLifeJourneyFamilySnapshot,
} from "../lib/research/lifeJourneyFamilyResearchSnapshot.js";
import CanonicalProgress from "./CanonicalProgress.jsx";
import SignatureResearchIcon from "./SignatureResearchIcon.jsx";
import CanonicalVerseCards2029 from "./experience2029/CanonicalVerseCards2029.jsx";
import "./person-journey.css";
import LifeJourneyResume2029 from "./experience2029/LifeJourneyResume2029.jsx";

const LifeJourneyMaps2029 = lazy(() => import("./experience2029/LifeJourneyMaps2029.jsx"));

const RELATIONS = Object.freeze([
  { id: "none", label: "קשר יוגדר אחר כך" },
  { id: "parent_of_me", label: "הורה שלי" },
  { id: "child_of_me", label: "ילד/ה שלי" },
]);

const clean = (value) => String(value || "").trim();
const metaObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const joinName = (first, last) => [clean(first), clean(last)].filter(Boolean).join(" ");
const familyMemberRawRef = (ownerId, sourceRef) => {
  const prefix = `person:${ownerId}:p:`;
  const value = clean(sourceRef);
  return value.startsWith(prefix) ? value.slice(prefix.length) : "";
};
const MAX_FAMILY_RESEARCH_MEMBERS = 12;
const MAX_VISIBLE_FAMILY_CONVERGENCES = 10;
const FAMILY_CLAIM_STATUS = Object.freeze({
  pending: "ממתין לחיבור",
  approved: "זהות אומתה",
  rejected: "נדחה",
  revoked: "בוטל",
  reversed: "חיבור בוטל",
});

function FamilyConvergenceChip({ item }) {
  return <span>
    <strong>{item.value}</strong> · {item.count} אנשים · {item.distinctExpressionCount} ביטויים
    <em>{item.sameMethod ? "כולל אותה שיטה" : "שיטות שונות"}{item.repeatedExpressionCount ? " · כולל ביטוי משותף" : ""}</em>
  </span>;
}

function LifeJourneyMapsLoading() {
  return <section className="person-journey-maps-loading" data-experience-capability="life-journey-maps-loading" role="status" aria-label="טוען את מפות החיים">
    <div><i /><span><b>טוען את מפות החיים</b><small>מכין את התצוגות מההקשר הפרטי הקיים…</small></span></div>
    <div aria-hidden="true"><i /><i /><i /></div>
  </section>;
}

function dateCrossFindingRefs(dateBundle) {
  const seen = new Set();
  return (Array.isArray(dateBundle?.findings) ? dateBundle.findings : [])
    .filter(finding => finding?.kind === "date_cross")
    .map(finding => Object.freeze({
      id: clean(finding?.id),
      value: Number(finding?.subject?.value),
      sourceRef: clean(finding?.source?.sourceRef),
      versionRef: clean(finding?.source?.adapter),
    }))
    .filter(finding => finding.id && Number.isSafeInteger(finding.value))
    .filter(finding => {
      const key = `${finding.id}:${finding.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

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
  const crossFindings = dateCrossFindingRefs(dateBundle);
  const crossValues = [...new Set(crossFindings.map(finding => finding.value))];
  const methodFindings = Array.isArray(nameResult?.methodFindings) ? nameResult.methodFindings : [];

  return Object.freeze({
    fullValue: Number.isSafeInteger(nameResult?.regularValue)
      ? nameResult.regularValue
      : Number.isSafeInteger(Number(values.full)) ? Number(values.full) : null,
    methodFindings,
    partValues: Object.entries(parts)
      .map(([label, value]) => ({ label, value: Number(value) }))
      .filter(item => Number.isSafeInteger(item.value)),
    hebrewDate: dateRepresentation?.hebrew?.pretty || null,
    crossFindings,
    crossValues,
    tracksWithResults: Number(nameResult?.tracksWithResults
      ?? nameResult?.combo?.tracks_with_results
      ?? nameResult?.tracks_with_results
      ?? 0),
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
    birthTime: clean(meta.birth_time_local),
    birthPlace: clean(meta.birth_place),
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
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
    })];
  }).sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.name.localeCompare(b.name, "he"));
}

function familyResearchSummary(nameResult, dateBundle, dateRepresentation) {
  const crossFindings = dateCrossFindingRefs(dateBundle);
  const crossValues = [...new Set(crossFindings.map(finding => finding.value))];
  const methodFindings = Array.isArray(nameResult?.methodFindings) ? nameResult.methodFindings : [];
  const rawLegacyValue = nameResult?.input?.value;
  const legacyValue = rawLegacyValue == null || rawLegacyValue === "" ? null : Number(rawLegacyValue);
  const legacyAgents = Array.isArray(nameResult?.agents) ? nameResult.agents : [];
  return Object.freeze({
    fullValue: Number.isSafeInteger(nameResult?.regularValue)
      ? nameResult.regularValue
      : Number.isSafeInteger(legacyValue) ? legacyValue : null,
    methodFindings,
    hebrewDate: dateRepresentation?.hebrew?.pretty || null,
    crossFindings,
    crossValues,
    tracksWithResults: methodFindings.length || Number(nameResult?.tracksWithResults
      ?? legacyAgents.filter(agent => agent?.ran && agent?.ok && !agent?.empty).length
      ?? 0),
    partial: !nameResult || Boolean(nameResult.partial),
  });
}

function sharedFamilyValues(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.state !== "ready") continue;
    const values = new Set([
      ...(row.data?.methodFindings || []).map(finding => finding.value),
      ...(row.data?.crossValues || []),
    ]
      .filter(Number.isSafeInteger));
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value);
}

export default function PersonJourney(props) {
  const auth = useAuth();
  const principal = auth.loading ? "auth:pending" : auth.user?.id || "guest";
  return <PrincipalPersonJourney key={principal} {...props} auth={auth} />;
}

function PersonalDetailsDisclosure({ variant, open, onToggle, summary, children }) {
  if (variant !== "2029") return <>{children}</>;
  return <details className="person-journey-personal-details" open={open} onToggle={event => onToggle(event.currentTarget.open)}>
    <summary>{summary}</summary>
    {children}
  </details>;
}

function FamilyAnalysisDisclosure({ variant, children }) {
  if (variant !== "2029") return <>{children}</>;
  return <details className="person-journey-summary-disclosure"><summary>פירוט הסיכום המשפחתי</summary>{children}</details>;
}

function PrincipalPersonJourney({ variant = "legacy", CapabilitySurface = null, auth }) {
  const { user, loading: authLoading } = auth;
  const userId = user?.id || null;
  const research = useResearch();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [personId, setPersonId] = useState(null);
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [personDetailsOpen, setPersonDetailsOpen] = useState(true);
  const personDetailsCollapsed = useRef(false);
  const [analysis, setAnalysis] = useState({ state: "idle", data: null, error: null });
  const [familyResearch, setFamilyResearch] = useState({ state: "idle", rows: [], sharedValues: [], sharedExpressions: [], error: null });
  const [familyAnalysis, setFamilyAnalysis] = useState({ state: "idle", data: null, error: null });
  const [birthReflections, setBirthReflections] = useState(() => new Map());
  const [ownedHints, setOwnedHints] = useState({ principal: userId, loading: true, rows: [], error: null });
  const hintState = ownedHints.principal === userId ? ownedHints : { loading: true, rows: [], error: null };
  const [familyClaims, setFamilyClaims] = useState({ state: "idle", rows: [], error: null });
  const [familyClaimBusy, setFamilyClaimBusy] = useState(null);
  const [familyClaimNotice, setFamilyClaimNotice] = useState(null);
  const [invitationTokens, setInvitationTokens] = useState({});
  const [invitationEmails, setInvitationEmails] = useState({});
  const [claimToken, setClaimToken] = useState("");

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBirthdate, setNewMemberBirthdate] = useState("");
  const [newMemberBirthTime, setNewMemberBirthTime] = useState("");
  const [newMemberBirthPlace, setNewMemberBirthPlace] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("none");
  const [editingMemberRef, setEditingMemberRef] = useState(null);

  const selfRef = personId ? `person:${personId}:self` : null;
  const persistedSelf = useMemo(
    () => selfRef ? members.find((member) => member.source_ref === selfRef) : null,
    [members, selfRef],
  );
  useEffect(() => {
    if (variant !== "2029" || !persistedSelf || personDetailsCollapsed.current) return;
    personDetailsCollapsed.current = true;
    setPersonDetailsOpen(false);
  }, [persistedSelf, variant]);
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
  const familyResearchSignature = useMemo(
    () => lifeJourneyFamilySelectionSignature(members, selectedFamilyRefs),
    [members, selectedFamilyRefs],
  );
  const latestClaimByTarget = useMemo(() => {
    const claims = new Map();
    for (const claim of familyClaims.rows) {
      const targetRef = clean(claim?.target_ref);
      if (targetRef && !claims.has(targetRef)) claims.set(targetRef, claim);
    }
    return claims;
  }, [familyClaims.rows]);
  const birthTimeline = useMemo(
    () => familyBirthTimeline(members, selectedFamilyRefs),
    [members, selectedFamilyRefs],
  );
  const currentResearchSubjectId = research.context?.subject?.id || null;
  const currentLifeJourneyView = research.context?.dimensions?.lifeJourneyView || null;
  const currentLifeJourneyPersonRef = research.context?.dimensions?.lifeJourneyPersonRef || null;
  const currentReturnPersonRef = research.context?.returnTo?.subject?.id || null;

  useEffect(() => {
    if (variant !== "2029" || !userId) return;
    let alive = true;
    setOwnedHints({ principal: userId, loading: true, rows: [], error: null });
    getMyHints({ id: userId }, { fallbackLocal: false }).then(rows => {
      if (alive) setOwnedHints({ principal: userId, loading: false, rows: Array.isArray(rows) ? rows : [], error: null });
    }).catch(() => {
      if (alive) setOwnedHints({ principal: userId, loading: false, rows: [], error: "הרמזים אינם זמינים כרגע." });
    });
    return () => { alive = false; };
  }, [userId, variant]);

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
    if (variant === "2029") setBirthTime(clean(meta.birth_time_local));
    if (variant === "2029") setBirthPlace(clean(meta.birth_place));
  }, [variant]);

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
  }, [authLoading, refresh, userId]);

  const refreshFamilyClaims = useCallback(async () => {
    if (variant !== "2029" || !userId || !personId) return false;
    setFamilyClaims(previous => ({ state: "loading", rows: previous.rows, error: null }));
    try {
      const rows = await listMyFamilyClaims();
      setFamilyClaims({ state: "ready", rows, error: null });
      return true;
    } catch {
      setFamilyClaims({ state: "unavailable", rows: [], error: "חיבור חשבונות עדיין אינו פעיל בסביבה הזאת." });
      return false;
    }
  }, [personId, userId, variant]);

  useEffect(() => {
    if (variant !== "2029" || !personId || !userId) return;
    refreshFamilyClaims();
  }, [personId, refreshFamilyClaims, userId, variant]);

  useEffect(() => {
    if (!selfRef || !user) return;
    if (research.syncStatus === "loading") return;
    if (variant === "2029") {
      const contextView = lifeJourneyViewFromContext(research.context, selfRef);
      if (contextView === "finding" && !pathname.startsWith("/2029/number/")) {
        const timer = window.setTimeout(() => {
          if (!window.location.pathname.startsWith("/2029/number/")) {
            research.setResearchContext?.(buildLifeJourneyPersonContext(selfRef, research.context));
          }
        }, 0);
        return () => window.clearTimeout(timer);
      }
      if (contextView) return;
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
    currentReturnPersonRef, pathname, persistedSelf?.name, research.syncStatus, selfRef, user?.id, variant]);

  const materializeFamilyContext = useCallback(context => {
    const availableRefs = new Set(members.map(member => clean(member.source_ref)));
    const selectedRefs = lifeJourneySelectedMemberRefs(context, selfRef).filter(ref => availableRefs.has(ref));
    const snapshot = readLifeJourneyFamilySnapshot(context, {
      personRef: selfRef,
      signature: lifeJourneyFamilySelectionSignature(members, selectedRefs),
    });
    if (!snapshot) return null;
    return materializeLifeJourneyFamilySnapshot(snapshot, members, {
      hebrewDateForMember: member => {
        const date = memberResearchProfile(member).birthdate;
        if (!date) return null;
        try { return gregorianToHebrewDateRepresentation(date)?.hebrew?.pretty || null; }
        catch { return null; }
      },
    });
  }, [members, selfRef]);

  useEffect(() => {
    if (variant !== "2029" || !selfRef || !familyResearchSignature || familyResearch.state !== "idle") return;
    const materialized = materializeFamilyContext(research.context);
    if (!materialized) return;
    setFamilyResearch(materialized.research);
    setFamilyAnalysis(materialized.analysis || { state: "idle", data: null, error: null });
  }, [familyResearch.state, familyResearchSignature, materializeFamilyContext, research.context, selfRef, variant]);

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
        variant === "2029"
          ? runLifeJourneyNameResearch({ firstName: first, surname: last, fullName: joinName(first, last) })
          : getNameMulti(clean(first), {
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
  }, [user, variant]);

  const beginJourney = async () => {
    const first = clean(firstName);
    const last = clean(surname);
    const date = clean(birthdate);
    const time = clean(birthTime);
    const place = clean(birthPlace);
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
        ...(variant === "2029" ? { birth_time_local: time || null, birth_place: place || null } : {}),
        profile_version: "life_journey_2029_v1",
        profile_source: "account_owner_entered",
        profile_source_person_ref: selfRef,
        profile_updated_at: new Date().toISOString(),
      });
      await refresh(personId);
      setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
      setFamilyAnalysis({ state: "idle", data: null, error: null });
      setBirthReflections(new Map());
      track("journey_person", null, "save_self");
      if (variant === "2029") {
        setAnalysis({ state: "idle", data: null, error: null });
      } else {
        await runInitialResearch({ first, last, date });
      }
    } catch (error) {
      setErr(personJourneyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resetMemberForm = useCallback(() => {
    setNewMemberName("");
    setNewMemberBirthdate("");
    setNewMemberBirthTime("");
    setNewMemberBirthPlace("");
    setNewMemberRelation("none");
    setEditingMemberRef(null);
  }, []);

  const startEditingMember = useCallback((member) => {
    const profile = memberResearchProfile(member);
    setEditingMemberRef(clean(member?.source_ref));
    setNewMemberName(profile.fullName);
    setNewMemberBirthdate(profile.birthdate);
    setNewMemberBirthTime(profile.birthTime);
    setNewMemberBirthPlace(profile.birthPlace);
    setNewMemberRelation("none");
  }, []);

  const saveMember = async () => {
    const name = clean(newMemberName);
    if (!personId || !name) return;
    setBusy(true);
    setErr(null);
    try {
      const editingRef = editingMemberRef ? familyMemberRawRef(personId, editingMemberRef) : null;
      if (editingMemberRef && !editingRef) throw new Error("הפניית בן המשפחה אינה תקינה לעריכה.");
      const existingMember = editingMemberRef ? members.find(member => clean(member.source_ref) === editingMemberRef) : null;
      const existingMeta = metaObject(existingMember?.meta);
      const namePieces = name.split(/\s+/u).filter(Boolean);
      const memberFirstName = namePieces.shift() || name;
      const memberSurname = namePieces.join(" ");
      const member = await upsertFamilyMember(personId, editingRef, name, {
        ...existingMeta,
        first_name: memberFirstName,
        surname: memberSurname || null,
        birthdate_iso: clean(newMemberBirthdate) || null,
        ...(variant === "2029" ? {
          birth_time_local: clean(newMemberBirthTime) || null,
          birth_place: clean(newMemberBirthPlace) || null,
        } : {}),
        profile_version: "life_journey_2029_v1",
        profile_source: existingMeta.profile_source || "journey_owner_entered",
        profile_source_person_ref: existingMeta.profile_source_person_ref || selfRef,
        profile_updated_at: new Date().toISOString(),
      });
      const memberRef = clean(member?.source_ref);
      if (!editingMemberRef && memberRef && selfRef && newMemberRelation !== "none") {
        const parentRef = newMemberRelation === "parent_of_me" ? memberRef : selfRef;
        const childRef = newMemberRelation === "parent_of_me" ? selfRef : memberRef;
        await upsertFamilyRelation(personId, parentRef, childRef, "parent_of");
      }
      resetMemberForm();
      await refresh(personId);
      setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
      setFamilyAnalysis({ state: "idle", data: null, error: null });
      setBirthReflections(new Map());
      track("journey_person", null, editingMemberRef ? "edit_member" : "add_member");
    } catch (error) {
      setErr(personJourneyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const createAccountInvitation = useCallback(async (member) => {
    const targetRef = clean(member?.source_ref);
    if (!personId || !targetRef || familyClaims.state !== "ready") return;
    setFamilyClaimBusy(`invite:${targetRef}`);
    setFamilyClaimNotice(null);
    try {
      const invitation = await createFamilyInvitation(personId, targetRef, 7);
      if (!invitation.id || !invitation.token) throw new Error("family_claim_missing_token");
      setInvitationTokens(previous => ({ ...previous, [targetRef]: { claimId: invitation.id, token: invitation.token } }));
      setFamilyClaimNotice({ type: "success", text: "נוצר קוד חד־פעמי. העתיקו אותו עכשיו והעבירו לבן המשפחה בערוץ פרטי." });
      await refreshFamilyClaims();
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [familyClaims.state, personId, refreshFamilyClaims]);

  const cancelAccountInvitation = useCallback(async (claim) => {
    const claimId = clean(claim?.id);
    const targetRef = clean(claim?.target_ref);
    if (!claimId || claim?.status !== "pending") return;
    setFamilyClaimBusy(`revoke:${claimId}`);
    setFamilyClaimNotice(null);
    try {
      await revokeFamilyClaim(claimId);
      setInvitationTokens(previous => {
        const next = { ...previous };
        delete next[targetRef];
        return next;
      });
      setInvitationEmails(previous => {
        const next = { ...previous };
        delete next[targetRef];
        return next;
      });
      setFamilyClaimNotice({ type: "success", text: "ההזמנה בוטלה. אפשר ליצור קוד חדש כשצריך." });
      await refreshFamilyClaims();
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [refreshFamilyClaims]);

  const redeemAccountInvitation = useCallback(async () => {
    const token = clean(claimToken);
    if (!token || familyClaims.state !== "ready") return;
    setFamilyClaimBusy("redeem");
    setFamilyClaimNotice(null);
    try {
      await redeemFamilyInvitation(token);
      setClaimToken("");
      setFamilyClaimNotice({ type: "success", text: "הזהות אומתה. לא הועבר מחקר פרטי ולא ניתנה גישה ל־Ledger של חשבון אחר." });
      await refreshFamilyClaims();
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [claimToken, familyClaims.state, refreshFamilyClaims]);

  const disconnectApprovedAccount = useCallback(async (claim) => {
    const claimId = clean(claim?.id);
    if (!claimId || claim?.status !== "approved") return;
    if (!window.confirm("לנתק את אימות החשבון מהזהות המשפחתית? המחקר הפרטי של שני החשבונות לא יימחק.")) return;
    setFamilyClaimBusy(`reverse:${claimId}`);
    setFamilyClaimNotice(null);
    try {
      await reverseFamilyClaim(claimId);
      setFamilyClaimNotice({ type: "success", text: "אימות החשבון נותק. רשומת בן המשפחה והמחקר הפרטי נשארו ללא שינוי." });
      await refreshFamilyClaims();
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [refreshFamilyClaims]);

  const copyInvitationToken = useCallback(async (targetRef) => {
    const token = invitationTokens[targetRef]?.token;
    if (!token || !globalThis.navigator?.clipboard?.writeText) return;
    try {
      await globalThis.navigator.clipboard.writeText(token);
      setFamilyClaimNotice({ type: "success", text: "קוד ההזמנה הועתק. שתפו אותו רק עם האדם שעבורו נוצר." });
    } catch {
      setFamilyClaimNotice({ type: "error", text: "לא ניתן להעתיק אוטומטית. אפשר לסמן ולהעתיק את הקוד ידנית." });
    }
  }, [invitationTokens]);

  const emailAccountInvitation = useCallback(async (targetRef) => {
    const invitation = invitationTokens[targetRef];
    const recipientEmail = clean(invitationEmails[targetRef]);
    if (!invitation?.claimId || !invitation?.token || !recipientEmail) return;
    setFamilyClaimBusy(`email:${targetRef}`);
    setFamilyClaimNotice(null);
    try {
      await sendFamilyInvitationEmail({
        claimId: invitation.claimId,
        rawToken: invitation.token,
        recipientEmail,
      });
      setInvitationEmails(previous => ({ ...previous, [targetRef]: "" }));
      setFamilyClaimNotice({ type: "success", text: "ההזמנה נמסרה לספק המייל. כתובת הנמען לא נשמרה במסע החיים." });
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [invitationEmails, invitationTokens]);

  const shareAccountInvitation = useCallback(async (targetRef) => {
    const token = invitationTokens[targetRef]?.token;
    if (!token) return;
    setFamilyClaimBusy(`share:${targetRef}`);
    setFamilyClaimNotice(null);
    try {
      const result = await shareFamilyInvitationPrivately(token);
      setFamilyClaimNotice({
        type: "success",
        text: result.channel === "clipboard"
          ? "נוסח ההזמנה הועתק. אפשר להדביק אותו בשיחה פרטית עם האדם שעבורו נוצר."
          : "חלון השיתוף הפרטי נפתח במכשיר.",
      });
    } catch (error) {
      setFamilyClaimNotice({ type: "error", text: familyClaimErrorMessage(error) });
    } finally {
      setFamilyClaimBusy(null);
    }
  }, [invitationTokens]);

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
      kind: "person_life",
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

  const openMemberCapability = useCallback((memberRef, view) => {
    const member = members.find(item => clean(item.source_ref) === clean(memberRef));
    if (!member) {
      setErr("האדם שנבחר אינו זמין כרגע במסע החיים.");
      return;
    }
    openCapability(member, view);
  }, [members, openCapability]);

  const returnToPerson = useCallback(() => {
    const patch = buildLifeJourneyExactReturnPatch(research.context);
    if (!patch || !research.updateResearchContext?.(patch)) {
      setErr("נקודת החזרה המדויקת אינה זמינה.");
    }
  }, [research]);

  const openFindingTraversal = useCallback((memberRef, finding) => {
    if (variant !== "2029" || !selfRef) return;
    const patch = buildLifeJourneyFindingTraversalPatch(research.context, {
      personRef: selfRef,
      memberRef,
      findingId: finding?.id,
      value: finding?.value,
      sourceRef: finding?.sourceRef,
      versionRef: finding?.versionRef,
      focusKind: finding?.focusKind,
    });
    if (!patch) {
      setErr("לא ניתן לפתוח את הממצא בלי הקשר אדם תקין.");
      return;
    }
    const result = research.continueResearchPath?.({
      context: patch,
      kind: "person_life",
      mode: "organic",
      surface: "life_journey_2029",
      href: patch.subject.href,
      label: "ממצא שם ותאריך",
      reason: "explicit_person_finding_traversal",
    });
    if (!result?.ok) {
      setErr("לא ניתן לפתוח כרגע את הממצא במסלול המחקר.");
      return;
    }
    navigate(patch.subject.href);
  }, [navigate, research, selfRef, variant]);

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
    setFamilyAnalysis({ state: "idle", data: null, error: null });
    setBirthReflections(new Map());
  }, [research, selfRef]);

  const updateFamilySelection = useCallback((memberRef, included) => {
    const nextRefs = included
      ? [...selectedFamilyRefs, memberRef]
      : selectedFamilyRefs.filter(ref => ref !== memberRef);
    commitFamilySelection(nextRefs);
  }, [commitFamilySelection, selectedFamilyRefs]);

  const deleteMember = useCallback(async (member) => {
    const targetRef = clean(member?.source_ref);
    if (!personId || !targetRef) return;
    const confirmed = window.confirm(`למחוק את ${clean(member?.name) || "בן המשפחה"} ממסע החיים? קשרים משפחתיים והזמנה ממתינה יוסרו גם הם.`);
    if (!confirmed) return;
    setBusy(true);
    setErr(null);
    try {
      await removeFamilyMember(personId, targetRef);
      commitFamilySelection(selectedFamilyRefs.filter(ref => ref !== targetRef));
      if (editingMemberRef === targetRef) resetMemberForm();
      await refresh(personId);
      await refreshFamilyClaims();
      setFamilyResearch({ state: "idle", rows: [], sharedValues: [], error: null });
      setFamilyAnalysis({ state: "idle", data: null, error: null });
      setBirthReflections(new Map());
      track("journey_person", null, "remove_member");
    } catch (error) {
      setErr(personJourneyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [commitFamilySelection, editingMemberRef, personId, refresh, refreshFamilyClaims, resetMemberForm, selectedFamilyRefs]);

  const analyzeCompletedFamilyResearch = useCallback(async (completedResearch) => {
    if (!completedResearch || completedResearch.state !== "ready") return null;
    setFamilyAnalysis({ state: "loading", data: null, error: null });
    try {
      const {
        createLifeJourneyFamilyAnalysisProviders,
        runLifeJourneyFamilyAnalysis,
      } = await import("../lib/research/lifeJourneyFamilyAnalysis.js");
      const providers = createLifeJourneyFamilyAnalysisProviders({ getAiAnalysis, supabase });
      const data = await runLifeJourneyFamilyAnalysis({
        research: completedResearch,
        birthReflections,
        ...providers,
      });
      const completedAnalysis = { state: "ready", data, error: null };
      setFamilyAnalysis(completedAnalysis);
      const snapshot = serializeLifeJourneyFamilySnapshot({
        personRef: selfRef,
        signature: familyResearchSignature,
        research: completedResearch,
        analysis: completedAnalysis,
      });
      if (snapshot) research.updateResearchContext?.(lifeJourneyFamilySnapshotPatch(snapshot));
      track("journey_person", null, "family_normalized_analysis_explicit");
      return data;
    } catch (error) {
      setFamilyAnalysis({ state: "error", data: null, error: personJourneyErrorMessage(error) });
      return null;
    }
  }, [birthReflections, familyResearchSignature, research, selfRef]);

  const rememberBirthReflection = useCallback((memberRef, result) => {
    const targetRef = clean(memberRef);
    if (!targetRef || !selectedFamilyRefSet.has(targetRef)) return;
    setBirthReflections(previous => {
      const next = new Map(previous);
      if (result && typeof result === "object" && !Array.isArray(result)) next.set(targetRef, result);
      else next.delete(targetRef);
      return next;
    });
  }, [selectedFamilyRefSet]);

  const updateMapPosition = useCallback(position => {
    const patch = buildLifeJourneyMapPositionPatch(research.context, { personRef: selfRef, ...position });
    if (patch) research.updateResearchContext?.(patch);
  }, [research, selfRef]);

  const savePrivateHint = useCallback(async input => {
    if (variant !== "2029" || !user || !selfRef) return { ok: false, error: "writer_unavailable" };
    const result = await saveLifeJourneyHintCapture({
      user,
      input,
      personRef: selfRef,
      authorizedMemberRefs: members.map(member => clean(member?.source_ref)).filter(Boolean),
      writeHint: addHint,
    });
    if (!result.ok) return result;
    setOwnedHints(previous => {
      const rows = previous.principal === userId && Array.isArray(previous.rows) ? previous.rows : [];
      return {
        principal: userId,
        loading: false,
        error: null,
        rows: [result.row, ...rows.filter(row => row?.id !== result.row.id)],
      };
    });
    return result;
  }, [members, selfRef, user, userId, variant]);

  const resumeLifeJourney = useCallback(result => {
    const materialized = materializeFamilyContext(result.context || result.representation?.context);
    setBirthReflections(new Map());
    setFamilyResearch(materialized?.research || { state: "idle", rows: [], sharedValues: [], error: null });
    setFamilyAnalysis(materialized?.analysis || { state: "idle", data: null, error: null });
    if (result.href && result.href !== "/2029/journey") navigate(result.href);
  }, [materializeFamilyContext, navigate]);

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
    setFamilyAnalysis({ state: "idle", data: null, error: null });
    const accessDescriptor = buildAccessDescriptor({
      user_ref: user.id,
      authenticated: true,
      verified_authority: { source: "supabase_auth", subject_verified: true },
    }, "authenticated_user");
    const crossProvider = createSupabasePersonalDateCrossProvider(supabase);
    const familyProviders = createSupabaseLifeJourneyFamilyProviders(supabase);

    try {
      const rowsPromise = Promise.all(selectedMembers.map(async member => {
        const profile = memberResearchProfile(member);
        try {
          const dateRepresentation = profile.birthdate
            ? gregorianToHebrewDateRepresentation(profile.birthdate)
            : null;
          const [nameResult, dateBundle] = await Promise.all([
            variant === "2029"
              ? runLifeJourneyNameResearch({ firstName: profile.first, surname: profile.last, fullName: profile.fullName })
              : getNameProtocol(profile.fullName),
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
            data: familyResearchSummary(nameResult, dateBundle, dateRepresentation),
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
      const unifiedPromise = runLifeJourneyFamilyResearch({
        members: selectedMembers.map(member => {
          const profile = memberResearchProfile(member);
          return {
            memberRef: clean(member.source_ref),
            fullName: profile.fullName,
            firstName: profile.first,
            surname: profile.last,
            birthdate: profile.birthdate,
          };
        }),
        providers: familyProviders,
      });
      const [rows, unified] = await Promise.all([rowsPromise, unifiedPromise]);
      const computedResearch = {
        state: "ready",
        rows,
        sharedValues: Array.isArray(unified.sharedValues) ? unified.sharedValues : sharedFamilyValues(rows),
        sharedExpressions: Array.isArray(unified.sharedExpressions) ? unified.sharedExpressions : [],
        methodNormalization: unified.methodNormalization || null,
        methodFindings: unified.methodFindings,
        relationRows: unified.relationRows,
        connections: unified.connections,
        message: unified.message,
        coverage: unified.coverage,
        error: null,
      };
      const sourceResearch = await runLifeJourneyFamilySourceResearch({
        members: selectedMembers.map(member => {
          const profile = memberResearchProfile(member);
          return { memberRef: clean(member.source_ref), fullName: profile.fullName };
        }),
        research: computedResearch,
        readers: createLifeJourneyFamilySourceReaders(),
      });
      const completedResearch = { ...computedResearch, sourceResearch };
      setFamilyResearch(completedResearch);
      const snapshot = serializeLifeJourneyFamilySnapshot({
        personRef: selfRef,
        signature: familyResearchSignature,
        research: completedResearch,
      });
      if (snapshot) research.updateResearchContext?.(lifeJourneyFamilySnapshotPatch(snapshot));
      track("journey_person", null, "family_research_explicit");
      await analyzeCompletedFamilyResearch(completedResearch);
    } catch (error) {
      setFamilyResearch({ state: "error", rows: [], sharedValues: [], error: personJourneyErrorMessage(error) });
    }
  }, [analyzeCompletedFamilyResearch, familyResearchSignature, members, research, selectedFamilyRefs, selfRef, user, variant]);

  const runFamilyAnalysis = useCallback(async () => {
    if (familyResearch.state !== "ready") return;
    await analyzeCompletedFamilyResearch(familyResearch);
  }, [analyzeCompletedFamilyResearch, familyResearch]);

  if (authLoading || loading) {
    return <div className={`person-journey ${variant === "2029" ? "is-2029" : ""}`}><div className="person-journey-state" aria-busy="true">טוען את מסע החיים…</div></div>;
  }

  if (!user) {
    return <section className="person-journey-login" data-experience-capability="life-journey-auth-gate">
      {variant === "2029" ? <div style={{ display: "flex", justifyContent: "center" }}>
        <SignatureResearchIcon name="journey" label="מסע החיים" />
      </div> : <span className="person-journey-symbol" aria-hidden="true">✦</span>}
      <h2>מסע החיים הוא מרחב פרטי</h2>
      <p>שם, תאריך ומשפחה נשמרים רק בהקשר האישי שלך. יש להתחבר כדי לפתוח מסע.</p>
      <a href={variant === "2029" ? "/login?returnTo=%2F2029%2Fjourney" : "/login"}>התחברות</a>
    </section>;
  }

  const activeView = variant === "2029" ? lifeJourneyViewFromContext(research.context, selfRef) : "person";
  const selectedMemberRef = clean(research.context?.dimensions?.lifeJourneyMemberRef);
  const selectedMember = members.find(member => member.source_ref === selectedMemberRef) || null;
  const selectedName = clean(selectedMember?.name);
  const selectedResearchProfile = selectedMember ? memberResearchProfile(selectedMember) : null;
  const selectedProfile = selectedResearchProfile ? {
    name: selectedResearchProfile.fullName,
    firstName: selectedResearchProfile.first,
    surname: selectedResearchProfile.last,
    birthdate: selectedResearchProfile.birthdate,
  } : null;

  if (activeView === "name" && selectedName && CapabilitySurface) {
    return <CapabilitySurface
      view="name"
      name={selectedName}
      profile={selectedProfile}
      personRef={selfRef}
      memberRef={selectedMemberRef}
      onContinue={() => continueSelectedCapability("date")}
      onReturn={returnToPerson}
    />;
  }

  if (activeView === "date" && selectedName && selectedProfile && CapabilitySurface) {
    return <CapabilitySurface
      view="date"
      user={user}
      profile={selectedProfile}
      personRef={selfRef}
      memberRef={selectedMemberRef}
      onContinue={returnToPerson}
      onReturn={returnToPerson}
    />;
  }

  const analysisData = analysis.data;

  const mapsBlock = selectedFamilyRefs.length ? <Suspense fallback={<LifeJourneyMapsLoading />}>
        <LifeJourneyMaps2029
          members={members}
          relations={relations}
          selectedRefs={selectedFamilyRefs}
          research={familyResearch}
          analysis={familyAnalysis}
          birthReflections={birthReflections}
          onBirthCalculationChange={rememberBirthReflection}
          context={research.context}
          position={variant === "2029" ? lifeJourneyMapPosition(research.context, selfRef, members.map(member => member.source_ref)) : undefined}
          onPositionChange={variant === "2029" ? updateMapPosition : undefined}
          birthTimeline={birthTimeline}
          hintState={variant === "2029" ? hintState : null}
          onSaveHint={variant === "2029" ? savePrivateHint : undefined}
          includeProgramBranches={variant === "2029"}
          onOpenCapability={variant === "2029" ? openMemberCapability : undefined}
        />
      </Suspense> : null;


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
        {variant === "2029" ? <div className="person-journey-hero-status" data-experience-capability="life-journey-status">
          <div className="person-journey-identity">
            <span className="person-journey-identity-name">{persistedSelf ? persistedSelf.name : "מסע חדש"}</span>
            <span className="person-journey-state-chip" data-state={persistedSelf ? "ready" : "waiting"}>{persistedSelf ? "מוכן למחקר השם" : "ממתין לשם"}</span>
          </div>
          {persistedSelf ? <button
            type="button"
            className="person-journey-primary"
            disabled={busy}
            onClick={() => openCapability(persistedSelf, "name")}
          >פתח את המחקר שלי</button> : <button
            type="button"
            className="person-journey-primary"
            onClick={() => { setPersonDetailsOpen(true); window.requestAnimationFrame?.(() => document.getElementById("life-journey-first-name")?.focus()); }}
          >מלאו את הפרטים שלכם</button>}
        </div> : null}
      </div>
    </section>

    {err ? <div className="person-journey-error" role="alert">{err}</div> : null}

    {variant === "2029" ? mapsBlock : null}

    <section className="person-journey-panel" data-experience-capability="life-journey-intake">
      <div className="person-journey-section-head">
        <div><small>01</small><h2>מי אני</h2></div>
        <span>נשמר פרטי</span>
      </div>
      <PersonalDetailsDisclosure variant={variant} open={personDetailsOpen} onToggle={setPersonDetailsOpen} summary={persistedSelf ? "פרטים אישיים · עריכה" : "פרטים אישיים"}>
      <div className="person-journey-fields">
        <label>
          <span>שם פרטי</span>
          <input id="life-journey-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="שם פרטי" dir="rtl" autoComplete="given-name" />
        </label>
        <label>
          <span>שם משפחה</span>
          <input value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="שם משפחה" dir="rtl" autoComplete="family-name" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input value={birthdate} onChange={(event) => setBirthdate(event.target.value)} type="date" dir="ltr" autoComplete="bday" />
        </label>
        {variant === "2029" ? <label>
          <span>שעת לידה מדויקת</span>
          <input value={birthTime} onChange={(event) => setBirthTime(event.target.value)} type="time" dir="ltr" autoComplete="bday-time" />
        </label> : null}
        {variant === "2029" ? <label>
          <span>מקום לידה</span>
          <input value={birthPlace} onChange={(event) => setBirthPlace(event.target.value)} placeholder="עיר או יישוב" dir="rtl" autoComplete="off" />
        </label> : null}
      </div>
      </PersonalDetailsDisclosure>
      <div className="person-journey-actions">
        <button type="button" className="person-journey-primary" disabled={busy || !clean(firstName)} onClick={beginJourney}>
          {busy ? "פותח את המסע…" : persistedSelf ? "עדכן וחבר מחדש" : "פתח את מסע החיים"}
        </button>
        <small>המנועים מחשבים ומצליבים; הם לא קובעים אופי, גורל או אמת אישית.</small>
      </div>
    </section>

    {variant !== "2029" ? <section className="person-journey-panel" data-experience-capability="life-journey-first-findings">
      <div className="person-journey-section-head">
        <div><small>02</small><h2>החיבורים הראשונים</h2></div>
        <span>{variant === "2029" ? (persistedSelf ? "מוכן למחקר השם" : "ממתין לשם") : analysis.state === "ready" ? "מנועים חיים" : "ממתין לקלט"}</span>
      </div>

      {variant === "2029" ? <article className="person-journey-research-entry">
        <div>
          <small>שם · תאריך · כל השיטות הזמינות · כל הזוגות</small>
          <h3>מטריצת המחקר האישית</h3>
          <p>התאריך מתפרק לביטויים עבריים, כל ביטוי עובר בשיטות הגימטריה הזמינות, והחיבורים מנורמלים לפני שנוצר מסר.</p>
        </div>
      </article> : null}

      {variant !== "2029" && analysis.state === "idle" ? <div className="person-journey-empty">אחרי שמירה נציג כאן רק עובדות מנוע ונגזרות: ערכי השם, התאריך העברי ונקודות מפגש שנמצאו.</div> : null}
      {variant !== "2029" && analysis.state === "loading" ? <CanonicalProgress
        title="מחבר את המסע הראשון"
        detail="בודק את השם, ממיר את התאריך ומחפש נקודות מפגש דרך המנועים הקנוניים."
        phase="מחקר אישי"
        compact
      /> : null}
      {variant !== "2029" && analysis.state === "error" ? <div className="person-journey-error" role="alert">{analysis.error}</div> : null}
      {variant !== "2029" && analysis.state === "ready" && analysisData ? <div className="person-journey-findings">
        <div className="person-journey-focal">
          <small>השם המלא</small>
          <strong>{analysisData.fullValue ?? "—"}</strong>
          <span>גימטריה רגילה · תוצאת מנוע</span>
        </div>
        <div className="person-journey-fact-grid">
          {variant === "2029" ? analysisData.methodFindings.filter(item => item.methodKey !== "ragil").map((item) => <article key={item.id}>
            <small>{item.methodLabel}</small>
            <button
              type="button"
              className="person-journey-finding-link"
              onClick={() => openFindingTraversal(selfRef, { ...item, focusKind: "life_journey_gematria" })}
              aria-label={`פתח ${item.methodLabel} ${item.value} בדף המספר`}
            >{item.value}</button>
            <span>תוצאת מנוע קנונית</span>
          </article>) : analysisData.partValues.map(item => <article key={item.label}>
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
        {analysisData.crossFindings.length ? <div className="person-journey-crosses">
          <small>נקודות מפגש שם ↔ תאריך</small>
          <div>{analysisData.crossFindings.map((finding) => <button
            type="button"
            className="person-journey-finding-link"
            key={`${finding.id}:${finding.value}`}
            onClick={() => openFindingTraversal(selfRef, finding)}
            aria-label={`פתח את ממצא ${finding.value}`}
          >{finding.value}</button>)}</div>
          <p>כל מספר פותח במפורש את דף המספר הקיים. נקודת מפגש היא עובדה מחושבת; המשמעות שלה נשארת שאלה למחקר.</p>
        </div> : null}
      </div> : null}
    </section> : null}

    <section className="person-journey-panel" data-experience-capability="life-journey-family">
      <div className="person-journey-section-head">
        <div><small>{variant === "2029" ? "02" : "03"}</small><h2>המשפחה שלי</h2></div>
        <span>{familyMembers.length ? `${familyMembers.length} אנשים` : "אפשר להתחיל מאדם אחד"}</span>
      </div>

      {members.length ? <fieldset className="person-journey-family-scope">
        <legend>מי משתתף במחקר המשפחתי?</legend>
        <p id="life-journey-family-scope-help">הבחירה נשמרת ב־Research Context בלבד. היא אינה מפעילה חיפוש או מנוע.</p>
        <div aria-describedby="life-journey-family-scope-help">
          {members.map(member => {
            const memberRef = clean(member.source_ref);
            const memberMeta = metaObject(member.meta);
            const identityClaim = latestClaimByTarget.get(memberRef);
            return <article className="person-journey-family-member" data-selected={selectedFamilyRefSet.has(memberRef) ? "true" : "false"} key={memberRef}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedFamilyRefSet.has(memberRef)}
                  onChange={event => updateFamilySelection(memberRef, event.target.checked)}
                />
                <span>
                  <strong>{member.name}</strong>
                  <small>{memberRef === selfRef ? "חשבון ראשי מחובר" : "זהות משפחתית · חשבון עתידי אפשרי"}</small>
                  {memberMeta.birthdate_iso ? <small dir="ltr" className="person-journey-numeric">{memberMeta.birthdate_iso}</small> : null}
                  {variant === "2029" && identityClaim?.status === "approved" ? <small className="person-journey-member-verified">זהות החשבון אומתה</small> : null}
                  {variant === "2029" ? null : <>
                    <small className="person-journey-member-source">
                      מקור הפרטים: {memberRef === selfRef || memberMeta.profile_source === "account_owner_entered" ? "הוזן בחשבון שלך" : "הוזן על ידך במסע החיים"}
                      {identityClaim?.status === "approved" ? " · זהות החשבון אומתה" : memberRef === selfRef ? "" : " · זהות ניתנת לחיבור לחשבון"}
                    </small>
                  </>}
                </span>
              </label>
              {variant === "2029" ? <details className="person-journey-member-more">
                <summary>פרטי לידה ומקור</summary>
                <div>
                  {memberMeta.birth_time_local ? <small dir="ltr">שעת לידה · {memberMeta.birth_time_local}</small> : null}
                  {memberMeta.birth_place ? <small>מקום לידה · {memberMeta.birth_place}</small> : null}
                  <small className="person-journey-member-source">
                    מקור הפרטים: {memberRef === selfRef || memberMeta.profile_source === "account_owner_entered" ? "הוזן בחשבון שלך" : "הוזן על ידך במסע החיים"}
                    {identityClaim?.status === "approved" || memberRef === selfRef ? "" : " · זהות ניתנת לחיבור לחשבון"}
                  </small>
                </div>
              </details> : null}
              {variant === "2029" ? <div className="person-journey-member-actions">
                <button type="button" disabled={busy} onClick={() => openCapability(member, "name")}>פתח מחקר שם</button>
                {memberRef !== selfRef ? <>
                  <button type="button" disabled={busy} onClick={() => startEditingMember(member)}>עריכה</button>
                  <button type="button" disabled={busy} onClick={() => deleteMember(member)}>מחיקה</button>
                </> : null}
              </div> : <span>פרטי</span>}
            </article>;
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

      {variant === "2029" ? <details className="person-journey-secondary-tools">
        <summary>חיבור חשבונות והזמנות</summary>
        <section
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
        {familyClaims.state === "loading" || familyClaims.state === "idle" ? <div className="person-journey-claim-state" aria-busy="true">בודק את מצב חיבורי החשבון…</div> : null}
        {familyClaims.state === "unavailable" ? <div className="person-journey-claim-state" role="status">{familyClaims.error}</div> : null}
        {familyClaims.state === "ready" ? <>
          {familyMembers.length ? <div className="person-journey-claim-list" aria-label="חיבורי חשבון לבני המשפחה">
            {familyMembers.map(member => {
              const targetRef = clean(member.source_ref);
              const claim = latestClaimByTarget.get(targetRef) || null;
              const invitation = invitationTokens[targetRef] || null;
              const invitationToken = invitation?.token || null;
              const activeClaim = claim && ["pending", "approved"].includes(claim.status);
              return <article key={targetRef}>
                <header>
                  <div><strong>{member.name}</strong><small>ה־person-ref הקיים נשמר</small></div>
                  <span data-status={claim?.status || "none"}>{claim ? FAMILY_CLAIM_STATUS[claim.status] || claim.status : "אין חיבור"}</span>
                </header>
                {claim?.status === "approved" ? <p>החשבון הנפרד אומת מול הזהות הזאת. המחקר הפרטי נשאר אצל בעליו.</p> : null}
                {claim?.status === "pending" && !invitationToken ? <p>קיימת הזמנה ממתינה. הקוד הגולמי אינו נשמר; אם הוא אבד, בטלו וצרו קוד חדש.</p> : null}
                {invitationToken ? <div className="person-journey-invitation-token">
                  <small>קוד חד־פעמי · מוצג רק בזיכרון המסך הנוכחי</small>
                  <code dir="ltr">{invitationToken}</code>
                  <button type="button" onClick={() => copyInvitationToken(targetRef)}>העתק קוד הזמנה</button>
                  <details className="person-journey-invitation-delivery">
                    <summary>שליחה פרטית</summary>
                    <p>המייל נשלח רק בלחיצה. הכתובת אינה נשמרת, והקוד אינו נכנס לקישור.</p>
                    <label>
                      <span>מייל של מקבל/ת ההזמנה</span>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={invitationEmails[targetRef] || ""}
                        onChange={event => setInvitationEmails(previous => ({ ...previous, [targetRef]: event.target.value }))}
                        placeholder="name@example.com"
                        dir="ltr"
                      />
                    </label>
                    <div>
                      <button
                        type="button"
                        disabled={Boolean(familyClaimBusy) || !clean(invitationEmails[targetRef])}
                        onClick={() => emailAccountInvitation(targetRef)}
                      >{familyClaimBusy === `email:${targetRef}` ? "שולח…" : "שלח במייל"}</button>
                      <button
                        type="button"
                        disabled={Boolean(familyClaimBusy)}
                        onClick={() => shareAccountInvitation(targetRef)}
                      >{familyClaimBusy === `share:${targetRef}` ? "פותח שיתוף…" : "שתף באופן פרטי"}</button>
                    </div>
                    <small>בדקו את הכתובת לפני השליחה. לתיקון נמען לאחר שליחה, בטלו את ההזמנה וצרו קוד חדש.</small>
                  </details>
                </div> : null}
                <footer>
                  {!activeClaim ? <button
                    type="button"
                    disabled={Boolean(familyClaimBusy)}
                    onClick={() => createAccountInvitation(member)}
                  >{familyClaimBusy === `invite:${targetRef}` ? "יוצר קוד…" : "צור הזמנה לחיבור חשבון"}</button> : null}
                  {claim?.status === "pending" ? <button
                    type="button"
                    disabled={Boolean(familyClaimBusy)}
                    onClick={() => cancelAccountInvitation(claim)}
                  >{familyClaimBusy === `revoke:${claim.id}` ? "מבטל…" : "בטל הזמנה"}</button> : null}
                  {claim?.status === "approved" ? <button
                    type="button"
                    disabled={Boolean(familyClaimBusy)}
                    onClick={() => disconnectApprovedAccount(claim)}
                  >{familyClaimBusy === `reverse:${claim.id}` ? "מנתק…" : "נתק אימות חשבון"}</button> : null}
                </footer>
              </article>;
            })}
          </div> : null}
          <div className="person-journey-claim-redeem">
            <div>
              <strong>קיבלתי קוד הזמנה</strong>
              <small>מדביקים את הקוד רק כאן, מתוך החשבון הנפרד. הוא אינו נכנס לכתובת או להיסטוריית המחקר.</small>
            </div>
            <label>
              <span>קוד הזמנה</span>
              <input
                type="password"
                value={claimToken}
                onChange={event => setClaimToken(event.target.value)}
                dir="ltr"
                autoComplete="one-time-code"
                spellCheck="false"
              />
            </label>
            <button
              type="button"
              disabled={Boolean(familyClaimBusy) || !clean(claimToken)}
              onClick={redeemAccountInvitation}
            >{familyClaimBusy === "redeem" ? "מאמת…" : "אמת וחבר את הזהות"}</button>
          </div>
          <div className="person-journey-claim-tools">
            <button type="button" disabled={Boolean(familyClaimBusy)} onClick={refreshFamilyClaims}>רענן סטטוסים</button>
            <small>החיבור מאמת זהות בלבד. שיתוף מחקר דורש הרשאה נפרדת שאינה פתוחה כאן.</small>
          </div>
          {familyClaimNotice ? <div className="person-journey-claim-notice" data-state={familyClaimNotice.type} role={familyClaimNotice.type === "error" ? "alert" : "status"}>{familyClaimNotice.text}</div> : null}
        </> : null}
        </section>
      </details> : null}

      {variant !== "2029" ? mapsBlock : null}

      {variant === "2029" && selfRef ? <LifeJourneyResume2029 research={research} personRef={selfRef} readOnly={import.meta.env.VITE_INTEGRATED_PREVIEW === "true"} onResume={resumeLifeJourney} /> : null}

      {members.length ? <div className="person-journey-family-research-actions">
        <button
          type="button"
          className="person-journey-primary"
          disabled={!selectedFamilyRefs.length || selectedFamilyRefs.length > MAX_FAMILY_RESEARCH_MEMBERS || familyResearch.state === "loading" || familyAnalysis.state === "loading"}
          onClick={runSelectedFamilyResearch}
        >
          {familyResearch.state === "loading"
            ? "בונה את מפת החיבורים…"
            : familyAnalysis.state === "loading"
              ? "מסכם את הממצאים…"
            : selectedFamilyRefs.length === 1
              ? "בנה מפה לאדם שנבחר"
              : `בנה מפת חיבורים ל־${selectedFamilyRefs.length} אנשים`}
        </button>
        <small>לחיצה אחת בודקת ביטויים שווי־ערך, חיבורים ומקורות תנ״ך, ומציגה סיכום ברור. ELS אינו משתתף בשלב הזה.</small>
      </div> : null}

      {familyResearch.state === "loading" ? <CanonicalProgress
        title="בונה מפת מחקר משפחתית"
        detail="בודק רק את האנשים שבחרת, ואז מצרף ביטויים ומקורות מהמנועים הקנוניים הקיימים."
        phase="משפחה ↔ שם ↔ תאריך ↔ מקורות"
        compact
      /> : null}
      {familyResearch.state === "error" ? <div className="person-journey-error" role="alert">{familyResearch.error}</div> : null}
      {familyResearch.state === "ready" ? <section className="person-journey-family-research" aria-label="מפת החיבורים המשפחתית">
        <div className="person-journey-family-research-head">
          <div><small>בדיקה שביקשת</small><h3>מפת החיבורים המשפחתית</h3></div>
          <span>{familyResearch.rows.filter(row => row.state === "ready").length} מתוך {familyResearch.rows.length} הושלמו</span>
        </div>
        {familyAnalysis.state === "loading" ? <CanonicalProgress
          title="מסכם את מפת החיבורים"
          detail="הסיכום נבנה רק מהממצאים שכבר חושבו; בדיקת ההשתקפות נשארת פנימית."
          phase="נרמול → סינתזה → אימות פנימי"
          compact
        /> : null}
        {familyAnalysis.state === "ready" && familyAnalysis.data ? <FamilyAnalysisDisclosure variant={variant}><article
          className="person-journey-family-analysis"
          data-experience-capability="life-journey-family-normalized-analysis"
          aria-labelledby="life-journey-family-analysis-title"
        >
          <header>
            <div><small>סיכום מתוך הממצאים המנורמלים</small><h3 id="life-journey-family-analysis-title">התמונה המשפחתית</h3></div>
            <span>{familyAnalysis.data.coverage.connectionCount} חיבורים · {familyAnalysis.data.coverage.searchedPairCount} זוגות נבדקו</span>
          </header>
          <p>{familyAnalysis.data.message}</p>
          {familyResearch.sourceResearch?.coverage ? <div className="person-journey-family-source-summary">
            <span>{familyResearch.sourceResearch.coverage.equalPhraseCount} ביטויים שווי־ערך</span>
            <span>{familyResearch.sourceResearch.coverage.verseCount} פסוקים</span>
            <span>{familyResearch.sourceResearch.coverage.returnedMemberCount} אנשים עם שכבת מקור</span>
          </div> : null}
          <details>
            <summary>על מה הסיכום נשען?</summary>
            <ul>{familyAnalysis.data.claims.map(claim => <li key={claim.id}>{claim.text}</li>)}</ul>
          </details>
          <footer>הסיכום נוסח רק מתוצאות המנוע שכבר חושבו. בדיקות פנימיות אינן מוצגות, אינן ראיה ואינן משנות את הממצאים.</footer>
        </article></FamilyAnalysisDisclosure> : null}
        {familyAnalysis.state === "error" || familyAnalysis.state === "idle" ? <>
          <article className="person-journey-research-message" aria-label="סיכום מפת החיבורים המשפחתית">
          <small>מפה משפחתית מאוחדת · מנורמלת</small>
          <h3>המשפחה כמטריצה אחת</h3>
          <p>{familyResearch.message}</p>
          <span>{familyResearch.coverage?.expressionCount || 0} ביטויי שם ותאריך יצרו {familyResearch.coverage?.searchedPairCount || 0} זוגות מועמדים שנבדקו. נשמר עותק עבודה פרטי ב־Research Context; הוא אינו אמת על המשפחה.</span>
          </article>
          <div className="person-journey-family-analysis-actions">
            <button
              type="button"
              className="person-journey-primary"
              onClick={runFamilyAnalysis}
            >{familyAnalysis.state === "error" ? "נסה שוב ליצור סיכום" : "הצג סיכום מהמפה השמורה"}</button>
            <small role={familyAnalysis.state === "error" ? "alert" : undefined}>{familyAnalysis.state === "error" ? familyAnalysis.error : "המפה שוחזרה מהזיכרון הפרטי בלי להפעיל מחדש את מנוע הניסוח."}</small>
          </div>
        </> : null}
        {familyResearch.coverage?.truncated ? <p className="person-journey-note">מספר זוגות הביטויים עבר את גבול ההפעלה הבטוח. מוצג חתך מפורש ומדווח; לא הומצאה השלמה לזוגות שלא נבדקו.</p> : null}
        <details className="person-journey-deep-results">
          <summary>פתח פירוט מלא של הממצאים והמקורות</summary>
          <div>
        {familyResearch.connections?.length ? <section className="person-journey-relation-list" aria-label="חיבורים מנורמלים בין בני המשפחה">
          <header><div><small>הצלבות בין אנשים</small><h3>חיבורים שנמצאו</h3></div><span>{familyResearch.connections.length} חיבורים</span></header>
          <div>{familyResearch.connections.map(connection => <article key={connection.id}>
            <p><strong>{connection.left.name}</strong> · {connection.left.expressionLabel} ↔ <strong>{connection.right.name}</strong> · {connection.right.expressionLabel}</p>
            <small>{Number.isSafeInteger(connection.independentGroupCount) ? `${connection.independentGroupCount} קבוצות שיטה עצמאיות לאחר נרמול` : "חיבור מנוע שעבר נרמול תלות"} · {connection.expressionConnectionCount || 1} חיבורי ביטויים בזוג הזה</small>
          </article>)}</div>
        </section> : null}
        {familyResearch.sharedValues.length ? <div className="person-journey-family-shared" data-kind="cross-expression">
          <small>התכנסויות בין ביטויים שונים</small>
          <div>{familyResearch.sharedValues.slice(0, MAX_VISIBLE_FAMILY_CONVERGENCES)
            .map(item => <FamilyConvergenceChip item={item} key={item.value} />)}</div>
          {familyResearch.sharedValues.length > MAX_VISIBLE_FAMILY_CONVERGENCES ? <details className="person-journey-family-shared-more">
            <summary>עוד {familyResearch.sharedValues.length - MAX_VISIBLE_FAMILY_CONVERGENCES} התכנסויות מחושבות</summary>
            <div>{familyResearch.sharedValues.slice(MAX_VISIBLE_FAMILY_CONVERGENCES)
              .map(item => <FamilyConvergenceChip item={item} key={item.value} />)}</div>
          </details> : null}
          <p>כאן נספרים רק ביטויים שונים. שיטות שקובצו לפי Registry ושם משפחה זהה אינם מנפחים את מספר הראיות.</p>
        </div> : <p className="person-journey-note">לא נמצאה כרגע התכנסות בין ביטויים שונים של האנשים שנבחרו. זו אינה קביעה שאין קשר.</p>}
        {familyResearch.sharedExpressions?.length ? <div className="person-journey-family-shared" data-kind="shared-expression">
          <small>ביטויים משפחתיים משותפים · לא התכנסות עצמאית</small>
          <div>{familyResearch.sharedExpressions.map(item => <span key={item.id}>
            <strong>{item.expressionText}</strong> · {item.memberCount} אנשים · {item.valueCount} ערכים
          </span>)}</div>
          <p>אותו ביטוי שחוזר אצל כמה בני משפחה מוצג פעם אחת, כעוגן משפחתי משותף.</p>
        </div> : null}
        {familyResearch.methodNormalization?.collapsedMethodResultCount > 0 ? <details className="person-journey-normalization-note">
          <summary>איך נוטרלו כפילויות השיטות?</summary>
          <p>{familyResearch.methodNormalization.collapsedMethodResultCount} תוצאות מקבילות קובצו לפי כללי התלות הקנוניים של הקלט. רגיל וגדול נספרים יחד רק כשאין אות סופית; כך גם זוגות מקבילים נוספים שה־Registry מאשר.</p>
        </details> : null}
        {familyResearch.sourceResearch?.numberSources?.some(source => source.phrases.length) ? <section
          className="person-journey-family-sources"
          data-experience-capability="life-journey-family-number-sources"
          aria-labelledby="life-journey-family-number-sources-title"
        >
          <header>
            <div><small>התאמות־ערך קנוניות</small><h3 id="life-journey-family-number-sources-title">מילים וביטויים סביב המספרים</h3></div>
            <span>מאגר הגימטריה המאומת</span>
          </header>
          <p>אלה ביטויים בעלי אותו ערך במאגר המאומת. שוויון מספרי הוא כיוון למחקר — לא הוכחת משמעות או קשר משפחתי.</p>
          <div>{familyResearch.sourceResearch.numberSources.filter(source => source.phrases.length).map(source => <article key={source.value}>
            <strong>{source.value}</strong>
            <div>{source.phrases.map(phrase => <span key={phrase.id} title={`שיטות: ${phrase.methods.join(" · ")}`}>{phrase.phrase}</span>)}</div>
          </article>)}</div>
        </section> : null}
        <div className="person-journey-family-research-grid">
          {familyResearch.rows.map(row => {
            const memberSources = familyResearch.sourceResearch?.memberSources?.find(item => item.memberRef === row.memberRef) || null;
            return <article key={row.memberRef}>
            <header><strong>{row.name}</strong><small>{row.data?.hebrewDate || "תאריך עברי לא זמין"}</small></header>
            {row.state === "ready" ? <>
              <dl>
                <div><dt>ערך השם</dt><dd>{row.data.fullValue ?? "—"}</dd></div>
                <div><dt>{variant === "2029" ? "שיטות שחזרו" : "שכבות עם תוצאה"}</dt><dd>{row.data.tracksWithResults}</dd></div>
                <div><dt>נקודות מפגש</dt><dd>{row.data.crossValues.length}</dd></div>
              </dl>
              {variant === "2029" && row.data.methodFindings.length ? <div className="person-journey-family-cross-values">{row.data.methodFindings.map(finding => <button
                type="button"
                className="person-journey-finding-link"
                key={finding.id}
                onClick={() => openFindingTraversal(row.memberRef, { ...finding, focusKind: "life_journey_gematria" })}
                aria-label={`פתח ${finding.methodLabel} ${finding.value} של ${row.name}`}
              >{finding.methodLabel} {finding.value}</button>)}</div> : null}
              {row.data.crossFindings.length ? <div className="person-journey-family-cross-values">{row.data.crossFindings.map(finding => <button
                type="button"
                className="person-journey-finding-link"
                key={`${finding.id}:${finding.value}`}
                onClick={() => openFindingTraversal(row.memberRef, finding)}
                aria-label={`פתח את ממצא ${finding.value} של ${row.name}`}
              >{finding.value}</button>)}</div> : null}
              {memberSources?.verses?.length ? <section className="person-journey-member-sources" aria-label={`פסוק לשם של ${row.name}`}>
                <header><strong>פסוק לשם</strong><small>מקור מקראי קנוני</small></header>
                <CanonicalVerseCards2029 rows={memberSources.verses.slice(0, 1)} variant="name" compact />
                {memberSources.verses.length > 1 ? <details>
                  <summary>פתח פסוק נוסף</summary>
                  <CanonicalVerseCards2029 rows={memberSources.verses.slice(1)} variant="name" compact />
                </details> : null}
                <small>{memberSources.tracksWithResults} מסלולי מקור החזירו תוצאה · ללא ELS</small>
              </section> : null}
              {row.data.partial ? <small>שכבת השם לא הייתה זמינה; מוצג המידע שחושב מהתאריך בלבד.</small> : null}
            </> : <p>{row.error}</p>}
          </article>;})}
        </div>
          </div>
        </details>
      </section> : null}

      {!familyMembers.length ? <div className="person-journey-empty">עוד לא הוספת בני משפחה. אפשר להוסיף שם ותאריך, ולקשור כהורה או ילד/ה כשזה ידוע.</div> : null}

      <div className="person-journey-family-form">
        {editingMemberRef ? <div className="person-journey-note" role="status">עריכת בן משפחה קיים. הקשר המשפחתי נשמר ללא שינוי.</div> : null}
        <label>
          <span>שם בן/בת משפחה</span>
          <input value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} placeholder="שם מלא" dir="rtl" />
        </label>
        <label>
          <span>תאריך לידה</span>
          <input value={newMemberBirthdate} onChange={(event) => setNewMemberBirthdate(event.target.value)} type="date" dir="ltr" />
        </label>
        {variant === "2029" ? <label>
          <span>שעת לידה מדויקת</span>
          <input value={newMemberBirthTime} onChange={(event) => setNewMemberBirthTime(event.target.value)} type="time" dir="ltr" />
        </label> : null}
        {variant === "2029" ? <label>
          <span>מקום לידה</span>
          <input value={newMemberBirthPlace} onChange={(event) => setNewMemberBirthPlace(event.target.value)} placeholder="עיר או יישוב" dir="rtl" autoComplete="off" />
        </label> : null}
        <label>
          <span>הקשר אליי</span>
          <select value={newMemberRelation} disabled={Boolean(editingMemberRef)} onChange={(event) => setNewMemberRelation(event.target.value)}>
            {RELATIONS.map((relation) => <option key={relation.id} value={relation.id}>{relation.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !clean(newMemberName)} onClick={saveMember}>{editingMemberRef ? "שמור שינויים" : "הוסף למסע"}</button>
        {editingMemberRef ? <button type="button" disabled={busy} onClick={resetMemberForm}>ביטול עריכה</button> : null}
      </div>

      {relations.length ? <div className="person-journey-relations" aria-label="קשרים משפחתיים">
        {relations.map((relation) => <div key={relation.source_ref}>
          <span>{nameByRef(relation.parent_ref)}</span>
          <b>הורה של</b>
          <span>{nameByRef(relation.child_ref)}</span>
        </div>)}
      </div> : null}
    </section>

    {variant === "2029" && CapabilitySurface && !selectedFamilyRefs.length
      ? <CapabilitySurface view="hints" user={user} hintState={hintState} hintMembers={members} onSaveHint={savePrivateHint} />
      : null}

    <section className="person-journey-next" data-experience-capability="life-journey-next">
      <div>
        <small>השלב הבא</small>
        <h2>המסע גדל איתך</h2>
        <p>אירועי הלידה והמקומות שכבר נשמרו מחוברים לאותו Person context. אירועים נוספים יצטרפו בהמשך בלי מערכת מקבילה.</p>
      </div>
      <span aria-hidden="true">→</span>
    </section>
  </div>;
}
