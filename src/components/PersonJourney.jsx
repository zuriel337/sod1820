import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { getOrCreateMyPersonId, upsertSelfProfile, upsertFamilyMember, upsertFamilyRelation, listFamily } from "../lib/supabase.js";

// 🧭 מסע החיים — יסוד (v1). person-ref-scoped, גיבוי ב-Ledger הפרטי (research_objects,
// F-1a′/F-1b, docs/planning/sql/fn_family_private_slice.sql). זהו היסוד שעליו יבנה בעתיד
// Journey אמיתי (ניווט-גרף בין ממצאי-מחקר שמתייחסים לאדם, לפי #187 §4) — v1 הזה עוד לא
// מצליב עם ELS/גימטריה/שמות, רק מקים את זהות-האדם וקשרי-המשפחה שה-Journey יעבור עליהם.
// ⛔ נבדל במפורש מ-FamilyCross.jsx (התכנסויות-גימטריה בין שמות, localStorage בלבד) ומ-
// LifeProfile.jsx (מפת-שדה אישית, localStorage בלבד) — שני כלים קיימים ונפרדים, לא נגעתי בהם.
// כל קשר-משפחה כרגע הוא בין בן-משפחה לבין "אני" בלבד (v1); קשרים בין שני בני-משפחה
// (למשל אח-אח) הם הרחבה עתידית, לא כאן.

const RELATIONS = [
  { id: "parent_of_me", label: "הורה שלי" },
  { id: "child_of_me", label: "ילד/ה שלי" },
];

export default function PersonJourney() {
  const { user, loading: authLoading } = useAuth();
  const [personId, setPersonId] = useState(null);
  const [selfName, setSelfName] = useState("");
  const [members, setMembers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [newName, setNewName] = useState("");
  const [relMember, setRelMember] = useState("");
  const [relDirection, setRelDirection] = useState("parent_of_me");
  const [busy, setBusy] = useState(false);

  const selfRef = personId ? `person:${personId}:self` : null;

  const refresh = useCallback(async (pid) => {
    const data = await listFamily(pid);
    const mem = data.members || [];
    setMembers(mem);
    setRelations(data.relations || []);
    const selfRow = mem.find(m => m.source_ref === `person:${pid}:self`);
    if (selfRow) setSelfName(selfRow.name || "");
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const pid = await getOrCreateMyPersonId();
        if (!alive) return;
        setPersonId(pid);
        await refresh(pid);
      } catch (e) {
        if (alive) setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, authLoading, refresh]);

  const saveSelf = async () => {
    if (!personId || !selfName.trim()) return;
    setBusy(true); setErr(null);
    try {
      await upsertSelfProfile(personId, selfName.trim());
      await refresh(personId);
    } catch (e) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const addMember = async () => {
    if (!personId || !newName.trim()) return;
    setBusy(true); setErr(null);
    try {
      await upsertFamilyMember(personId, null, newName.trim());
      setNewName("");
      await refresh(personId);
    } catch (e) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const addRelation = async () => {
    if (!personId || !relMember || !selfRef) return;
    setBusy(true); setErr(null);
    try {
      const parentRef = relDirection === "parent_of_me" ? relMember : selfRef;
      const childRef = relDirection === "parent_of_me" ? selfRef : relMember;
      await upsertFamilyRelation(personId, parentRef, childRef, "parent_of");
      setRelMember("");
      await refresh(personId);
    } catch (e) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const nameByRef = (ref) => {
    const m = members.find(x => x.source_ref === ref);
    if (ref === selfRef) return m?.name ? `${m.name} (אני)` : "אני";
    return m?.name || ref;
  };

  const inputStyle = { flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "inherit", fontSize: 16 };
  const selectStyle = { padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15 };

  if (authLoading || loading) {
    return <div className="rw-card rw-muted">טוען…</div>;
  }

  if (!user) {
    return (
      <div className="rw-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>🧭</div>
        <div style={{ fontWeight: 800, fontSize: 19, color: "var(--ink)", marginBottom: 8 }}>מסע החיים דורש חשבון</div>
        <div className="rw-muted" style={{ maxWidth: 380, margin: "0 auto 16px" }}>
          המידע כאן פרטי לגמרי — רק אתם רואים אותו. יש להתחבר כדי להתחיל.
        </div>
        <a href="/login" className="rw-tchip on" style={{ textDecoration: "none", display: "inline-block" }}>🔐 התחברות</a>
      </div>
    );
  }

  const familyMembers = members.filter(m => m.source_ref !== selfRef);

  return (
    <div>
      <div className="rw-h1">🧭 מסע החיים — יסוד</div>
      <div className="rw-sub">
        השלב הראשון של מסע-חיים אמיתי: מי אתם ומי בני המשפחה שלכם, וקשרי-משפחה ביניכם.
        <b> הכל פרטי</b> — רק אתם רואים את זה, נשמר בענן. הצלבה עם ממצאי-מחקר
        (דילוגי-אותיות, גימטריה, שמות) תתווסף בהמשך — עדיין לא קיימת כאן.
      </div>

      {err && (
        <div className="rw-card" style={{ borderColor: "#e0503f", color: "#e0503f", marginBottom: 12 }}>{err}</div>
      )}

      <div className="rw-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8, color: "var(--ink)" }}>👤 מי אני</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={selfName} onChange={e => setSelfName(e.target.value)} placeholder="השם שלכם" dir="rtl" style={inputStyle} />
          <button className="rw-tchip on" disabled={busy || !selfName.trim()} onClick={saveSelf}>שמור</button>
        </div>
      </div>

      <div className="rw-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8, color: "var(--ink)" }}>👨‍👩‍👧 בני משפחה</div>
        {familyMembers.length === 0 && <div className="rw-muted" style={{ marginBottom: 8 }}>עדיין לא הוספתם אף אחד.</div>}
        {familyMembers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {familyMembers.map(m => <span key={m.source_ref} className="rw-chip">{m.name}</span>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם בן/בת משפחה" dir="rtl" style={inputStyle} />
          <button className="rw-tchip on" disabled={busy || !newName.trim()} onClick={addMember}>➕ הוסף</button>
        </div>
      </div>

      {familyMembers.length > 0 && (
        <div className="rw-card">
          <div style={{ fontWeight: 800, marginBottom: 8, color: "var(--ink)" }}>🔗 קשר משפחתי</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <select value={relMember} onChange={e => setRelMember(e.target.value)} style={selectStyle}>
              <option value="">בחרו בן משפחה…</option>
              {familyMembers.map(m => <option key={m.source_ref} value={m.source_ref}>{m.name}</option>)}
            </select>
            <span>הוא/היא ה-</span>
            <select value={relDirection} onChange={e => setRelDirection(e.target.value)} style={selectStyle}>
              {RELATIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <span>שלי</span>
            <button className="rw-tchip on" disabled={busy || !relMember} onClick={addRelation}>שמור קשר</button>
          </div>
          {relations.length > 0 && (
            <div style={{ display: "grid", gap: 4 }}>
              {relations.map(r => (
                <div key={r.source_ref} className="rw-muted" style={{ fontSize: 13 }}>
                  {nameByRef(r.parent_ref)} ← הורה של ← {nameByRef(r.child_ref)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
