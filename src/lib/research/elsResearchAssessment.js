// A read-only projection of existing discovery results. No store, scan or AI call.
// score intentionally remains null until a calibrated, comparable matrix policy exists.
export function assessElsResearch({ contextKey, runs = [], rows = [], isVerified = row => row.verified === true } = {}) {
  const current = runs.filter(run => contextKey && run.key === contextKey && run.data?.ok);
  const coverage = current.map(({ data }) => ({
    mode: data.plan?.mode === 'language' ? 'language' : 'words',
    plan: { ...data.plan },
    origin: data.origin ? { ...data.origin } : null,
    window: data.box ? { ...data.box } : null,
    completed: Number.isSafeInteger(data.coverage?.completedRays) ? data.coverage.completedRays : null,
    total: Number.isSafeInteger(data.coverage?.totalRays) ? data.coverage.totalRays : null,
    remaining: Number.isSafeInteger(data.coverage?.remainingRays) ? data.coverage.remainingRays : null,
    complete: data.coverage?.complete === true,
  }));
  const unique = [...new Map(rows.map(row => [row.occurrenceId || row.key, row])).values()];
  const verified = unique.filter(isVerified);
  return {
    version: 1, contextKey: contextKey || null, score: null,
    scoreReason: 'ranking-policy-not-calibrated',
    coverage, scanned: current.length > 0,
    partial: coverage.some(item => !item.complete || item.mode === 'language'),
    counts: { collected: unique.length, verified: verified.length, awaitingVerification: unique.length - verified.length,
      axisIntersections: verified.filter(row => row.kind === 'els' && row.distance === 0).length },
    // A sampled language pass cannot establish exhaustive matrix coverage.
    comparable: false,
  };
}

// An explainable investigation order. No source bonus and no claim of significance.
export function compareElsResearchRows(a, b) {
  const priority = row => row.verified ? (row.kind === 'els' && row.distance === 0 ? 0 : 1) : 2;
  return priority(a) - priority(b) || (a.distance ?? Infinity) - (b.distance ?? Infinity)
    || b.term.length - a.term.length || a.key.localeCompare(b.key);
}

// Explain existing work, without promising yield or starting a scan. Group-size
// settings affect presentation and are deliberately not a new coverage claim.
export function describeElsDiscoveryPlan(plan, runs = []) {
  const same = runs.filter(run => ['mode', 'minLength', 'maxLength', 'maxDistance']
    .every(field => run.data?.plan?.[field] === plan?.[field]));
  if (!same.length) return { kind: 'new', text: 'התכנית הזו טרם נבדקה בהקשר הנוכחי. היא אינה מבטיחה ממצאים חדשים.' };
  if (same.some(run => run.data.coverage?.complete === true && plan.mode !== 'language'))
    return { kind: 'repeat', text: 'התכנית המוגדרת כבר הושלמה. הרצה זהה אינה מוסיפה כיסוי מתוכנן.' };
  if (plan.mode === 'language') return { kind: 'sample', text: 'מדגם הביטויים כבר נבדק בתכנית הזו. הרצה חוזרת אינה מרחיבה את מדגם הקווים.' };
  if (same.some(run => run.data.continuation)) return { kind: 'continue', text: 'נשאר כיסוי בתכנית הזו. השתמשו בהמשך סריקה כדי להמשיך מהמקום שנעצר.' };
  return { kind: 'partial', text: 'התכנית נבדקה חלקית, ואין כאן המשך זמין. הפעלה נוספת מתחילה מחדש ואינה מבטיחה כיסוי נוסף.' };
}

export function elsResearchNextStep(runs = [], { ready = true, busy = false } = {}) {
  if (!ready) return { mode: null, text: 'המתינו למופע מאומת ולחלון מחקר זמין.' };
  if (busy) return { mode: null, text: 'פעולה מתבצעת. המתינו לתוצאתה לפני בחירת הבדיקה הבאה.' };
  if (runs.some(run => run.data?.plan?.mode === 'words' && run.data.continuation))
    return { mode: null, text: 'אפשר להמשיך את הסריקה המילונית שנעצרה, בלי להתחיל אותה מחדש.' };
  if (!runs.some(run => run.data?.plan?.mode === 'language'))
    return { mode: 'language', text: 'בדיקת ביטויים וחלוקת רצפים תוסיף מסלול שטרם נבדק כאן, במדגם מוגבל וללא AI.' };
  if (!runs.some(run => run.data?.plan?.mode === 'words'))
    return { mode: 'words', text: 'גילוי מילים יוסיף התאמות מילוניות במסלול שטרם נבדק כאן. הוא שונה ממדגם הביטויים.' };
  return { mode: null, text: 'שני מסלולי הגילוי נוסו. בדקו את הכיסוי של כל מקור ואת המבנים שנאספו לפני הרצה חוזרת. אין בכך הוכחה למיצוי החלון.' };
}
