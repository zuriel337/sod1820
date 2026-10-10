import React, { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import Sod2029Shell, { use2029Shell } from '../components/experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../components/experience2029/NavigationIcon2029.jsx';
import { useResearch } from '../lib/research/ResearchProvider.jsx';
import { numberExpressionFocusHref } from '../lib/research/numberExpressionFocus.js';
import {
  BUILDINGS, CHALLENGES, UPGRADES, PREVIEW_STORAGE_KEY, initialState, transition,
  restorePreview, serializePreview, isUnlocked, upgradeAvailable, answerMatches,
} from '../lib/kingdom/kingdomPreview.js';
import KingdomMap2029 from '../components/kingdom/KingdomMap2029.jsx';
import './kingdom2029.css';

const SpatialGlyphScene2029 = lazy(() => import("../components/experience2029/SpatialGlyphScene2029.jsx"));

function readProgress() {
  try { return restorePreview(localStorage.getItem(PREVIEW_STORAGE_KEY)); }
  catch { return initialState(); }
}
function KingdomGame() {
  const shell = use2029Shell();
  const research = useResearch();
  const [state, dispatch] = useReducer(transition, undefined, readProgress);
  const [selected, setSelected] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('building');
    return BUILDINGS.some(item => item.id === id) ? id : 'garden';
  });
  const [challengeId, setChallengeId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [still, setStill] = useState(false);
  const [moment, setMoment] = useState(null);
  const mapRef = useRef(null);
  const sheetRef = useRef(null);
  const focusSheet = useRef(false);
  const momentId = useRef(0);
  useEffect(() => {
    if (focusSheet.current) { sheetRef.current?.focus(); focusSheet.current = false; }
  }, [selected]);
  function celebrate(type, building, text) {
    setMoment({ id: ++momentId.current, type, building, text });
  }
  const heading = useRef(null);
  const challengeHeading = useRef(null);
  const building = BUILDINGS.find((item) => item.id === selected);
  const challenges = CHALLENGES.filter((item) => item.building === selected);
  const challenge = challenges.find((item) => item.id === challengeId)
    || challenges.find((item) => !state.completed.includes(item.id));
  const solved = challenge && state.completed.includes(challenge.id);
  const unlocked = isUnlocked(state, selected);
  const finished = state.completed.length === CHALLENGES.length;
  useEffect(() => {
    if (!state.started) return;
    try { localStorage.setItem(PREVIEW_STORAGE_KEY, serializePreview(state)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [state]);
  function chooseBuilding(id) {
    focusSheet.current = true;
    setSelected(id); setChallengeId(null); setAnswer(''); setFeedback(''); setHint(false); setInspect(false);
    if (id === selected) { sheetRef.current?.focus(); focusSheet.current = false; }
  }
  function submit(event) {
    event.preventDefault();
    if (!challenge || solved) return;
    if (!answerMatches(challenge, answer)) {
      setFeedback('עוד ניסיון? בדקו את השיטה ואת ערכי האותיות.'); return;
    }
    setChallengeId(challenge.id);
    dispatch({ type: 'answer', id: challenge.id, answer });
    setFeedback('גילוי חדש! נוספו 20 אור ו־10 נקודות ניסיון במשחק.');
    celebrate('discovery', selected, '+20 אור · גילוי חדש בממלכה');
  }
  function nextChallenge() {
    setChallengeId(null); setAnswer(''); setFeedback(''); setHint(false);
    challengeHeading.current?.focus();
  }
  function buy(upgrade) {
    if (!upgradeAvailable(state, upgrade)) return;
    celebrate('upgrade', upgrade.building, `${upgrade.title} · הממלכה התפתחה`);
    dispatch({ type: 'upgrade', id: upgrade.id });
    setFeedback(`${upgrade.title} הושלם. ${upgrade.benefit}.`);
  }
  function openResearch(item) {
    const href = numberExpressionFocusHref(item.answer, { expression: item.expression, method: item.method });
    // Navigation identity only: the Number owner fetches/validates its own results.
    // Seed its subject so its normal entry effect preserves the exact return.
    research.setResearchContext?.({
      subject: { id: String(item.answer), type: 'number', label: String(item.answer), href },
      selection: null, lens: 'number', dimensions: {},
      returnTo: { href: `/2029/kingdom?building=${selected}`, label: 'ממלכת המספרים', subject: null,
        selection: null, lens: 'journey', dimensions: {}, journey: null },
    });
    shell.go(href, { preserve: false });
  }
  return <div className="kingdom" dir="rtl" data-still={still}>
    <header className="kingdom-intro">
      <div><p className="kingdom-eyebrow"><NavigationIcon2029 name="kingdom" size={18} /> מסע של אותיות וגילויים</p>
        <h1 ref={heading} tabIndex={-1}>ממלכת המספרים</h1>
        <p>כל חידה פותחת דרך. כל גילוי בונה את הממלכה שלכם.</p>
      </div>
      <span className="kingdom-preview-label">גרסת התנסות · התקדמות במכשיר הזה בלבד</span>
    </header>
    {!state.started ? <section className="kingdom-gate" aria-label="שער הממלכה">
      <div className="kingdom-gate-copy"><p className="kingdom-eyebrow">הממלכה מתחילה בסקרנות</p><h2>בין אות למספר,<br />עולם שלם מחכה.</h2>
        <p>פתרו חידות גימטריה, אספו אור והעירו את שלושת מבני הממלכה. אין שעון שסופר לאחור — מגלים בקצב שלכם.</p>
        <button className="kingdom-primary" onClick={() => { dispatch({ type: 'start' }); heading.current?.focus(); }}><NavigationIcon2029 name="kingdom" /> כניסה לממלכה</button>
        <small>10 חידות · 3 מבנים · 5 שדרוגים</small>
      </div>
    </section> : <>
      <section className="kingdom-stats" aria-label="ההתקדמות שלי">
        <div><NavigationIcon2029 name="action" /><span><strong data-testid="light">{state.light}</strong> אור</span></div>
        <div><NavigationIcon2029 name="journey" /><span><strong>{state.xp}</strong> ניסיון במשחק</span></div>
        <div><NavigationIcon2029 name="discovery" /><span><strong dir="ltr">{state.completed.length} / 10</strong> גילויים</span></div>
        <div><NavigationIcon2029 name="upgrade" /><span><strong dir="ltr">{state.upgrades.length} / 5</strong> שדרוגים</span></div>
      </section>
      <KingdomMap2029 state={state} selected={selected} onChoose={chooseBuilding} mapRef={mapRef}
        moment={moment} still={still} onToggleMotion={() => setStill(value => !value)} />
      {moment && <div key={moment.id} className="kingdom-moment" data-event={moment.type}>
        <NavigationIcon2029 name={moment.type === 'upgrade' ? 'upgrade' : 'discovery'} />
        <strong>{moment.text}</strong><button type="button" aria-label="סגירת משוב הגילוי" onClick={() => setMoment(null)}>סגירה</button>
      </div>}
      <p className="kingdom-feedback" role="status" aria-live="polite">{feedback || (finished ? 'כל עשר החידות פוענחו. אפשר להשלים שדרוגים ולהמשיך מהגילויים אל המחקר.' : 'התחילו בחידה, ואז השתמשו באור כדי לשדרג מבנה.')}</p>
      <div className="kingdom-sheet-nav"><button type="button" onClick={() => mapRef.current?.querySelector(`[data-building="${selected}"]`)?.focus()}><NavigationIcon2029 name="graph" size={20}/> חזרה למפה</button></div>
      <div className="kingdom-workbench" id="kingdom-workbench" ref={sheetRef} tabIndex={-1} role="region" aria-label={building.name}>
        <section className="kingdom-panel kingdom-challenge" aria-labelledby="kingdom-challenge-title">
          <div className="kingdom-panel-heading"><NavigationIcon2029 name={building.icon} /><span>{building.name}</span><small>{building.description}</small></div>
          {!unlocked ? <div className="kingdom-empty"><h2 id="kingdom-challenge-title">דרך חדשה מחכה להיפתח</h2><p>השלימו את השדרוג ״{UPGRADES.find((item) => item.id === building.unlock)?.title}״ כדי להיכנס.</p><button onClick={() => chooseBuilding(selected === 'mine' ? 'garden' : 'mine')}>חזרה למבנה הקודם</button></div>
            : challenge ? <>
              <h2 id="kingdom-challenge-title" ref={challengeHeading} tabIndex={-1}>{challenge.title}</h2>
              <p>מה הערך של <strong>״{challenge.expression}״</strong> בשיטת <strong>{challenge.method}</strong>?</p>
              <div className="kingdom-expression" aria-hidden="true">{challenge.expression}<span>{solved ? `= ${challenge.answer}` : '= ?'}</span></div>
              {!solved ? <form onSubmit={submit}>
                <label htmlFor="kingdom-answer">התשובה שלכם</label>
                <div className="kingdom-answer-row"><input id="kingdom-answer" inputMode="numeric" autoComplete="off" value={answer} maxLength={6} onChange={(event) => setAnswer(event.target.value)} required aria-describedby="kingdom-method-help" /><button className="kingdom-primary" type="submit">בדיקת התשובה</button></div>
                <p id="kingdom-method-help" className="kingdom-small">{challenge.method === 'רגיל' ? 'רגיל: מחברים את ערכי האותיות; לאות סופית אותו ערך כמו לאות הרגילה.' : 'סידורי: מחברים את מיקומי האותיות באלף־בית, מ־1 עד 22.'}</p>
                <button type="button" className="kingdom-hint" aria-expanded={hint} aria-controls="kingdom-hint" onClick={() => setHint((value) => !value)}><NavigationIcon2029 name="action" size={18} /> {hint ? 'סגירת הרמז' : 'אפשר רמז?'}</button>
                {hint && <p id="kingdom-hint">{challenge.hint}</p>}
              </form> : <div className="kingdom-solved">
                <p><NavigationIcon2029 name="discovery" /> פענחתם! הגילוי נוסף למחברת.</p>
                <div className="kingdom-actions"><button className="kingdom-primary" onClick={nextChallenge}>המשך הגילוי</button><button onClick={() => openResearch(challenge)}>לחקור את {challenge.answer}</button></div>
              </div>}
            </> : <div className="kingdom-empty"><h2 id="kingdom-challenge-title">כל הגילויים כאן הושלמו</h2><p>אפשר לשדרג את הממלכה או לבחור מבנה נוסף במפה.</p><button onClick={() => chooseBuilding(selected === 'garden' ? 'mine' : selected === 'mine' ? 'factory' : 'garden')}>אל המבנה הבא</button></div>}
          {unlocked && <div className="kingdom-inspect">
            <button type="button" aria-expanded={inspect} aria-controls="kingdom-letter-inspect" onClick={() => setInspect(value => !value)}><NavigationIcon2029 name="letters" size={20}/> {inspect ? 'סגירת מרחב האותיות' : 'מבט מקרוב באותיות'}</button>
            {inspect && <div id="kingdom-letter-inspect"><Suspense fallback={<p>מרחב האותיות נטען…</p>}><SpatialGlyphScene2029 expression={challenge?.expression || 'אור'} label="אותיות הגילוי" /></Suspense></div>}
          </div>}
        </section>
        <section className="kingdom-panel kingdom-upgrades" aria-labelledby="kingdom-upgrades-title"><h2 id="kingdom-upgrades-title"><NavigationIcon2029 name="upgrade" /> מגדלים את הממלכה</h2>
          <ul>{UPGRADES.map((upgrade) => {
            const bought = state.upgrades.includes(upgrade.id);
            return <li key={upgrade.id}><div><strong>{upgrade.title}</strong><p>{upgrade.benefit}</p><small>{upgrade.discoveries} גילויים{upgrade.requires ? ` · נדרש: ${UPGRADES.find((item) => item.id === upgrade.requires).title}` : ''}</small></div>
              <button aria-label={bought ? `${upgrade.title} הושלם` : `שדרוג ${upgrade.title} — ${upgrade.cost} אור`} disabled={!upgradeAvailable(state, upgrade)} onClick={() => buy(upgrade)}>{bought ? 'הושלם' : `${upgrade.cost} אור`}</button></li>;
          })}</ul>
        </section>
      </div>
      <section className="kingdom-panel kingdom-production" aria-labelledby="kingdom-production-title"><div><h2 id="kingdom-production-title"><NavigationIcon2029 name="combinations" /> האור שבמפעל</h2>
        <p>{isUnlocked(state, 'factory') ? 'כל גילוי חדש מזין את המפעל. השדרוגים מגדילים את האור שייווצר בגילויים הבאים.' : 'המפעל יתחיל לייצר אור מגילויים חדשים אחרי שדרוג ״עדשת המספרים״.'}</p></div>
        <button className="kingdom-primary" disabled={!state.pending} onClick={() => { celebrate('collect', 'factory', `${state.pending} אור נאספו מהמפעל`); dispatch({ type: 'collect' }); setFeedback(`${state.pending} אור נאספו מהמפעל.`); }}>איסוף {state.pending} אור</button>
      </section>
      <details className="kingdom-panel kingdom-journal"><summary><NavigationIcon2029 name="journal" /> מחברת הגילויים · {state.completed.length}</summary>
        <p>החישוב מתאר ערך מספרי. שוויון בין ערכים הוא הזמנה לבדיקה, ואינו מוכיח קשר או טענה על המציאות.</p>
        {!state.completed.length ? <p>הגילוי הראשון שלכם יופיע כאן.</p> : <ul>{state.completed.map((id) => {
          const item = CHALLENGES.find((c) => c.id === id);
          return <li key={id}><span><strong>{item.expression}</strong> · {item.method} · <bdi>{item.answer}</bdi></span><button onClick={() => openResearch(item)}>פתיחה במחקר</button></li>;
        })}</ul>}
        <p className="kingdom-small">חידות ההתנסות נבדקו במנוע הגימטריה ב־9.10.2026. במחקר אפשר לבדוק את החישוב העדכני ואת פרטיו. נקודות המשחק אינן דירוג מחקרי.</p>
        <div className="kingdom-actions"><button onClick={() => shell.go('/books')}><NavigationIcon2029 name="books" /> ספריית המקורות</button><button onClick={() => shell.go('/els')}><NavigationIcon2029 name="els" /> אל מחקר הצפנים</button></div>
      </details>
    </>}
    <p className="kingdom-local-note">{saveFailed ? 'השמירה במכשיר אינה זמינה. אפשר להמשיך לשחק, אך ההתקדמות לא תישמר לאחר סגירה.' : 'ההתקדמות נשמרת בדפדפן הזה כהתנסות אישית. אור הוא משאב משחק בלבד.'}</p>
  </div>;
}
export default function Kingdom2029Page() {
  return <Sod2029Shell title="ממלכת המספרים" surface="journey" introVariant="none" status="התנסות" wide><KingdomGame /></Sod2029Shell>;
}
