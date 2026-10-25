import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { applySeo } from "../lib/seo.js";
import FollowCenter2029 from "../components/followCenter2029/FollowCenter2029.jsx";
import { buildFollowCenterModel } from "../components/followCenter2029/followCenterModel2029.js";

// Visual candidate only. Every record below is a SYNTHETIC fixture shown to judge layout and states. This page reads
// nothing, writes nothing and is built only when VITE_FOLLOW_CENTER_PREVIEW is set. GPT wires the approved view to the
// existing readers, mutations and principal scoping afterwards.
const NOW = Date.parse("2026-10-25T12:00:00Z");
const ago = (hours) => new Date(NOW - hours * 3600e3).toISOString();
const UPDATES = [
  { id: "s1", title: "כותב שאתם עוקבים אחריו פרסם מאמר חדש", body: "דוגמה סינתטית: מאמר על מספר 1820 והקשרו בציר הזמן. התוכן כאן הוא טקסט להדגמת הפריסה בלבד.", link: "/post/example-1", read_at: null, created_at: ago(5), source_topic: "author:כתב לדוגמה" },
  { id: "s2", title: "הופיע מספר חדש בנושא שבחרתם", body: "דוגמה סינתטית: נוספה תצפית על מספר שבמעקב.", link: "/2029/number/1820", read_at: null, created_at: ago(30), source_topic: "number:1820" },
  { id: "s3", title: "עדכון מהמערכת", body: "דוגמה סינתטית של עדכון שאין לו נושא מקור, ולכן לא מוצגת לו סיבת קבלה.", link: null, read_at: ago(40), created_at: ago(70), source_topic: null },
];
const TOPICS = ["author:כתב לדוגמה", "author:כתב ללא דף ציבורי", "number:1820", "cat:קטגוריה לדוגמה", "stream:reality"];
const LINKS = { "author:כתב לדוגמה": "/community/researcher/example" };
const SCENARIOS = {
  registered: { label: "משתמש רשום", principal: "registered" },
  guest: { label: "אורח", principal: "guest" },
  loading: { label: "טעינה ראשונה", principal: "loading", notifications: "loading", follows: "loading" },
  empty: { label: "ריק ידוע", principal: "registered", empty: true },
  partial: { label: "קריאה חלקית", principal: "registered", notifications: "unavailable" },
  unavailable: { label: "קריאות לא זמינות", principal: "registered", notifications: "unavailable", follows: "unavailable" },
  push: { label: "Push זמין במכשיר", principal: "registered", device: { push: "available", pushSubscribed: false } },
};

export default function FollowCenterPreview2029Page() {
  const location = useLocation(), navigate = useNavigate();
  const key = new URLSearchParams(location.search).get("state");
  const scenario = SCENARIOS[key] ? key : "registered";
  const spec = SCENARIOS[scenario];
  const [topics, setTopics] = useState(TOPICS), [pending, setPending] = useState({}), [items, setItems] = useState(UPDATES);
  useEffect(() => { applySeo({ title: "מרכז עדכונים · הדגמה", description: "מועמד חזותי עם נתוני דוגמה.", path: "/2029/preview/follow-center", noindex: true }); }, []);
  useEffect(() => { setTopics(TOPICS); setPending({}); setItems(UPDATES); }, [scenario]);
  const model = useMemo(() => buildFollowCenterModel({
    principal: spec.principal,
    notifications: { state: spec.notifications || "ready", items: spec.empty ? [] : items },
    follows: { state: spec.follows || "ready", topics: spec.empty ? [] : topics, links: LINKS, pending },
    device: spec.device || {},
  }), [spec, items, topics, pending]);
  // The first unfollow shows a pending state and then an unconfirmed failure; a second try confirms. Simulation only.
  const unfollow = (topic) => {
    setPending((value) => ({ ...value, [topic]: "pending" }));
    setTimeout(() => {
      if (!pending[`tried:${topic}`]) { setPending((value) => ({ ...value, [topic]: "failed", [`tried:${topic}`]: true })); return; }
      setTopics((list) => list.filter((item) => item !== topic)); setPending((value) => { const next = { ...value }; delete next[topic]; return next; });
    }, 700);
  };
  return <main className="fcp">
    <div className="fcp-banner" role="note"><strong>הדגמה חזותית</strong> · כל הרשומות כאן הן נתוני דוגמה סינתטיים. הדף לא קורא ולא כותב דבר, ואין בו חשבון, מנוי או הסכמה אמיתיים.</div>
    <nav className="fcp-states" aria-label="מצבי הדגמה">
      {Object.entries(SCENARIOS).map(([id, item]) => <button key={id} type="button" aria-pressed={id === scenario} onClick={() => navigate(`${location.pathname}?state=${id}`, { replace: true })}>{item.label}</button>)}
    </nav>
    <FollowCenter2029 model={model} returnHref="/2029/preview/follow-center"
      onMarkAllRead={() => setItems((list) => list.map((item) => ({ ...item, read_at: item.read_at || ago(0) })))}
      onUnfollow={unfollow} onRetry={() => navigate(`${location.pathname}?state=registered`, { replace: true })}
      onSignIn={() => {}} onVerifyIdentity={() => {}} />
    <section className="fcp-specimen" aria-labelledby="fcp-spec-title">
      <h2 id="fcp-spec-title">דוגמה: מעקב בדף כותב</h2>
      <p>בדף הציבורי של כותב, המעקב הוא פקד קומפקטי אחד שמסביר מה עוקבים ובמה הוא שונה משיתוף. בחיבור יוצג כאן ה־WatchButton הקיים, בלי פקד שני.</p>
      <div className="fcp-spec-row"><div><strong>מעקב אחרי כתב לדוגמה</strong><small>עדכון כשמתפרסם תוכן חדש בדף שלו. אין בזה הרשמה למייל.</small></div>
        <span className="fcp-spec-chip" aria-hidden="true">עקוב</span><span className="fcp-spec-chip fcp-spec-share" aria-hidden="true">שיתוף</span></div>
    </section>
  </main>;
}
