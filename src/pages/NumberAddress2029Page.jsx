import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Number2029Page from "./Number2029Page.jsx";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { resolveNumericNumberAddress, resolvePublicNumberAddress } from "../lib/research/numberExpressionFocus.js";
import { applySeo } from "../lib/seo.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function NumberAddress2029Page() {
  const { value } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const readerIdentity = user?.id || "guest";
  const key = `${value}${location.search}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, address: null, error: false });
  const numericAddress = useMemo(() => {
    try { return resolveNumericNumberAddress(value, location.search); } catch { return null; }
  }, [value, location.search]);
  useEffect(() => {
    if (numericAddress) return undefined;
    if (authLoading) return undefined;
    let live = true;
    setState({ key, readerIdentity, address: null, error: false });
    applySeo({ title: "דף המספר והביטוי", path: location.pathname, noindex: true });
    resolvePublicNumberAddress(value, { search: location.search }).then(address => {
      if (live) setState({ key, readerIdentity, address: address.methodProfile
        ? { ...address, methodProfile: { ...address.methodProfile, readerIdentity } } : address, error: false });
    }).catch(() => { if (live) setState({ key, readerIdentity, address: null, error: true }); });
    return () => { live = false; };
  }, [key, attempt, numericAddress, readerIdentity, authLoading]);
  if (numericAddress) return <Number2029Page resolvedAddress={numericAddress} />;
  if (!authLoading && state.readerIdentity === readerIdentity && state.key === key && state.address) return <Number2029Page resolvedAddress={state.address} />;
  const failed = !authLoading && state.readerIdentity === readerIdentity && state.key === key && state.error;
  return <Sod2029Shell surface="number" title="דף המספר והביטוי" introVariant="none">
    <FrameState kind={failed ? "error" : "loading"} title={failed ? "הביטוי או השיטה לא נטענו" : "טוען את המספר והביטוי…"}>
      {failed ? "אפשר לנסות שוב. שיטה שלא נמצאה אינה מוחלפת בשיטה אחרת." : "קורא את הנתונים מהמנוע הקיים."}
    </FrameState>
    {failed ? <button type="button" className="sod29-action" onClick={() => setAttempt(n => n + 1)}>לנסות שוב</button> : null}
  </Sod2029Shell>;
}
