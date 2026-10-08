import React, { useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import {
  PROJECTOR_MODE,
  publicationControlFor,
  readStoredViewMode,
  resolveProjectorMode,
  setResearchObjectPublication,
  storeViewMode,
} from "../../lib/research/researchViewMode.js";

// ONE admin/public mode + publication control shared by World 2029 and the Golden Projector.
// Mode is presentation only; access is decided by RLS. Non-admin is always PUBLIC_VIEW.

export function useResearchViewMode() {
  const { isAdmin, loading } = useAuth();
  const [requested, setRequested] = useState(readStoredViewMode);
  const admin = !loading && !!isAdmin;
  const mode = resolveProjectorMode({ isAdmin: admin, requested });
  const choose = (next) => { storeViewMode(next); setRequested(next); };
  return { isAdmin: admin, loading, mode, choose };
}

export function ResearchViewModeSwitch2029({ mode, onChange }) {
  return <div className="sod29-golden-mode-toggle" role="group" aria-label="מנהל | ציבור">
    <button type="button" aria-pressed={mode === PROJECTOR_MODE.ADMIN_ALL} onClick={() => onChange(PROJECTOR_MODE.ADMIN_ALL)}>מנהל / הכל</button>
    <button type="button" aria-pressed={mode === PROJECTOR_MODE.PUBLIC_VIEW} onClick={() => onChange(PROJECTOR_MODE.PUBLIC_VIEW)}>ציבור</button>
  </div>;
}

/** Compact Human-Gate publication control for one research-object row (admin mode only). */
export function ResearchPublicationControl2029({ researchObjectId, row, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState(null);
  if (!researchObjectId) return null;
  const control = publicationControlFor(scope ? { ...row, privacy_scope: scope } : row);
  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await setResearchObjectPublication(researchObjectId, control.publish);
    setBusy(false);
    if (res?.ok) { setScope(res.privacy_scope); onChanged?.(res); } else setError(res?.error || "publication_failed");
  };
  return <span className="sod29-publication-control">
    <button type="button" className="sod29-action" disabled={busy || control.disabled} title={control.reason || undefined} onClick={run}>{busy ? "…" : control.label}</button>
    {control.reason ? <small>{control.reason}</small> : null}
    {error ? <small role="alert">הפעולה נכשלה ({error})</small> : null}
  </span>;
}
