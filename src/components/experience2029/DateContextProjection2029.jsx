import React, { useEffect, useState } from "react";
import { checkAxisData, searchPosts } from "../../lib/supabase.js";
import { expressionToNumberTarget, fetchDateContext } from "../../lib/research/commandContextResolver2029.js";

const Section = ({ title, children }) => (
  <section className="sod29-date-section"><h4>{title}</h4>{children}</section>
);

function Temporal({ t }) {
  if (!t) return null;
  return (
    <span className="sod29-date-temporal">
      {t.publishedAt ? <span>פורסם: {t.publishedAt}</span> : null}
      {t.occurredAt ? <span>התרחש: {t.occurredAt}</span> : null}
      {t.uncertain ? <em> · אי־ודאות: {t.reason}</em> : null}
    </span>
  );
}

/** Date context lens inside the shared contextual sidecar. Read-only; mints no Event/identity. */
export default function DateContextProjection2029({ query, locale = "he", onOpenExpression, onAskRaziel, go, deps }) {
  const [state, setState] = useState({ status: "loading", projection: null });
  useEffect(() => {
    let live = true;
    setState({ status: "loading", projection: null });
    fetchDateContext(query, { checkAxisData, searchPosts, locale, ...(deps || {}) })
      .then((projection) => live && setState({ status: "ready", projection }))
      .catch(() => live && setState({ status: "error", projection: null }));
    return () => { live = false; };
  }, [query, locale, deps]);

  if (state.status === "loading") return <p role="status">טוען הקשר תאריך…</p>;
  const p = state.projection;
  if (state.status === "error" || !p) return <p role="alert">לא ניתן לטעון הקשר תאריך כרגע.</p>;
  return (
    <div className="sod29-date-context" data-type="date-context">
      <Section title="מה התאריך הזה">
        <strong>{p.header.label}</strong>
        <p>{p.header.note}</p>
        <ul className="sod29-date-dimensions">{p.dimensions.map((d) => <li key={d.id}>{d.label}: {d.value}</li>)}</ul>
      </Section>
      <Section title="אירועים / צירים">
        {p.events.length ? <ul>{p.events.map((e) => <li key={`${e.source}:${e.id}`}>{e.label} <small>(מועמד בלבד)</small> <Temporal t={e.temporal} /></li>)}</ul> : <p>לא נמצאו אירועים מתועדים בציר לתאריך הזה.</p>}
      </Section>
      <Section title="ייצוגי תאריך">
        {p.representations.length ? <ul>{p.representations.map((r) => (
          <li key={r.id}><span>{r.label}</span>{" "}
            <button type="button" className="sod29-action" onClick={() => onOpenExpression?.(expressionToNumberTarget(r))}>{r.actionLabel}</button>
          </li>))}</ul> : <p>אין ייצוגים זמינים.</p>}
      </Section>
      <Section title="חיבורים חזקים">
        {p.connections.length ? <ul>{p.connections.map((c) => <li key={`${c.type}:${c.id}`}>{c.label}</li>)}</ul> : <p>אין חיבורים להצגה.</p>}
      </Section>
      <Section title="פוסטים">
        {p.posts.length ? <ul>{p.posts.map((post) => (
          <li key={post.id}>
            <button type="button" className="sod29-link" onClick={() => go?.(`/post/${post.slug || post.id}`)}>{post.title}</button>
            {post.curatedHub ? <small> · {post.hubLabel}</small> : null} <Temporal t={post.temporal} />
          </li>))}</ul> : <p>לא נמצאו פוסטים.</p>}
      </Section>
      <Section title="שאל את רזיאל">
        <button type="button" className="sod29-action" onClick={() => onAskRaziel?.({ initialText: `מה קשור לתאריך ${p.header.label}?` })}>שאל את רזיאל</button>
      </Section>
    </div>
  );
}
