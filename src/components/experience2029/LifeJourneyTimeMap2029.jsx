import React, { useMemo, useState } from "react";
import "./life-journey-time-map-2029.css";

const TIME_LAYERS = Object.freeze([
  { id: "words", label: "מילות התאריך" },
  { id: "convergences", label: "התכנסויות זמן" },
  { id: "intervals", label: "מרווחי לידה" },
]);

function MethodList({ methods }) {
  if (!methods.length) return <small>הביטוי מוכן; הערכים יופיעו לאחר מחקר משפחתי מפורש.</small>;
  const visible = methods.slice(0, 6);
  const rest = methods.slice(6);
  return <>
    <div className="life-time-methods">{visible.map(method => <span key={`${method.methodLabel}:${method.value}`}><small>{method.methodLabel}</small><b>{method.value}</b></span>)}</div>
    {rest.length ? <details><summary>עוד {rest.length} שיטות</summary><div className="life-time-methods">{rest.map(method => <span key={`${method.methodLabel}:${method.value}`}><small>{method.methodLabel}</small><b>{method.value}</b></span>)}</div></details> : null}
  </>;
}

function DateWordsLayer({ person }) {
  if (!person) return <p className="life-time-empty">לאדם שנבחר אין עדיין תאריך לידה שמור.</p>;
  return <section className="life-time-words" aria-label={`ביטויי התאריך עבור ${person.name}`}>
    <header><div><small>{person.dateDisplay}</small><h5>{person.hebrewDate}</h5></div><span>{person.researchedExpressionCount}/5 ביטויים חושבו</span></header>
    <div>{person.expressions.map(expression => <article key={expression.role} data-ready={expression.methods.length > 0}>
      <small>{expression.label}</small><strong>{expression.text}</strong><MethodList methods={expression.methods} />
    </article>)}</div>
  </section>;
}

function ConvergencesLayer({ data }) {
  if (!data.convergences.length) return <p className="life-time-empty">{data.state === "ready"
    ? "המנוע השלים את המחקר ולא מצא כרגע ערך משותף בין ביטויי תאריך של שני אנשים."
    : "התכנסויות הזמן יופיעו רק לאחר מחקר משפחתי מפורש; בחירת אנשים לבדה אינה מפעילה חיפוש."}</p>;
  return <section className="life-time-convergences" aria-label="התכנסויות בין ביטויי תאריך">
    {data.convergences.map(row => <article key={row.value}>
      <b>{row.value}</b>
      <div>{row.participants.map(participant => <section key={participant.memberRef}>
        <strong>{participant.name}</strong>
        {participant.expressions.map((expression, index) => <span key={`${expression.role}:${expression.methodLabel}:${index}`}>{expression.label} · {expression.text} · {expression.methodLabel}</span>)}
      </section>)}</div>
      <small>{row.personCount} אנשים · ביטויי תאריך בלבד</small>
    </article>)}
    {data.coverage.truncated ? <small>מוצגות 24 ההתכנסויות הראשונות לפי כיסוי אנשים וערך.</small> : null}
  </section>;
}

function IntervalsLayer({ intervals }) {
  if (!intervals.length) return <p className="life-time-empty">נדרשים לפחות שני תאריכי לידה שמורים כדי לחשב מרווח מדויק.</p>;
  const visible = intervals.slice(0, 12);
  const rest = intervals.slice(12);
  const cards = rows => rows.map(row => <article key={row.id}>
    <div><strong>{row.leftName}</strong><i aria-hidden="true">↔</i><strong>{row.rightName}</strong></div>
    <b>{row.daysBetween.toLocaleString("he-IL")}</b><span>ימים בדיוק</span>
    <small>כ־{row.approximateYears.toLocaleString("he-IL")} שנים · נתון כרונולוגי בלבד</small>
  </article>);
  return <section className="life-time-intervals" aria-label="מרווחים בין תאריכי לידה">
    <div>{cards(visible)}</div>
    {rest.length ? <details><summary>הצג עוד {rest.length} זוגות</summary><div>{cards(rest)}</div></details> : null}
  </section>;
}

export default function LifeJourneyTimeMap2029({ data }) {
  const [layer, setLayer] = useState("words");
  const [focusRef, setFocusRef] = useState(() => data.people[0]?.memberRef || "");
  const focused = useMemo(() => data.people.find(person => person.memberRef === focusRef) || data.people[0] || null, [data.people, focusRef]);

  if (!data.people.length) return <div className="life-time-empty">לאנשים שנבחרו עדיין אין תאריכי לידה שמורים.</div>;
  return <section className="life-time-map" data-experience-capability="life-journey-time-gates-map">
    <header>
      <div><small>תאריך → מילים → שיטות → חיבורים</small><h4>מפת שערי הזמן</h4><p>אותו מנוע תאריך קיים, כתצוגה משפחתית אחת. אין כאן תחזית, כוכבים או מחזור שהומצא.</p></div>
      <span>{data.coverage.expressionCount} ביטויי תאריך</span>
    </header>

    <div className="life-time-dial" aria-label="בחרו אדם במפת הזמן">
      <i className="life-time-dial__ring" aria-hidden="true" />
      <div className="life-time-dial__core" aria-hidden="true"><b>{data.people.length}</b><small>אנשים</small></div>
      {data.people.map((person, index) => <button
        type="button"
        key={person.memberRef}
        style={{ "--time-angle": `${(index / data.people.length) * 360}deg` }}
        data-active={focused?.memberRef === person.memberRef}
        onClick={() => { setFocusRef(person.memberRef); setLayer("words"); }}
      ><b>{index + 1}</b><span>{person.name}</span><small>{person.hebrewDate}</small></button>)}
    </div>

    <div className="life-time-tabs" role="tablist" aria-label="שכבת מפת הזמן">
      {TIME_LAYERS.map(item => <button type="button" role="tab" key={item.id} aria-selected={layer === item.id} onClick={() => setLayer(item.id)}>{item.label}</button>)}
    </div>

    <div className="life-time-panel" role="tabpanel">
      {layer === "convergences" ? <ConvergencesLayer data={data} />
        : layer === "intervals" ? <IntervalsLayer intervals={data.intervals} />
          : <DateWordsLayer person={focused} />}
    </div>

    <footer>הקרנה פרטית לקריאה בלבד · ביטויי תאריך מה־Ledger · ערכים מהמחקר הקנוני · ללא ELS</footer>
  </section>;
}
