import React, { useState, useEffect, useCallback, useRef, useId } from "react";
import { supabase } from "../lib/supabase.js";
import { updateProfile } from "../lib/auth.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { validateProfileAvatar } from "../lib/userCenter/avatarPolicy.js";

// ── עורך-פרופיל קנוני יחיד (חוק העץ האחד) ──
// מקור-אמת אחד לעריכת הזהות: שם תצוגה · שם משתמש · תמונת פרופיל (העלאה + URL).
// משמש גם במגירת «האזור האישי» (UserCenter) וגם בעמוד /profile — אותו רכיב בדיוק,
// בלי שתי גרסאות שנסחפות. מקבל theme tokens כדי להשתלב ויזואלית בכל משטח.
//   t = { fieldBg, ink, line, sub, acc, danger?, btnBg?, btnText? }
export default function ProfileSettings({ t, showSignOut = false, onDone, onSignOut, avatarOnly = false, onAvatarSave }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [draftActor, setDraftActor] = useState(null);
  const [avatarConsent, setAvatarConsent] = useState(false), [avatarDirty, setAvatarDirty] = useState(false);
  const actor = useRef(user?.id); actor.current = user?.id;
  const pending = useRef(false), fieldId = useId();
  const profileSignature = useRef(null);
  const avatarInput = useRef(null);
  useEffect(() => () => { actor.current = null; }, []);

  useEffect(() => {
    // Same-account token revalidation clears the server profile briefly; it
    // must not clear the editor's draft. Account switches still clear it.
    if (!profile && user?.id && draftActor === user.id) return;
    const signature=JSON.stringify([user?.id,profile?.id,profile?.display_name,profile?.username,profile?.avatar_url]);
    if(profileSignature.current===signature)return;
    profileSignature.current=signature;
    // An acknowledged same-account save refreshes these fields. Keep its
    // receipt visible; only a principal change revokes the editor state.
    if (draftActor !== user?.id) { setMsg(""); setErr(""); setBusy(false); setUploading(false); pending.current = false; }
    setAvatarConsent(false); setAvatarDirty(false);
    if (profile?.id === user?.id && user?.id) {
      setDraftActor(user.id);
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
    } else { setDraftActor(null); setDisplayName(""); setUsername(""); setAvatarUrl(""); }
  }, [profile, user?.id]);

  const danger = t.danger || "#e5484d";
  const btnBg = t.btnBg || t.acc;
  const btnText = t.btnText || "#fff";
  const fld = { width: "100%", padding: "10px 12px", background: t.fieldBg, color: t.ink, border: `1px solid ${t.line}`, borderRadius: 9, fontSize: 14, marginTop: 5, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  const lbl = { color: t.sub, fontSize: 12, marginTop: 12, display: "block" };

  const pickAvatar = useCallback(async (e) => {
    const principal = user?.id;
    if (!principal || pending.current) return;
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (avatarOnly) {
      try { validateProfileAvatar(f); } catch (reason) { setErr(reason.message); return; }
      pending.current = true;
    }
    if (!avatarOnly && !f.type.startsWith("image/")) { setErr("נא לבחור קובץ תמונה"); return; }
    if (!avatarOnly && f.size > 5 * 1024 * 1024) { setErr("התמונה גדולה מדי (מקסימום 5MB)"); return; }
    setErr(""); setMsg(""); setUploading(true);
    try {
      if (avatarOnly) {
        const { data, error } = await supabase.auth.getUser();
        if (error || data?.user?.id !== principal || actor.current !== principal) throw new Error("יש להתחבר מחדש לפני העלאת התמונה.");
      }
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, f, { upsert: false, contentType: f.type });
      if (error) throw error;
      if (actor.current !== principal) return;
      setAvatarUrl(supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl);
      setAvatarConsent(false); setAvatarDirty(true);
      setMsg("התמונה הועלתה — לחצו שמירה ✓");
    } catch (e2) { if (actor.current === principal) setErr(e2?.message || "שגיאה בהעלאת התמונה"); }
    if (actor.current === principal) { setUploading(false); if (avatarOnly) pending.current = false; }
  }, [user, avatarOnly]);

  const save = useCallback(async () => {
    const principal = user?.id;
    if (!principal || profile?.id !== principal || draftActor !== principal || pending.current) return;
    setErr(""); setMsg("");
    if (!avatarOnly && username.trim().length < 2) { setErr("שם המשתמש קצר מדי"); return; }
    if (avatarOnly && (!avatarConsent || !avatarDirty || !avatarUrl || typeof onAvatarSave !== "function")) return;
    pending.current = true;
    setBusy(true);
    try {
      if (avatarOnly) {
        const result = await onAvatarSave({ url: avatarUrl, publish: true });
        if (result?.ok !== true) throw new Error(result?.error || "לא התקבל אישור לעדכון התמונה.");
      } else {
        const updated = await updateProfile(user.id, { username: username.trim(), display_name: displayName.trim() || null, avatar_url: avatarUrl.trim() || null });
        if (updated?.id !== principal) throw new Error("unconfirmed");
      }
      if (actor.current !== principal) return;
      await refreshProfile();
      if (actor.current !== principal) return;
      setMsg(avatarOnly ? "התמונה עודכנה בפרופיל הציבורי ✓" : "נשמר בהצלחה ✓");
      onDone?.();
    } catch (e) {
      if (actor.current === principal) setErr(avatarOnly ? e?.message || "לא התקבל אישור לעדכון התמונה." : e?.message?.includes("duplicate") ? "שם המשתמש כבר תפוס" : "לא התקבל אישור שמירה. רעננו לפני ניסיון נוסף.");
    }
    if (actor.current === principal) { setBusy(false); pending.current = false; }
  }, [user, profile, draftActor, username, displayName, avatarUrl, refreshProfile, onDone, avatarOnly, avatarConsent, avatarDirty, onAvatarSave]);

  const visibleAvatar = draftActor === user?.id ? avatarUrl : "";
  const initial = (draftActor === user?.id ? displayName || username || user?.email || "?" : "?").trim().charAt(0).toUpperCase();

  return (
    <fieldset disabled={busy || uploading || profile?.id !== user?.id || draftActor !== user?.id} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      {!avatarOnly ? <><label style={lbl} htmlFor={`${fieldId}-name`}>שם תצוגה</label>
      <input id={`${fieldId}-name`} style={fld} value={draftActor === user?.id ? displayName : ""} onChange={e => setDisplayName(e.target.value)} dir="rtl" />

      <label style={lbl} htmlFor={`${fieldId}-username`}>שם משתמש (ציבורי)</label>
      <input id={`${fieldId}-username`} style={fld} value={draftActor === user?.id ? username : ""} onChange={e => setUsername(e.target.value)} dir="rtl" /></> : null}

      <label style={lbl}>תמונת פרופיל</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: t.fieldBg, border: `1px solid ${t.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.acc, fontWeight: 700, fontSize: 19 }}>
          {visibleAvatar ? <img src={visibleAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </div>
        <label role={avatarOnly ? "button" : undefined} tabIndex={avatarOnly ? 0 : undefined} onKeyDown={e => { if (avatarOnly && ["Enter", " "].includes(e.key) && !busy && !uploading && draftActor === user?.id) { e.preventDefault(); avatarInput.current?.click(); } }} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: uploading ? "wait" : "pointer", background: t.fieldBg, border: `1px solid ${t.line}`, borderRadius: 9, padding: "10px 16px", color: t.ink, fontSize: 13.5, fontWeight: 700, minHeight: avatarOnly ? 44 : undefined, boxSizing: "border-box" }}>
          {uploading ? "מעלה…" : "📷 העלאת תמונה מהמכשיר"}
          <input ref={avatarInput} type="file" accept={avatarOnly ? "image/jpeg,image/png,image/webp,image/gif" : "image/*"} aria-label="בחירת תמונת פרופיל מהמכשיר" onChange={pickAvatar} disabled={uploading} style={{ display: "none" }} />
        </label>
        {visibleAvatar && !uploading && !avatarOnly && (
          <button onClick={() => setAvatarUrl("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.sub, fontSize: 12.5, textDecoration: "underline" }}>הסר</button>
        )}
      </div>
      {!avatarOnly ? <><button onClick={() => setShowUrl(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: t.sub, fontSize: 12, marginTop: 8, padding: 0, textDecoration: "underline" }}>{showUrl ? "הסתר" : "או הדבק קישור (URL)"}</button>
      {showUrl && <input style={fld} value={visibleAvatar} onChange={e => setAvatarUrl(e.target.value)} dir="ltr" placeholder="https://…" />}</> : <><p>JPG, PNG, WebP או GIF · עד 5MB</p><label style={{ ...lbl, display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}><input type="checkbox" style={{ width: 20, height: 20, minHeight: 20, flexShrink: 0, accentColor: t.acc }} checked={avatarConsent} onChange={e => setAvatarConsent(e.target.checked)} />אני מאשר/ת להציג את התמונה בפרופיל הציבורי שלי.</label></>}

      {draftActor === user?.id && err && <div role="alert" style={{ color: danger, fontSize: 13, marginTop: 12 }}>{err}</div>}
      {draftActor === user?.id && msg && <div role={avatarOnly ? "status" : undefined} style={{ color: t.acc, fontSize: 13, marginTop: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={save} disabled={busy || avatarOnly && (!avatarConsent || !avatarDirty || !visibleAvatar || typeof onAvatarSave !== "function")} style={{ flex: 1, background: btnBg, color: btnText, border: "none", borderRadius: 9, padding: "11px", fontWeight: 800, cursor: busy ? "wait" : "pointer", fontSize: 14, minHeight: avatarOnly ? 44 : undefined }}>{busy ? "שומר…" : avatarOnly ? "שמירת התמונה" : "שמירה"}</button>
        {showSignOut && <button onClick={async () => { await signOut(); (onSignOut || onDone)?.(); }} style={{ background: "none", border: `1px solid ${t.line}`, color: t.sub, borderRadius: 9, padding: "11px 18px", cursor: "pointer", fontSize: 14 }}>התנתקות</button>}
      </div>
    </fieldset>
  );
}
