import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { applySeo } from "../lib/seo.js";
import { buildClaudePacket } from "../lib/research/claudePacket2029.js";
import { fetchClaudeNumberDossier, fetchClaudePacketDossier } from "../lib/research/claudePacketDossier2029.js";
import { supabase } from "../lib/supabase.js";
import { getVisitorId } from "../lib/visitorId.js";
import { askClaudeRaziel } from "../lib/research/claudeRazielClient2029.js";

// A standalone 2029 surface, separate from the site's Raziel: it never reads or writes the Raziel session and calls no model.
// The packet is the canonical engine's values; one explicit button adds the same read-only research-run dossier Raziel gets.
export default function ClaudeResearchPacket2029Page() {
  const { search } = useLocation();
  const [input, setInput] = useState(() => (new URLSearchParams(search).get("q") || "").slice(0, 80));
  const [copied, setCopied] = useState(false);
  const [dossier, setDossier] = useState({ state: "idle", brief: "" });
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [chat, setChat] = useState({ state: "idle", notice: "" });
  const packet = useMemo(() => buildClaudePacket(input), [input]);
  const text = packet ? (dossier.brief && dossier.subject === packet.subject ? `${packet.text}\n\n${dossier.brief}` : packet.text) : "";

  useEffect(() => {
    applySeo({ title: "חבילת מחקר לקלוד", description: "חבילת מחקר דטרמיניסטית מהמנוע הקנוני.", noindex: true });
  }, []);

  const addDossier = async () => {
    if (!packet || dossier.state === "loading") return null;
    const subject = packet.subject;
    setDossier({ state: "loading", brief: "" });
    let visitorId = null;
    try { visitorId = getVisitorId(); } catch { visitorId = null; }
    const fetchDossier = packet.kind === "number" ? (_, options) => fetchClaudeNumberDossier(packet.number, options) : fetchClaudePacketDossier;
    const result = await fetchDossier(subject, { visitorId, invoke: (name, options) => supabase.functions.invoke(name, options) });
    setDossier(result.ok ? { state: "ready", brief: result.brief, subject } : { state: "failed", brief: "" });
    return result.ok ? result.brief : null;
  };

  // The separate Claude Raziel: the question goes with the packet (database dossier added first, once, if missing). No storage.
  const ask = async () => {
    const q = question.trim();
    if (!packet || !q || chat.state === "loading") return;
    setChat({ state: "loading", notice: "" });
    let packetText = text;
    if (!(dossier.brief && dossier.subject === packet.subject)) {
      const brief = await addDossier();
      if (brief) packetText = `${packet.text}\n\n${brief}`;
    }
    const result = await askClaudeRaziel({ question: q, packet: packetText, history: thread }, { invoke: (name, options) => supabase.functions.invoke(name, options) });
    if (result.ok) {
      setThread((items) => [...items, { role: "user", text: q }, { role: "assistant", text: result.answer }]);
      setQuestion("");
      setChat({ state: "idle", notice: result.degraded ? "התשובה הוחלפה בהודעת הגנה: לא נמצא ניסוח שנשען רק על החבילה." : "" });
    } else {
      setChat({ state: "idle", notice: result.reason === "admin_required" ? "רזיאל של קלוד זמין רק למנהל מחובר." : "לא התקבלה תשובה. נסה שוב." });
    }
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
        placeholder="מילה, ביטוי או מספר"
        aria-label="מילה, ביטוי או מספר"
        maxLength={80}
        style={{ width: "100%", boxSizing: "border-box", padding: 12, fontSize: 18, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit" }}
      />
      {packet ? (
        <>
          <pre data-testid="claude-packet" style={{ whiteSpace: "pre-wrap", margin: "16px 0", padding: 12, border: "1px solid currentColor", borderRadius: 10, fontSize: 14, lineHeight: 1.6 }}>{text}</pre>
          <button type="button" onClick={addDossier} disabled={dossier.state === "loading"} style={{ marginInlineEnd: 8, padding: "12px 18px", fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
            {dossier.state === "loading" ? "קורא מהמאגר…" : dossier.state === "ready" && dossier.subject === packet.subject ? "נתוני מאגר נוספו ✓" : "הוסף נתוני מאגר"}
          </button>
          {dossier.state === "failed" ? <p role="status" style={{ opacity: 0.8 }}>לא התקבלו נתוני מאגר מאומתים לביטוי הזה. החבילה נשארת עם ערכי המנוע בלבד.</p> : null}
          <button type="button" onClick={copy} style={{ padding: "12px 18px", fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
            {copied ? "הועתק ✓" : "העתק חבילה לקלוד"}
          </button>
          <section aria-label="רזיאל של קלוד" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid currentColor" }}>
            <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>רזיאל של קלוד</h2>
            <p style={{ opacity: 0.75, margin: "0 0 12px" }}>נפרד מרזיאל של האתר. עונה רק מתוך החבילה שלמעלה, ורק למנהל מחובר. אין שמירה של השיחה.</p>
            {thread.map((turn, index) => (
              <div key={index} data-role={turn.role} style={{ margin: "8px 0", padding: 12, borderRadius: 10, border: "1px solid currentColor", opacity: turn.role === "user" ? 0.8 : 1, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{turn.text}</div>
            ))}
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="שאל את רזיאל של קלוד על מה שלמעלה"
              aria-label="שאלה לרזיאל של קלוד"
              rows={3}
              maxLength={800}
              style={{ width: "100%", boxSizing: "border-box", padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit" }}
            />
            <button type="button" onClick={ask} disabled={chat.state === "loading" || !question.trim()} style={{ marginTop: 8, padding: "12px 18px", fontSize: 16, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
              {chat.state === "loading" ? "רזיאל חושב…" : "שאל"}
            </button>
            {chat.notice ? <p role="status" style={{ opacity: 0.85 }}>{chat.notice}</p> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
