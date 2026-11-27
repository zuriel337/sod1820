import { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { useResearch } from "./ResearchProvider.jsx";
import { use2029Shell } from "../../components/experience2029/Sod2029Shell.jsx";
import { personalActionsLocked } from "../publicLaunch2029.js";
import { entityIdentity } from "./researchSyncState.js";
import { SYNC_FAILURE_STATUSES, decideSaveClick, isCloudConfirmed, saveLabelState } from "./personalSaveDecision.js";
import { conflictReapplySafe, indicatorFailureNotice, saveIndicatorPhase } from "./personalSaveIndicator.js";

// The ONE save indicator of the site (state machine idle -> saving -> confirmed | failed with a retry), over the ONE research runtime.
// "נשמר" is only ever the server's receipt: a local commit, a queued batch or a request in flight is "saving". Nothing is ever deleted here:
// the only local clearing is the existing explicit reclaim (confirm:true) of abandoned passive journals, and the disputed copy of a conflict is preserved by the runtime.

// Read-only diagnosis of the browser store, appended to a failure so a report names the real cause.
const storageProbe = () => { try { let n = 0; const top = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || "", l = k.length + (localStorage.getItem(k) || "").length; n += l; top.push([k.split(":")[0].slice(0, 24), l]); } top.sort((a, b) => b[1] - a[1]); let w = "ok"; try { localStorage.setItem("__sod_probe", "x".repeat(2048)); localStorage.removeItem("__sod_probe"); } catch (e) { w = String(e?.name || "err"); } return " [אחסון: " + Math.round(n / 1024) + "KB, כתיבה: " + w + (w === "QuotaExceededError" ? " · האחסון מלא: היכנסו ל\"המחקר שלי\" ולחצו \"פנה מקום\"" : "") + ", גדולים: " + top.slice(0, 3).map(t => t[0] + "=" + Math.round(t[1] / 1024) + "KB").join(" ") + "]"; } catch (e) { return " [אחסון: " + String(e?.name || "חסום") + "]"; } };

export function usePersonalSave2029(entity, { locked } = {}) {
  const auth = useAuth(), research = useResearch(), shell = use2029Shell();
  const [ui, setUi] = useState({ attempt: "idle", notice: "", reclaim: 0, fix: false });
  const latest = useRef(research); latest.current = research;
  const inFlight = useRef(false);
  const identity = entityIdentity(entity), saved = Boolean(identity) && (research.saved || []).some(row => entityIdentity(row) === identity);
  const phase = saveIndicatorPhase({ saved, syncStatus: research.syncStatus, syncPending: research.syncPending, syncAwaitingAction: research.syncAwaitingAction, attempt: ui.attempt });
  const patch = next => setUi(prev => ({ ...prev, ...next }));
  const pendingSafe = () => { try { return conflictReapplySafe(latest.current.exportPendingResearch?.()); } catch { return false; } };

  // The failure notice reads the state AFTER the failed attempt (a closure's render values are from before it) and names the REAL cause.
  const failNow = () => {
    const r = latest.current, offered = r.syncStatus === "conflict" && pendingSafe();
    const base = { syncStatus: r.syncStatus, storageIssue: r.storageIssue, syncPending: r.syncPending, conflictReapplyOffered: offered };
    const n = indicatorFailureNotice(base);
    inFlight.current = false;
    patch({ attempt: "failed", notice: n.text + (r.storageIssue ? storageProbe() : ""), reclaim: 0, fix: n.action === "resolve" });
    if (r.storageIssue !== "quota") return;
    // A full store: ask the EXISTING reclaim (read-only dry run) whether abandoned passive journals can be freed; offer exactly that one action here.
    Promise.resolve(r.localOnlyResearch?.("reclaim")).then(dry => { const count = dry?.count || 0; if (count) patch({ notice: indicatorFailureNotice({ ...base, reclaimablePassiveJournals: count }).text, reclaim: count }); }, () => {});
  };

  // Read after the runtime has published the failed attempt (a synchronous read would see the state from before it).
  const fail = () => { inFlight.current = false; setTimeout(failNow, 0); };

  // Only a CHANGE of the runtime's state settles an attempt (the promises settle the rest), so a failure status left over from before the click cannot end it early.
  useEffect(() => {
    if (ui.attempt !== "saving") return;
    if (saved && isCloudConfirmed({ syncStatus: research.syncStatus, syncPending: research.syncPending })) { inFlight.current = false; setUi({ attempt: "idle", notice: "נשמר באזור האישי בחשבון ✓", reclaim: 0, fix: false }); }
    else if (SYNC_FAILURE_STATUSES.includes(research.syncStatus)) fail();
  }, [saved, research.syncStatus, research.syncPending]);
  useEffect(() => { inFlight.current = false; setUi({ attempt: "idle", notice: "", reclaim: 0, fix: false }); }, [auth.user?.id, entity?.id]);

  const retryThenWait = (started, text) => {
    patch({ attempt: "saving", notice: text, reclaim: 0, fix: false });
    Promise.resolve(started).then(ok => { if (!ok) fail(); }, () => fail());
  };
  const reclaimAndRetry = () => {
    patch({ reclaim: 0, notice: "מפנה יומני צפייה ישנים…" });
    Promise.resolve(research.localOnlyResearch?.("reclaim", { confirm: true })).then(r => {
      if (!r?.count || r.error) { patch({ notice: "הפינוי לא הושלם: " + (r?.count || 0) + " יומנים פונו. לא נמחק שום פריט ששמרת." }); return; }
      inFlight.current = true;
      retryThenWait(research.retryResearchSync?.(), "פונו " + r.count + " יומני צפייה ישנים. מנסה לשמור…");
    }, () => patch({ notice: "הפינוי לא הושלם. לא נמחק שום דבר." }));
  };
  // An explicit click: the runtime keeps the disputed batch in its own conflict copy first, then re-sends the same intentions on top of the server's revision.
  const resolveAndRetry = () => {
    if (!pendingSafe()) { fail(); return; }
    inFlight.current = true;
    retryThenWait(research.resolveResearchSyncConflict?.({ confirm: true, action: "reapply" }), "מצרף את הפריט לגרסה העדכנית בחשבון…");
  };
  const save = () => {
    if (locked ?? personalActionsLocked(auth)) { shell.openWorkspace?.(); patch({ notice: "יש להתחבר לחשבון קיים, ואז ללחוץ שוב על שמירה." }); return; }
    if (inFlight.current || !entity?.id) return;
    const r = research;
    if (r.syncStatus === "conflict") {
      if (!saved && !r.saveItem?.(entity)) { fail(); return; }
      resolveAndRetry(); return;
    }
    const action = decideSaveClick({ saved, syncStatus: r.syncStatus, syncPending: r.syncPending });
    if (action === "confirm") { patch({ attempt: "idle", notice: "הפריט כבר שמור בחשבון ✓" }); return; }
    if (action === "wait") { patch({ notice: "הסנכרון לחשבון בעיצומו…" }); return; }
    if (action === "blocked") { patch({ attempt: "failed", notice: indicatorFailureNotice({ syncStatus: r.syncStatus, storageIssue: r.storageIssue, syncPending: r.syncPending }).text }); return; }
    inFlight.current = true;
    if (action === "retry" || action === "resave") {
      patch({ attempt: "saving", notice: "מנסה לסנכרן את הפריט השמור…", reclaim: 0, fix: false });
      const done = ok => {
        if (ok) { patch({ notice: "ממתין לאישור שמירה מהשרת…" }); return; }
        const x = latest.current;
        if (x.storageIssue) { fail(); return; }
        inFlight.current = false;
        patch({ attempt: "failed", notice: "הפריט נשמר במכשיר בלבד ולא סונכרן: אין חיבור לשרת או שהשרת לא אישר. אפשר לנסות שוב. (קוד: " + x.syncStatus + "/" + x.syncPending + ")" });
      };
      try { Promise.resolve(action === "retry" ? r.retryResearchSync?.() : r.saveItem?.(entity)).then(ok => done(Boolean(ok)), () => done(false)); } catch { done(false); }
      return;
    }
    patch({ attempt: "saving", notice: "ממתין לאישור שמירה מהשרת…", reclaim: 0, fix: false });
    const ok = r.saveItem?.(entity);
    if (!ok) fail();
  };
  return { saved, phase, labelState: saveLabelState({ saved, syncStatus: research.syncStatus, syncPending: research.syncPending }), notice: ui.notice, reclaim: ui.reclaim, fix: ui.fix,
    busy: phase === "saving", save, reclaimAndRetry, resolveAndRetry };
}
