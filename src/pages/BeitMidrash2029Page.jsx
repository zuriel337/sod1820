import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { getSystemEvents } from "../lib/systemEvents.js";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { applySeo } from "../lib/seo.js";
import {
  buildBeitMidrashSystemNow,
  selectMethodMenu,
  countRegisteredInactive,
  resolveSelectedMethod,
} from "../lib/research/beitMidrash2029Projection.js";
import "./beitMidrash2029.css";

// BEIT_MIDRASH_2029_GOLDEN_V1 — native 2029 Golden Preview for the independent Beit Midrash
// role (Human-Gate ZURIEL, work_log G3_BEIT_MIDRASH_2029_SCOPE, 2026-09-18): the comprehensive
// learn/explain home over the same canonical Method Registry + Engine + System Events readers.
// Deep multi-tool execution remains Heichal; this surface teaches and observes, it does not
// calculate locally and does not open a second Registry/engine/event feed.

const SAMPLE_DEFAULT = "חכמה";

function BeitMidrashHero({ registeredInactiveCount }) {
  return (
    <section className="sod29-section sod29-bm-hero" data-experience-capability="beit-midrash-hero">
      <div className="sod29-kicker">בית מדרש · 2029</div>
      <h2>ללמוד איך המערכת יודעת מה שהיא יודעת</h2>
      <p className="sod29-muted">
        בית מדרש הוא הבית ללמידה והסבר: כל שיטת גימטריה פעילה ברישום החי, עם דוגמה חיה
        ועקבת חישוב מהמנוע לפי דרישה. חישוב מעמיק, השוואה בין ביטויים וכלים נוספים נשארים
        בהיכל — כאן לומדים ומבינים, לא מריצים מחקר מלא.
      </p>
      {registeredInactiveCount > 0 && (
        <p className="sod29-muted">
          {registeredInactiveCount} שיטות נוספות רשומות ברישום אך אינן פעילות כרגע — מוצגות
          בכנות בלי ערך מומצא.
        </p>
      )}
    </section>
  );
}

function SystemNowLane({ state }) {
  if (state === undefined) {
    return <div className="sod29-muted">טוען מה קורה במערכת…</div>;
  }
  if (state === null) {
    return <div className="sod29-muted">לא ניתן לטעון כרגע את מה שקורה במערכת.</div>;
  }
  const now = buildBeitMidrashSystemNow(state);
  return (
    <div className="sod29-bm-now-lane" data-experience-capability="beit-midrash-system-now">
      <div className="sod29-bm-now-row">
        <span>✨ התכנסויות</span>
        <span>{now.counts.convergence}</span>
      </div>
      <div className="sod29-bm-now-row">
        <span>🌱 צמיחה</span>
        <span>{now.counts.growth}</span>
      </div>
      <div className="sod29-bm-now-row">
        <span>📢 ערוצים פעילים</span>
        <span>{now.counts.channels}</span>
      </div>
      {now.activity && (
        <div className="sod29-bm-now-row">
          <span>❤️ פעילות (24 שעות)</span>
          <span>{now.activity.searches24h ?? 0} חיפושים · {now.activity.numbersOpened ?? 0} מספרים</span>
        </div>
      )}
      {now.topGrowth.slice(0, 2).map((item, i) => (
        <div className="sod29-bm-now-row" key={item.url || i}>
          <span>{item.title || item.source || "פריט חדש"}</span>
          <span className="sod29-muted">{item.type || ""}</span>
        </div>
      ))}
    </div>
  );
}

function TraceView({ trace }) {
  if (trace === "loading") return <div className="sod29-bm-trace">טוען עקבה…</div>;
  if (trace === "error" || !trace) return <div className="sod29-bm-trace">לא ניתן להציג עקבה חיה לשיטה זו כרגע.</div>;
  const steps = trace?.data?.trace?.steps;
  if (!steps) return <div className="sod29-bm-trace">לא ניתן להציג עקבה חיה לשיטה זו כרגע.</div>;
  return <pre className="sod29-bm-trace">{JSON.stringify(steps, null, 2)}</pre>;
}

function MethodLibrary({ shell }) {
  const research = useResearch();
  const navigate = useNavigate();
  const [methodStates, setMethodStates] = useState(undefined); // undefined=loading, null=error, array=loaded
  const [profile, setProfile] = useState([]);
  const [sample, setSample] = useState(SAMPLE_DEFAULT);
  const [selectedKey, setSelectedKey] = useState(null);
  const [trace, setTrace] = useState(null);

  useEffect(() => {
    let live = true;
    fetchGematriaMethodStates()
      .then((rows) => { if (live) setMethodStates(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (live) setMethodStates(null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const raw = sample.trim();
    if (!raw) { setProfile([]); return; }
    fetchNumberMethodProfile(raw)
      .then((rows) => { if (live) setProfile(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (live) setProfile([]); });
    return () => { live = false; };
  }, [sample]);

  const menu = useMemo(() => selectMethodMenu(methodStates), [methodStates]);
  const registeredInactiveCount = useMemo(() => countRegisteredInactive(methodStates), [methodStates]);

  useEffect(() => {
    if (!selectedKey && menu.length) setSelectedKey(menu[0].methodKey);
  }, [menu, selectedKey]);

  const selected = useMemo(
    () => resolveSelectedMethod(methodStates, profile, selectedKey),
    [methodStates, profile, selectedKey],
  );

  async function onExplain() {
    if (!selectedKey || !sample.trim()) return;
    setTrace("loading");
    try {
      const finding = await fetchGematriaMethodTrace(selectedKey, sample.trim());
      setTrace(finding || "error");
    } catch {
      setTrace("error");
    }
  }

  function onOpenInHeichal() {
    if (!selectedKey || !sample.trim()) return;
    research.setResearchContext?.({
      subject: { id: sample.trim(), type: "phrase", label: sample.trim(), href: `/2029/number/${encodeURIComponent(sample.trim())}` },
      selection: { entityId: sample.trim(), entityType: "phrase", expression: sample.trim(), method: selectedKey, focusKind: "expression" },
      lens: "heichal",
      locale: "he",
      dimensions: { focusOrigin: "beit-midrash-2029" },
    });
    navigate("/heichal");
  }

  return (
    <section className="sod29-section sod29-bm-methods" data-experience-capability="beit-midrash-method-library">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">ספריית שיטות גימטריה</div>
          <h2>שיטה אחת בכל פעם, לעומק</h2>
        </div>
        <span className="sod29-chip">{menu.length} פעילות</span>
      </div>

      {methodStates === undefined && <div className="sod29-muted">טוען שיטות מהרישום…</div>}
      {methodStates === null && <div className="sod29-muted">לא ניתן לטעון כרגע את רשימת השיטות מהרישום החי.</div>}

      {Array.isArray(methodStates) && (
        <>
          <ul className="sod29-bm-method-nav" aria-label="בחירת שיטה">
            {menu.map((m) => (
              <li key={m.methodKey}>
                <button
                  type="button"
                  className={"sod29-bm-method-chip" + (selectedKey === m.methodKey ? " is-selected" : "")}
                  onClick={() => { setSelectedKey(m.methodKey); setTrace(null); }}
                >
                  {m.displayLabel}
                </button>
              </li>
            ))}
          </ul>

          <div className="sod29-bm-example">
            <label htmlFor="bm-sample-input" className="sod29-muted">דוגמה חיה (הדגמה בלבד — לא מחשבון 2029 עתידי):</label>
            <input
              id="bm-sample-input"
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              maxLength={40}
              aria-label="ביטוי לדוגמה חיה"
            />
          </div>

          {selected && (
            <div className="sod29-bm-method-detail" id={`bm-method-${selected.methodKey}`}>
              <h3>{selected.displayLabel}</h3>
              {selected.contextActivated && <p className="sod29-muted">שיטה זו מופעלת בהקשר ({selected.notScannableReason ? "לא נסרקת כרגע" : "דורשת הקשר"}).</p>}
              {!selected.scannable && !selected.contextActivated && (
                <p className="sod29-muted">⚠️ לא פעילה/נסרקת כרגע{selected.notScannableReason ? ` (${selected.notScannableReason})` : ""}.</p>
              )}
              {selected.derivedFrom.length > 0 && (
                <p className="sod29-muted">מבנה מכני: {selected.derivedFrom.join(` ${selected.operator || "·"} `)}</p>
              )}
              {(selected.soul || selected.sub) && (
                <p className="sod29-muted">
                  {selected.sub ? `תת-קטגוריה: ${selected.sub}` : ""}{selected.sub && selected.soul ? " · " : ""}{selected.soul ? `נשמה: ${selected.soul}` : ""}
                </p>
              )}
              {selected.hasComputed ? (
                <div className="sod29-bm-computed">{sample.trim()} = {selected.computedValue}</div>
              ) : (
                <p className="sod29-muted">אין דוגמה חיה זמינה לשיטה זו כרגע.</p>
              )}

              <div className="sod29-bm-continuation">
                <button type="button" className="sod29-action" onClick={onExplain} disabled={trace === "loading"}>
                  {trace === "loading" ? "טוען עקבה…" : "🔍 הצג עקבת חישוב מהמנוע"}
                </button>
                <button type="button" className="sod29-action primary" onClick={onOpenInHeichal}>
                  פתח ביטוי/שיטה זו בהיכל ←
                </button>
                <button type="button" className="sod29-action sod29-bm-building" disabled title="מחשבון 2029 בבנייה — אינו זמין עדיין">
                  מחשבון 2029 · בבנייה
                </button>
                {shell && (
                  <button type="button" className="sod29-action" onClick={() => shell.openRaziel?.({ intent: "beit_midrash_explain", methodKey: selected.methodKey })}>
                    שאל את רזיאל על השיטה
                  </button>
                )}
              </div>

              {trace !== null && <TraceView trace={trace} />}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BeitMidrashBody() {
  const shell = use2029Shell();
  const [systemEvents, setSystemEvents] = useState(undefined);
  const [registeredInactiveCount, setRegisteredInactiveCount] = useState(0);

  useEffect(() => {
    let live = true;
    getSystemEvents()
      .then((data) => { if (live) setSystemEvents(data || null); })
      .catch(() => { if (live) setSystemEvents(null); });
    fetchGematriaMethodStates()
      .then((rows) => { if (live) setRegisteredInactiveCount(countRegisteredInactive(rows)); })
      .catch(() => { /* hero badge stays 0 on failure — never fabricated */ });
    return () => { live = false; };
  }, []);

  return (
    <div className="sod29-beit-midrash">
      <BeitMidrashHero registeredInactiveCount={registeredInactiveCount} />
      <div className="sod29-bm-grid">
        <section className="sod29-section" data-experience-capability="beit-midrash-system-now-lane">
          <div className="sod29-section-head">
            <div>
              <div className="sod29-kicker">מה קורה במערכת</div>
              <h2>תמונת מצב חיה</h2>
            </div>
          </div>
          <SystemNowLane state={systemEvents} />
        </section>
        <MethodLibrary shell={shell} />
      </div>
    </div>
  );
}

export default function BeitMidrash2029Page() {
  useEffect(() => {
    applySeo({
      title: "בית מדרש · SOD1820 2029",
      description: "בית מדרש 2029 — לומדים איך המערכת מחשבת ומאמתת גימטריה, עם עקבת חישוב מהמנוע לפי דרישה.",
      path: "/2029?golden=beit-midrash",
    });
  }, []);
  return (
    <Sod2029Shell
      surface="beit-midrash"
      symbol="📖"
      eyebrow="LEARN · EXPLAIN · OBSERVE"
      title="בית מדרש"
      description="בית הלימוד וההסבר של המערכת: רישום שיטות חי, עקבת חישוב מהמנוע, ותמונת מצב של מה קורה במערכת עכשיו. חישוב מעמיק נשאר בהיכל."
    >
      <div data-experience-surface="beit-midrash" data-experience-question="איך המערכת יודעת מה שהיא יודעת?">
        <BeitMidrashBody />
      </div>
    </Sod2029Shell>
  );
}
