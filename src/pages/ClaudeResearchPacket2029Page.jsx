import React, { useEffect, useMemo, useState } from "react";
import { applySeo } from "../lib/seo.js";
import { buildClaudePacket } from "../lib/research/claudePacket2029.js";
import { fetchClaudePacketDossier } from "../lib/research/claudePacketDossier2029.js";
import { supabase } from "../lib/supabase.js";
import { getVisitorId } from "../lib/visitorId.js";

// A standalone 2029 surface, separate from the site's Raziel: it never reads or writes the Raziel session and calls no model.
// The packet is the canonical engine's values; one explicit button adds the same read-only research-run dossier Raziel gets.
export default function ClaudeResearchPacket2029Page() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [dossier, setDossier] = useState({ state: "idle", brief: "" });
  const packet = useMemo(() => buildClaudePacket(input), [input]);
  const text = packet ? (dossier.brief && dossier.expression === packet.expression ? `${packet.text}\n\n${dossier.brief}` : packet.text) : "";

  useEffect(() => {
    applySeo({ title: "חבילת מחקר לקלוד", description: "חבילת מחקר דטרמיניסטית מהמנוע הקנוני.", noindex: true });
  }, []);

  const addDossier = async () => {
    if (!packet || dossier.state === "loading") return;
    const expression = packet.expression;
    setDossier({ state: "loading", brief: "" });
    let visitorId = null;
    try { visitorId = getVisitorId(); } catch { visitorId = null; }
    const result = await fetchClaudePacketDossier(expression, { visitorId, invoke: (name, options) => supabase.functions.invoke(name, options) });
    setDossier(result.ok ? { state: "ready", brief: result.brief, expression } : { state: "failed", brief: "" });
  };

  const copy = async () => {
    if (!packet) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main dir="rtl" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit", color: "inherit" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>חבילת מחקר לקלוד</h1>
      <p style={{ opacity: 0.75, margin: "0 0 16px" }}>המספרים מהמנוע הקנוני בלבד. את החבילה מדביקים לקלוד בשיחה, והוא כותב את הפרשנות.</p>
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="מילה או ביטוי בעברית"
        aria-label="מילה או ביטוי"
        maxLength={80}
        style={{ width: "100%", boxSizing: "border-box", padding: 12, fontSize: 18, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit" }}
      />
      {packet ? (
        <>
          <pre data-testid="claude-packet" style={{ whiteSpace: "pre-wrap", margin: "16px 0", padding: 12, border: "1px solid currentColor", borderRadius: 10, fontSize: 14, lineHeight: 1.6 }}>{text}</pre>
          <button type="button" onClick={addDossier} disabled={dossier.state === "loading"} style={{ marginInlineEnd: 8, padding: "12px 18px", fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
            {dossier.state === "loading" ? "קורא מהמאגר…" : dossier.state === "ready" && dossier.expression === packet.expression ? "נתוני מאגר נוספו ✓" : "הוסף נתוני מאגר"}
          </button>
          {dossier.state === "failed" ? <p role="status" style={{ opacity: 0.8 }}>לא התקבלו נתוני מאגר מאומתים לביטוי הזה. החבילה נשארת עם ערכי המנוע בלבד.</p> : null}
          <button type="button" onClick={copy} style={{ padding: "12px 18px", fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
            {copied ? "הועתק ✓" : "העתק חבילה לקלוד"}
          </button>
        </>
      ) : null}
    </main>
  );
}
