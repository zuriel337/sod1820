// ONE temporary Raziel session for 2029 (#1142 / RazielSession V0; the Codex provider is consumed unchanged).
// App2029 mounts this once under ResearchProvider and above Routes, so the desktop Companion and the mobile
// sheet are two projections of the same conversation on every surface. Nothing here calls a model: the only
// AI boundary is the session's explicit submit, through the existing askRaziel transport (ai-analyze
// persona=raziel) with the existing Phase I surface descriptor. Memory only — no storage, no new store —
// and a different signed-in person never inherits the previous person's thread.
import React, { useCallback, useEffect, useRef } from "react";
import { askRaziel } from "../../lib/supabase.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { RazielSessionProvider2029, useRazielSession2029 } from "../../lib/research/RazielSessionProvider2029.jsx";
import { withRazielSurfaceContext } from "./razielSessionSeam2029.js";

// Non-throwing read for the frame: a surface rendered without the mount gets null, never a second session.
export function useOptionalRazielSession2029() {
  try { return useRazielSession2029(); } catch { return null; }
}

function RazielSessionOwnerReset2029() {
  const { user, loading } = useAuth();
  const { busy, resetTemporarySession } = useRazielSession2029();
  const owner = useRef(undefined);
  const pending = useRef(false);
  const uid = loading ? owner.current : (user?.id || null);
  useEffect(() => {
    if (uid === undefined) return;
    if (owner.current === undefined) { owner.current = uid; return; }
    if (owner.current !== uid) { owner.current = uid; pending.current = true; }
    // a turn already in flight finishes first; the thread is then cleared for the new owner
    if (pending.current && !busy && resetTemporarySession()) pending.current = false;
  }, [uid, busy, resetTemporarySession]);
  return null;
}

export default function RazielSessionMount2029({ children }) {
  const research = useResearch();
  const contextRef = useRef(research.context);
  contextRef.current = research.context;
  const transport = useCallback((request) => askRaziel(withRazielSurfaceContext(request, contextRef.current)), []);
  return (
    <RazielSessionProvider2029 transport={transport}>
      <RazielSessionOwnerReset2029 />
      {children}
    </RazielSessionProvider2029>
  );
}
