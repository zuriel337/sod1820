import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../../theme.js";
import { TORAH_ELS_PATH_FIXTURE } from "../../lib/spatial/torahElsPathFixture.js";

const JOURNEY_ID = "els-mashiach-skip8-v1";
const REQUIRED_WINDOW = Math.max(...TORAH_ELS_PATH_FIXTURE.positions) + 40;

const STEPS = [
  {
    key: "start",
    title: "נקודת פתיחה",
    text: "אותו צופן, אותה זהות מחקרית. מתחילים מהנתיב האמיתי שנמצא במנוע ה־ELS הקנוני.",
  },
  {
    key: "path",
    title: "היכנסו לשדה האותיות",
    text: "המערכת טוענת חלון אמיתי מהקורפוס ומדגישה את ארבע אותיות הצופן בלי ליצור עותק של התורה.",
  },
  {
    key: "occurrence",
    title: "בדקו אות אמיתית",
    text: "בוחרים את האות הראשונה לפי corpusIndex יציב ומביאים את מיקום המקור שלה.",
  },
  {
    key: "depth",
    title: "עברו לעומק סמנטי",
    text: "אותו מצב מחקר עובר מתצוגת גליפים ל־LOD: קורפוס → ספר → חלון → נתיב.",
  },
  {
    key: "return",
    title: "חזרו לצופן",
    text: "חוזרים לתצוגת האותיות בלי לאבד את זהות הנתיב או את המופע שנבדק — Journey הוא מעבר סמנטי, לא מסלול מצלמה.",
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForApi(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.__torahAdapterApi) return window.__torahAdapterApi;
    await wait(60);
  }
  throw new Error("Spatial Runtime API לא זמין");
}

async function waitForOccurrenceCount(min, timeoutMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const api = window.__torahAdapterApi;
    if ((api?.getOccurrences?.() || []).length >= min) return api;
    await wait(80);
  }
  throw new Error("חלון האותיות לא נטען בזמן");
}

async function enactJourneyStep(stepIndex) {
  let api = await waitForApi();

  if (stepIndex >= 1) {
    api.setMode("glyph");
    api.setHighlightOn(true);
    const current = api.getOccurrences?.() || [];
    if (current.length < REQUIRED_WINDOW) {
      api.loadWindow(REQUIRED_WINDOW);
      api = await waitForOccurrenceCount(REQUIRED_WINDOW);
    }
  }

  if (stepIndex >= 2) {
    await api.pick(TORAH_ELS_PATH_FIXTURE.positions[0]);
    await wait(80);
    api = window.__torahAdapterApi || api;
  }

  if (stepIndex === 3) {
    api.setMode("lod");
    api.setLens("detail");
  }

  if (stepIndex >= 4) {
    api.setMode("glyph");
    api.setHighlightOn(true);
    await api.pick(TORAH_ELS_PATH_FIXTURE.positions[TORAH_ELS_PATH_FIXTURE.positions.length - 1]);
  }

  return window.__torahAdapterApi || api;
}

function Locator({ picked }) {
  if (!picked) return <span>המופע עוד לא נפתח</span>;
  const loc = picked.locator;
  if (!loc) return <span>המופע נבחר · מיקום פסוק לא זמין</span>;
  return (
    <span>
      {picked.exactGrapheme || picked.baseLetterFamily} · {loc.ref}
      {Number.isInteger(loc.wordIndex) ? ` · מילה ${loc.wordIndex + 1}` : ""}
      {` · corpusIndex ${picked.corpusIndex}`}
    </span>
  );
}

export default function ElsJourneyPilot() {
  const [params, setParams] = useSearchParams();
  const requestedJourney = params.get("journey");
  const requestedStep = Number(params.get("step"));
  const initialStep = requestedJourney === JOURNEY_ID && Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(STEPS.length - 1, requestedStep))
    : 0;

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);
  const active = requestedJourney === JOURNEY_ID;

  const pathLetters = useMemo(() => [...TORAH_ELS_PATH_FIXTURE.term], []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    enactJourneyStep(step)
      .then((api) => {
        if (cancelled) return;
        setPicked(api?.getPicked?.() || null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
  }, [active, step]);

  function goTo(nextStep) {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, nextStep));
    const next = new URLSearchParams(params);
    next.set("journey", JOURNEY_ID);
    next.set("step", String(bounded));
    setParams(next, { replace: true });
    setStep(bounded);
  }

  function reset() {
    const next = new URLSearchParams(params);
    next.delete("journey");
    next.delete("step");
    setParams(next, { replace: true });
    setStep(0);
    setPicked(null);
    try {
      window.__torahAdapterApi?.setMode?.("glyph");
      window.__torahAdapterApi?.setHighlightOn?.(true);
    } catch { /* dev preview only */ }
  }

  const current = STEPS[step];

  return (
    <section dir="rtl" style={{
      margin: "0 auto", maxWidth: 1180, padding: "14px 16px 4px", color: "#eee5cf",
      fontFamily: F.body,
    }}>
      <div style={{
        border: "1px solid rgba(212,175,55,.36)", borderRadius: 20, overflow: "hidden",
        background: "radial-gradient(circle at 50% 0%, rgba(112,77,168,.20), transparent 46%), linear-gradient(180deg,#15101f,#0c0912)",
        boxShadow: "0 16px 50px rgba(0,0,0,.28)",
      }}>
        <div style={{ padding: "17px 18px 15px", borderBottom: "1px solid rgba(212,175,55,.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: "#e8c95d" }}>GOLDEN CASE · ADMIN PREVIEW</span>
            <span style={{ padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", color: "#aaa1b8", fontFamily: F.ui, fontSize: 10.5 }}>לא פורסם</span>
          </div>
          <h1 style={{ margin: "6px 0 0", fontFamily: F.display, fontSize: "clamp(24px,4.5vw,38px)", color: "#f5df8a", lineHeight: 1.15 }}>
            מסע בתוך הצופן · תלת־ממד
          </h1>
          <p style={{ margin: "7px 0 0", maxWidth: 760, color: "#bdb3c7", lineHeight: 1.75, fontSize: 13.5 }}>
            הוכחת־קצה תחומה: קורפוס התורה האמיתי → נתיב ELS אמיתי → מופע אות → עומק סמנטי → חזרה. אין מנוע ELS שני ואין זהות 3D נפרדת.
          </p>
        </div>

        <div style={{ padding: "14px 18px 16px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {pathLetters.map((letter, i) => (
              <span key={`${letter}-${i}`} style={{
                width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center",
                border: "1px solid rgba(212,175,55,.42)", background: i <= step ? "rgba(212,175,55,.16)" : "rgba(255,255,255,.04)",
                color: i <= step ? "#ffe99f" : "#81778a", fontFamily: F.display, fontSize: 20, fontWeight: 900,
              }}>{letter}</span>
            ))}
            <span style={{ color: "#91879b", fontFamily: F.numeric, fontSize: 12 }}>
              דילוג {TORAH_ELS_PATH_FIXTURE.skip} · {TORAH_ELS_PATH_FIXTURE.positions.join(" → ")}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginBottom: 14 }}>
            {STEPS.map((s, i) => (
              <button key={s.key} onClick={() => goTo(i)} disabled={busy}
                style={{
                  textAlign: "start", cursor: busy ? "wait" : "pointer", borderRadius: 13, padding: "9px 10px",
                  border: `1px solid ${i === step ? "rgba(232,201,93,.72)" : "rgba(255,255,255,.10)"}`,
                  background: i === step ? "rgba(212,175,55,.12)" : "rgba(255,255,255,.025)",
                  color: i === step ? "#f5df8a" : "#a79dab", fontFamily: F.ui, fontSize: 11.5, fontWeight: 800,
                }}>
                <span style={{ opacity: .65, marginInlineEnd: 5 }}>{i + 1}.</span>{s.title}
              </button>
            ))}
          </div>

          <div style={{ borderRadius: 15, border: "1px solid rgba(111,88,151,.38)", background: "rgba(7,5,12,.62)", padding: "13px 14px" }}>
            <div style={{ fontFamily: F.ui, fontWeight: 900, color: "#f5df8a", fontSize: 15 }}>{current.title}</div>
            <div style={{ marginTop: 5, color: "#c7becf", fontSize: 13, lineHeight: 1.7 }}>{current.text}</div>
            {step >= 2 && (
              <div style={{ marginTop: 8, color: "#86d9e7", fontFamily: F.ui, fontSize: 11.5 }}>
                <Locator picked={picked} />
              </div>
            )}
            {error && <div role="alert" style={{ marginTop: 8, color: "#ff9c9c", fontSize: 12 }}>{error}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!active ? (
                <button onClick={() => goTo(1)} style={primaryBtn}>התחילו את המסע ←</button>
              ) : (
                <>
                  <button onClick={() => goTo(step - 1)} disabled={step === 0 || busy} style={secondaryBtn}>הקודם</button>
                  <button onClick={() => goTo(step + 1)} disabled={step === STEPS.length - 1 || busy} style={primaryBtn}>{busy ? "טוען…" : "השלב הבא ←"}</button>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link to="/code" style={{ ...secondaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>פתחו את מנוע ה־ELS</Link>
              {active && <button onClick={reset} style={secondaryBtn}>איפוס המסע</button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const primaryBtn = {
  border: "1px solid rgba(212,175,55,.72)", background: "linear-gradient(135deg,#e0bd4b,#b88d24)", color: "#1a1100",
  borderRadius: 999, padding: "9px 16px", cursor: "pointer", fontFamily: F.ui, fontWeight: 900, fontSize: 12.5,
};

const secondaryBtn = {
  border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.04)", color: "#d5cbdc",
  borderRadius: 999, padding: "9px 14px", cursor: "pointer", fontFamily: F.ui, fontWeight: 800, fontSize: 12,
};
