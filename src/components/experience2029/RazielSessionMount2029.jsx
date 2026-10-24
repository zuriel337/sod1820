// ONE temporary Raziel session for 2029 (#1142 / RazielSession V0).
// App2029 mounts this once under ResearchProvider and above Routes, so the desktop Companion and the mobile
// sheet are two projections of the same conversation on every surface. Nothing here calls a model: the only
// AI boundary is the session's explicit submit, through the existing askRaziel transport (ai-analyze
// persona=raziel) with the existing Phase I surface descriptor. Memory only — no storage, no new store —
// and a different signed-in person never inherits the previous person's thread.
import React from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import {
  RazielSessionProvider2029,
  useOptionalRazielSession2029,
} from "../../lib/research/RazielSessionProvider2029.jsx";

// Keep the frame-facing import stable while the context owner lives beside the Provider.
export { useOptionalRazielSession2029 };

export default function RazielSessionMount2029({ children }) {
  const { user, loading } = useAuth();
  // Auth resolution gets its own empty provider. A previous principal's in-memory thread is therefore
  // unmounted synchronously before a different uid (or anon) can paint, even through the frame fallback.
  const principalKey = loading ? "auth-loading" : (user?.id || "anon");
  return (
    <RazielSessionProvider2029 key={principalKey}>
      {children}
    </RazielSessionProvider2029>
  );
}
