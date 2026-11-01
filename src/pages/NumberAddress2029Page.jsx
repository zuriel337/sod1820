import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Number2029Page from "./Number2029Page.jsx";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { resolvePublicNumberAddress } from "../lib/research/numberExpressionFocus.js";
import { applySeo } from "../lib/seo.js";

export default function NumberAddress2029Page() {
  const { value } = useParams();
  const location = useLocation();
  const key = `${value}${location.search}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, address: null, error: false });
  useEffect(() => {
    let live = true;
    setState({ key, address: null, error: false });
    applySeo({ title: "דף המספר והביטוי", path: location.pathname, noindex: true });
    resolvePublicNumberAddress(value, { search: location.search }).then(address => {
      if (live) setState({ key, address, error: false });
    }).catch(() => { if (live) setState({ key, address: null, error: true }); });
    return () => { live = false; };
  }, [key, attempt]);
  if (state.key === key && state.address) return <Number2029Page resolvedAddress={state.address} />;
  return <Sod2029Shell surface="number" title="דף המספר והביטוי" introVariant="none">
    <FrameState kind={state.error ? "error" : "loading"} title={state.key === key && state.error ? "הביטוי או השיטה לא נטענו" : "טוען את המספר והביטוי…"}>
      {state.error ? "אפשר לנסות שוב. שיטה שלא נמצאה אינה מוחלפת בשיטה אחרת." : "קורא את הנתונים מהמנוע הקיים."}
    </FrameState>
    {state.key === key && state.error ? <button type="button" className="sod29-action" onClick={() => setAttempt(n => n + 1)}>לנסות שוב</button> : null}
  </Sod2029Shell>;
}
