import React, { useEffect, useMemo, useState } from "react";
import { toggleTheme, useThemeMode } from "../../lib/themeMode.js";
import { formatTanakhRef, formatVerseGematriaSuffix } from "../../lib/presentation/canonicalPresentation.js";
import "./numberLivingWorld2029.css";

const clean = (value) => value == null ? "" : String(value).trim();

const MATH_FAMILY_HE = Object.freeze({
  prime: "מספר ראשוני",
  triangular: "מספר משולשי",
  square: "מספר ריבועי",
  pentagonal: "מספר מחומש",
  hexagonal: "מספר משושה",
  heptagonal: "מספר משובע",
  octagonal: "מספר מתומן",
  cube: "מספר מעוקב",
  power_of_two: "חזקה של 2",
  perfect: "מספר מושלם",
  abundant: "מספר שופע",
  deficient: "מספר חסר",
  semiprime: "חצי־ראשוני",
  palindrome_base10: "פלינדרום עשרוני",
  repdigit_base10_multi_digit: "ספרות חוזרות",
  harshad_base10: "Harshad / Niven",
  happy_base10: "מספר שמח",
  narcissistic_base10: "Armstrong",
  palindromic_prime_base10: "ראשוני פלינדרומי",
});

function technicalSourceText(value) {
  const text = clean(value);
  return /^(chat:|channel_updates:|wa_bot_log:|work_log:|gallery_images:|research-cue:|book:|https?:\/\/)/i.test(text);
}

function sourceLabel(row) {
  const type = clean(row?.type || row?.kind);
  if (type === "verse") {
    const ref = formatTanakhRef(clean(row?.ref));
    const text = clean(row?.text);
    return [ref, text].filter(Boolean).join(" — ") || "מקור מקראי";
  }
  const label = clean(row?.label || row?.display_name || row?.title || row?.name || row?.source_label);
  if (label && !technicalSourceText(label)) return label;
  if (type.includes("book")) return "ספר / מקור";
  return "מקור מחקר";
}

function sourceDetail(row) {
  const type = clean(row?.type || row?.kind);
  if (type === "verse" && Number.isFinite(Number(row?.value))) {
    return `פסוק שלם${formatVerseGematriaSuffix(row.value)}`;
  }
  const detail = clean(row?.locator || row?.citation || row?.reference || row?.subtitle);
  return detail && !technicalSourceText(detail) ? detail : "";
}

function worldLabel(row) {
  if (typeof row === "string") return clean(row);
  return clean(row?.label || row?.name || row?.title || row?.world || row?.topic || row?.slug);
}

function worldSummary(row) {
  if (typeof row === "string") return "";
  return clean(row?.summary || row?.subtitle || row?.description || row?.reason);
}

function numberFromRelation(row, root) {
  const values = [
    row?.target_value, row?.source_value, row?.value, row?.number,
    row?.to_value, row?.from_value, row?.target?.value, row?.source?.value,
    row?.to?.value, row?.from?.value, row?.target_number, row?.source_number,
  ].map(Number).filter(Number.isSafeInteger);
  return values.find((value) => value !== root) ?? null;
}

function relatedNumbersOf(root, projectionRelatedNumbers, relations, topics, zeroScale) {
  const rows = [];
  const seen = new Set([root]);
  const add = (value, reason, origin = "relation") => {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 0 || seen.has(n)) return;
    seen.add(n);
    rows.push({ value: n, reason, origin });
  };

  for (const row of projectionRelatedNumbers || []) {
    add(row?.value, clean(row?.relationType || row?.label) || "קשר מספרי", clean(row?.sourceKind) || "relation");
  }
  for (const relation of relations || []) {
    add(numberFromRelation(relation, root), clean(relation?.label || relation?.reason || relation?.relation_type) || "קשר בגרף", "relation");
  }
  for (const topic of topics || []) {
    const nums = [
      ...(Array.isArray(topic?.highlight_numbers) ? topic.highlight_numbers : []),
      ...(Array.isArray(topic?.numbers) ? topic.numbers : []),
    ];
    for (const value of nums) add(value, clean(topic?.title) || "התכנסות", "topic");
  }
  for (const value of zeroScale || []) {
    if (Number(value) !== root) add(value, "שיטת האפס", "zero");
  }
  return rows.slice(0, 18);
}

function factorizationText(profile) {
  const factors = profile?.arithmetic?.factorization?.factors || [];
  if (!profile?.arithmetic?.factorization?.complete) return "פירוק מוגבל";
  if (!factors.length) return profile?.input?.value < 2 ? "ללא פירוק ראשוני" : "—";
  return factors.map((item) => item.exponent > 1 ? `${item.prime}^${item.exponent}` : String(item.prime)).join(" × ");
}

function findingLabel(item) {
  return clean(item?.label || item?.title || item?.summary || item?.subject?.label || item?.kind) || "ממצא מחקר";
}

function findingReason(item) {
  return clean(item?.summary || item?.why || item?.reason || item?.explainWhy?.whyNow || item?.kind);
}

function personName(row) {
  return clean(
    row?.person_name || row?.researcher_name || row?.contributor_name ||
    row?.author_name || row?.author || row?.contributor?.display_name ||
    row?.researcher?.display_name
  );
}

function buildPeople(sources, findings) {
  const seen = new Set();
  const rows = [];
  for (const row of [...(sources || []), ...(findings || [])]) {
    const name = personName(row);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    rows.push({ name, reason: clean(row?.reason || row?.summary || row?.kind) || "קשור למחקר סביב המספר" });
  }
  return rows.slice(0, 6);
}

function buildWorldCards(worlds, topics) {
  const seen = new Set();
  const rows = [];
  const add = (row, fallback) => {
    const label = worldLabel(row) || fallback;
    if (!label || seen.has(label)) return;
    seen.add(label);
    rows.push({
      id: clean(row?.id || row?.slug) || label,
      label,
      summary: worldSummary(row),
      count: Number(row?.count || row?.items_count || row?.connections_count || 0) || null,
      raw: row,
    });
  };
  for (const row of worlds || []) add(row, "");
  for (const row of topics || []) add(row, "עולם מחקר");
  return rows.slice(0, 12);
}

function shortText(value, max = 110) {
  const text = clean(value);
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function SectionHead({ kicker, title, text, aside = null }) {
  return <div className="sod29-lw-head">
    <div>
      <span>{kicker}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
    {aside}
  </div>;
}

function DepthButton({ children, onClick, primary = false }) {
  return <button type="button" className={`sod29-lw-btn${primary ? " is-primary" : ""}`} onClick={onClick}>{children}</button>;
}

export default function NumberLivingWorld2029({
  root,
  data,
  activeExpression,
  activeMethodLabel,
  families = [],
  regularExpressions = [],
  languageBridges = [],
  topics = [],
  relations = [],
  projectionRelatedNumbers = [],
  sources = [],
  verseRows = [],
  versesLoading = false,
  worlds = [],
  researchFindings = [],
  timeline = [],
  zeroScale = [],
  mediaItems = [],
  math = null,
  activityCount = 0,
  researchState = {},
  onOpenWorld,
  onOpenHeichal,
  onRazielAction,
  onOpenNumber,
  onJourney,
  onPersonalJourney,
} = {}) {
  const theme = useThemeMode();
  const [activeWorld, setActiveWorld] = useState(0);
  const [scrubMode, setScrubMode] = useState("numbers");
  const [scrubIndex, setScrubIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [showAllExpressions, setShowAllExpressions] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [showAllVerses, setShowAllVerses] = useState(false);
  const [currentSection, setCurrentSection] = useState("עיקר");

  const worldCards = useMemo(() => buildWorldCards(worlds, topics), [worlds, topics]);
  const relatedNumbers = useMemo(
    () => relatedNumbersOf(root, projectionRelatedNumbers, relations, topics, zeroScale),
    [root, projectionRelatedNumbers, relations, topics, zeroScale],
  );
  const people = useMemo(() => buildPeople(sources, researchFindings), [sources, researchFindings]);
  const prominence = Array.isArray(researchState?.items) ? researchState.items : [];
  const expressionRows = useMemo(() => {
    const seen = new Set();
    const rows = [];
    const add = (phrase, method, meta = "") => {
      const text = clean(phrase);
      if (!text || seen.has(text)) return;
      seen.add(text);
      rows.push({ phrase: text, method: clean(method) || "רגיל", meta });
    };
    for (const row of regularExpressions || []) add(row?.phrase, "רגיל", row?.verified === true ? "מאומת" : "");
    for (const group of families || []) {
      const method = clean(group?.registry?.display_label || group?.display_label || group?.method || group?.method_key);
      for (const row of Array.isArray(group?.phrases) ? group.phrases : []) add(typeof row === "string" ? row : row?.phrase || row?.label, method);
    }
    return rows;
  }, [regularExpressions, families]);

  const directMaterialCount = topics.length + relations.length + sources.length + researchFindings.length + Math.min(expressionRows.length, 6);
  const sparseMode = directMaterialCount < 7 && zeroScale.some((value) => Number(value) !== root);
  const primary = prominence[0] || topics[0] || researchFindings[0] || null;
  const summits = prominence.slice(primary ? 1 : 0, 5);
  const selectedWorld = worldCards[Math.min(activeWorld, Math.max(0, worldCards.length - 1))] || null;

  const scrubRows = useMemo(() => {
    if (scrubMode === "findings") {
      return (prominence.length ? prominence : researchFindings).slice(0, 12).map((item, index) => ({
        key: item?.id || `finding-${index}`,
        title: findingLabel(item),
        subtitle: findingReason(item) || "ממצא מחקר",
        kind: "ממצא",
        raw: item,
      }));
    }
    if (scrubMode === "sequences") {
      return [
        { key: "pi", title: "π", subtitle: "חיפוש מיקום, לפני/אחרי ו־Derived Numeric Root", kind: "רצף" },
        { key: "fibonacci", title: "Fibonacci", subtitle: "איבר, מיקום, שכנים ופירוק Zeckendorf", kind: "רצף" },
      ];
    }
    return relatedNumbers.map((row) => ({
      key: String(row.value),
      title: String(row.value),
      subtitle: row.reason,
      kind: row.origin === "zero" ? "שיטת האפס" : "מספר קשור",
      value: row.value,
      raw: row,
    }));
  }, [scrubMode, prominence, researchFindings, relatedNumbers]);

  useEffect(() => {
    setScrubIndex(0);
  }, [scrubMode, root]);

  const selectedScrub = scrubRows[Math.min(scrubIndex, Math.max(0, scrubRows.length - 1))] || null;
  const q = clean(query).toLowerCase();
  const localMatches = useMemo(() => {
    if (!q) return [];
    const rows = [];
    const push = (kind, label, target) => {
      const text = clean(label);
      if (text && text.toLowerCase().includes(q)) rows.push({ kind, label: text, target });
    };
    expressionRows.forEach((row) => push("ביטוי", row.phrase, "number-expressions"));
    worldCards.forEach((row) => push("עולם", row.label, "number-worlds-live"));
    relatedNumbers.forEach((row) => push("מספר", String(row.value), "number-connections-live"));
    sources.forEach((row) => push("מקור", sourceLabel(row), "number-content-live"));
    verseRows.forEach((row) => push("פסוק", `${row.ref} ${row.text}`, "number-verses"));
    if ("פיבונאצ׳י".includes(q) || "fibonacci".includes(q)) push("מתמטיקה", "Fibonacci", "number-math");
    if ("פאי".includes(q) || "π".includes(q) || q === "pi") push("מתמטיקה", "π", "number-math");
    return rows.slice(0, 8);
  }, [q, expressionRows, worldCards, relatedNumbers, sources, verseRows]);

  const navItems = [
    ...(verseRows.length || versesLoading ? [["פסוקים", "number-verses"]] : []),
    ["עיקר", "number-essential"],
    ["עולמות", "number-worlds-live"],
    ["קשרים", "number-connections-live"],
    ["מתמטיקה", "number-math"],
    ["ביטויים", "number-expressions"],
    ["מקורות", "number-content-live"],
    ["זמן", "number-timeline-live"],
    ["מסע", "number-journey-gate"],
    ["מחקר", "number-deep-view"],
  ];

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const nodes = navItems.map(([, id]) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const item = navItems.find(([, id]) => id === visible.target.id);
      if (item) setCurrentSection(item[0]);
    }, { rootMargin: "-22% 0px -62% 0px", threshold: [0, .2, .5] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [root]);

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const expressionsShown = showAllExpressions ? expressionRows.slice(0, 30) : expressionRows.slice(0, 5);
  const sourcesShown = showAllSources ? sources.slice(0, 24) : sources.slice(0, 5);
  const timelineShown = showAllTimeline ? timeline.slice(-20).reverse() : timeline.slice(-5).reverse();

  return <div className="sod29-lw" data-experience-capability="number-living-world">
    <nav className="sod29-lw-mapnav" aria-label="מפת דף המספר">
      <button type="button" className="sod29-lw-map-current" onClick={() => jump(navItems.find(([label]) => label === currentSection)?.[1] || "number-essential")}>
        <span>אתה כאן</span><strong>{currentSection}</strong>
      </button>
      <div className="sod29-lw-map-progress" aria-hidden="true"><i style={{ width: `${Math.max(7, ((navItems.findIndex(([label]) => label === currentSection) + 1) / navItems.length) * 100)}%` }} /></div>
      <div className="sod29-lw-map-links">
        {navItems.slice(0, -1).map(([label, id]) => <button key={id} type="button" onClick={() => jump(id)}>{label}</button>)}
      </div>
      <button type="button" className="sod29-lw-theme" onClick={toggleTheme} aria-label={theme === "dark" ? "עבור למצב יום" : "עבור למצב לילה"}>
        {theme === "dark" ? "☀ יום" : "☾ לילה"}
      </button>
    </nav>

    {(versesLoading || verseRows.length) ? <section className="sod29-lw-section sod29-lw-verses" id="number-verses" data-experience-capability="number-verses" data-source="fn_verses_by_gematria">
      <SectionHead
        kicker="TANAKH · GEMATRIA"
        title={`פסוקים בגימטריה של ${root}`}
        text="פסוק שלם שנמצא דרך מנוע פסוקי-הערך הקנוני. מראה המקום מוצג באותיות עבריות; הערך מופיע רק אחרי הפסוק."
        aside={<span className="sod29-lw-count">{versesLoading ? "…" : verseRows.length}</span>}
      />
      {versesLoading ? <div className="sod29-lw-empty">טוען פסוקי־ערך…</div> : <div className="sod29-lw-verse-grid">
        {verseRows.slice(0, showAllVerses ? 8 : 3).map((row, index) => <article key={row.ref || index}>
          <span>{formatTanakhRef(row.ref)}</span>
          <p className="sod29-lw-verse-equality">
            <span>{row.text}</span>
            <strong>{formatVerseGematriaSuffix(row.value ?? root)}</strong>
          </p>
          <small>פסוק שלם · גימטריה רגילה</small>
        </article>)}
      </div>}
      {!versesLoading && verseRows.length > 3 ? <DepthButton onClick={() => setShowAllVerses((value) => !value)}>{showAllVerses ? "צמצם פסוקים" : `פתח עוד ${verseRows.length - 3} פסוקים`}</DepthButton> : null}
    </section> : null}

    <div className="sod29-lw-context" data-experience-capability="number-research-context">
      <div className="sod29-lw-context-snapshot" data-experience-capability="number-world-snapshot">
    <section className="sod29-lw-essential" id="number-essential" data-experience-capability="number-essential">
      <div className="sod29-lw-crown">
        <div className="sod29-lw-crown-copy">
          <span className="sod29-lw-kicker">העיקר סביב {root}</span>
          <h2>{clean(data?.anchorProfile?.row?.title || data?.anchorProfile?.row?.name) || (primary ? findingLabel(primary) : `המספר ${root}`)}</h2>
          <p>{shortText(
            clean(data?.anchorProfile?.row?.fact || primary?.summary || primary?.why || topics[0]?.subtitle) ||
            `זהו מרכז הכובד של ${root} כרגע. מה שמוצג כאן מגיע מהמחקר והקשרים הקיימים, בלי להמציא שכבת אמת חדשה.`,
            220
          )}</p>
          <div className="sod29-lw-crown-meta" data-experience-capability="number-research-state">
            {activeExpression ? <span>ביטוי פעיל · {activeExpression}</span> : null}
            {activeMethodLabel ? <span>שיטה · {activeMethodLabel}</span> : null}
            {sparseMode ? <span className="is-sparse">מצב מספר דל · המשפחה מרחיבה את התמונה</span> : null}
          </div>
          <div className="sod29-lw-actions">
            <DepthButton primary onClick={() => onOpenWorld?.()}>פתח את העולם סביב {root}</DepthButton>
            <DepthButton onClick={() => onRazielAction?.("number_context", { root })}>שאל את רזיאל</DepthButton>
            <DepthButton onClick={() => jump("number-journey-gate")}>קח אותי למסע</DepthButton>
          </div>
        </div>
        <div className="sod29-lw-crown-orbit" aria-hidden="true">
          <i /><i /><i />
          <strong>{root}</strong>
          <small>{sparseMode ? "מספר + משפחה" : "מספר"}</small>
        </div>
      </div>

      <div className="sod29-lw-summits" aria-label="פסגות סביב המספר">
        {(summits.length ? summits : [topics[0], researchFindings[0], sources[0], relatedNumbers[0]].filter(Boolean)).slice(0, 4).map((item, index) => (
          <article key={item?.id || item?.slug || item?.value || index}>
            <span>פסגה {index + 1}</span>
            <strong>{item?.value != null ? item.value : findingLabel(item)}</strong>
            <small>{shortText(item?.value != null ? item.reason : findingReason(item) || sourceLabel(item), 90)}</small>
          </article>
        ))}
      </div>

      <div className="sod29-lw-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`חפש בתוך ${root}: ביטוי · מספר · מקור · עולם`} aria-label={`חיפוש בתוך ${root}`} />
        {q ? <div className="sod29-lw-search-results">
          {localMatches.length ? localMatches.map((row, index) => <button key={index} type="button" onClick={() => { jump(row.target); setQuery(""); }}><span>{row.kind}</span><strong>{row.label}</strong></button>) : <span>לא נמצאה התאמה בתוך החומר שכבר נטען.</span>}
        </div> : null}
      </div>
    </section>

    <section className="sod29-lw-section sod29-lw-worlds" id="number-worlds-live" data-experience-capability="number-living-worlds">
      <SectionHead
        kicker="LIVING WORLDS"
        title={`העולמות החיים של ${root}`}
        text="3–4 העולמות הבולטים פתוחים כחוויה; השאר נשארים תגיות חיות. בחירה בעולם משנה את הפוקוס, לא את האמת."
        aside={<span className="sod29-lw-count">{worldCards.length}</span>}
      />
      {worldCards.length ? <>
        <div className="sod29-lw-world-grid">
          {worldCards.slice(0, 4).map((world, index) => <button type="button" key={world.id} className={index === activeWorld ? "is-active" : ""} onClick={() => setActiveWorld(index)}>
            <span>עולם {index + 1}</span>
            <strong>{world.label}</strong>
            <p>{world.summary || "פתח את הקשרים, המקורות והמספרים ששייכים לעולם הזה."}</p>
            <small>{world.count ? `${world.count} פריטים` : "עולם חי"}</small>
          </button>)}
        </div>
        <div className="sod29-lw-world-focus">
          <div><span>העולם שנבחר</span><strong>{selectedWorld?.label}</strong><p>{selectedWorld?.summary || `הצג את ${root} דרך העולם הזה בלי לצאת מדף המספר.`}</p></div>
          <DepthButton onClick={() => onOpenWorld?.({ meetingSlug: clean(selectedWorld?.raw?.slug) || null })}>פתח את העולם המלא</DepthButton>
        </div>
        {worldCards.length > 4 ? <div className="sod29-lw-tag-rail">
          {worldCards.slice(4).map((world, index) => <button type="button" key={world.id} onClick={() => setActiveWorld(index + 4)}>{world.label}</button>)}
        </div> : null}
      </> : <div className="sod29-lw-empty">אין עדיין עולם מסווג מספיק חזק. החלק מתקפל ולא ממציא קטגוריות.</div>}
    </section>
      </div>
    </div>

    <section className="sod29-lw-section" id="number-connections-live" data-experience-capability="number-connections">
      <SectionHead
        kicker="CONNECTIONS"
        title="חיבורים ומספרים קשורים"
        text="כל תחנה נושאת סיבה. שיטת האפס נשארת נגזרת מפורשת — ובמספר דל היא יכולה להפוך לחלק ראשון במעלה של הסיפור."
        aside={<span className="sod29-lw-count">{relatedNumbers.length}</span>}
      />
      {sparseMode ? <div className="sod29-lw-sparse-callout">
        <span>המספר ומשפחתו</span>
        <strong>{root} נשאר העוגן; משפחת האפס מרחיבה את התוכן</strong>
        <p>ממצאים מ־{zeroScale.filter((n) => Number(n) !== root).slice(0, 3).join(" · ")} יכולים להשתלב בעולמות, במקורות ובמתמטיקה, עם מסלול הגעה גלוי בעומק.</p>
      </div> : null}
      <div className="sod29-lw-related-rail">
        {relatedNumbers.slice(0, 9).map((row) => <button key={row.value} type="button" onClick={() => onOpenNumber?.(row.value)}>
          <strong>{row.value}</strong><span>{row.reason}</span><small>{row.origin === "zero" ? `${root} → ${row.value} · שיטת האפס` : "פתח דף מספר"}</small>
        </button>)}
      </div>
    </section>

    <section className="sod29-lw-section sod29-lw-math" id="number-math" data-experience-capability="number-math-universe">
      <SectionHead
        kicker="MATH PASSPORT · UNIVERSE"
        title={`היקום המתמטי של ${root}`}
        text="הפרופיל המתמטי, הרצפים והמעברים חיים באותו מרחב. החישוב דטרמיניסטי; המשמעות המחקרית נשארת שכבה נפרדת."
        aside={<span className="sod29-lw-count">{math?.families?.length || 0}</span>}
      />
      <div className="sod29-lw-math-hero">
        <div>
          <span>מספר במתמטיקה</span>
          <strong>{factorizationText(math)}</strong>
          <p>φ(n) = {math?.arithmetic?.totient ?? "—"} · שורש ספרות {math?.digit_structure?.digital_root ?? "—"} · סכום ספרות {math?.digit_structure?.digit_sum ?? "—"}</p>
        </div>
        <div className="sod29-lw-math-discoveries">
          {(math?.families || []).slice(0, 3).map((family) => <span key={family.key}>{MATH_FAMILY_HE[family.key] || family.label}</span>)}
          {!math?.families?.length ? <span>אין משפחה מיוחדת שזוהתה</span> : null}
        </div>
      </div>

      <div className="sod29-lw-scrubber">
        <div className="sod29-lw-scrub-tabs">
          <button type="button" className={scrubMode === "numbers" ? "is-active" : ""} onClick={() => setScrubMode("numbers")}>מספרים קשורים</button>
          <button type="button" className={scrubMode === "findings" ? "is-active" : ""} onClick={() => setScrubMode("findings")}>ממצאים</button>
          <button type="button" className={scrubMode === "sequences" ? "is-active" : ""} onClick={() => setScrubMode("sequences")}>רצפים</button>
        </div>
        {scrubRows.length ? <>
          <input type="range" min="0" max={Math.max(0, scrubRows.length - 1)} value={Math.min(scrubIndex, Math.max(0, scrubRows.length - 1))} onChange={(event) => setScrubIndex(Number(event.target.value))} aria-label="מד ניווט חי" />
          <div className="sod29-lw-stations">
            {scrubRows.map((row, index) => <button type="button" key={row.key} className={index === scrubIndex ? "is-active" : ""} onClick={() => setScrubIndex(index)}><i /><span>{row.title}</span></button>)}
          </div>
          <article className="sod29-lw-scrub-card">
            <div><span>{selectedScrub?.kind}</span><strong>{selectedScrub?.title}</strong><p>{selectedScrub?.subtitle}</p></div>
            <div className="sod29-lw-actions">
              {selectedScrub?.value != null ? <DepthButton primary onClick={() => onOpenNumber?.(selectedScrub.value)}>פתח את דף המספר</DepthButton> : null}
              {scrubMode === "sequences" ? <DepthButton primary onClick={() => onOpenHeichal?.({ kind: selectedScrub?.key === "pi" ? "sequence_pi" : "sequence_fibonacci", root })}>חקור {selectedScrub?.title} בהיכל</DepthButton> : null}
              {scrubMode === "findings" ? <DepthButton onClick={() => onRazielAction?.("explain_finding", { root, finding: selectedScrub?.raw })}>למה זה קשור?</DepthButton> : null}
            </div>
          </article>
        </> : <div className="sod29-lw-empty">אין עדיין תחנות מספיקות למד. הוא נשאר קל ולא מריץ חיפוש כבד ברקע.</div>}
      </div>
    </section>

    <section className="sod29-lw-section" id="number-expressions" data-experience-capability="number-expression-family">
      <SectionHead
        kicker="EXPRESSIONS · LANGUAGES"
        title="משפחת הביטויים"
        text="ביטויים שווים, שיטות ושפות נוספות מוצגים בהדרגה. מספר לעולם לא מנותק מהשיטה שיצרה אותו."
        aside={<span className="sod29-lw-count">{expressionRows.length}</span>}
      />
      <div className="sod29-lw-expression-grid">
        {expressionsShown.map((row, index) => <article key={row.phrase + index}><strong>{row.phrase}</strong><span>{row.method}</span>{row.meta ? <small>{row.meta}</small> : null}</article>)}
      </div>
      {languageBridges.length ? <div className="sod29-lw-language-rail">{languageBridges.slice(0, 6).map((row, index) => <span key={row?.id || index}>{clean(row?.english || row?.target || row?.translation || row?.label) || "קשר שפה מאומת"}</span>)}</div> : null}
      {expressionRows.length > 5 ? <DepthButton onClick={() => setShowAllExpressions((value) => !value)}>{showAllExpressions ? "צמצם" : `פתח עוד ${Math.min(25, expressionRows.length - 5)} ביטויים`}</DepthButton> : null}
    </section>

    <section className="sod29-lw-section" id="number-content-live" data-experience-capability="number-sources-content">
      <SectionHead
        kicker="SOURCES · CONTENT"
        title="מקורות ותוכן"
        text="המקור קודם לפרשנות. מדיה, ELS ו־3D נפתחים רק כשיש להם ערך מחקרי — לא כדי להכביד על הדף."
        aside={<span className="sod29-lw-count">{sources.length + mediaItems.length}</span>}
      />
      {mediaItems.length ? <div className="sod29-lw-feature-media">
        <figure><img src={mediaItems[0]?.thumbUrl || mediaItems[0]?.imageUrl} alt={mediaItems[0]?.label || `ייצוג חזותי של ${root}`} loading="lazy" /><figcaption><span>ייצוג מוביל</span><strong>{mediaItems[0]?.label || `המספר ${root}`}</strong></figcaption></figure>
        <div>{mediaItems.slice(1, 4).map((item, index) => <figure key={item?.galleryImageId || item?.nodeId || index}><img src={item?.thumbUrl || item?.imageUrl} alt={item?.label || "ייצוג"} loading="lazy" /><figcaption>{item?.label || "מדיה"}</figcaption></figure>)}</div>
      </div> : null}
      <div className="sod29-lw-source-list">
        {sourcesShown.map((row, index) => <article key={row?.id || row?.ref || index}><div><strong>{sourceLabel(row)}</strong>{sourceDetail(row) ? <small>{sourceDetail(row)}</small> : null}</div><span>מקור</span></article>)}
        {!sources.length ? <div className="sod29-lw-empty">אין כרגע מקור אנושי מספיק ברור להצגה.</div> : null}
      </div>
      <div className="sod29-lw-depth-gates">
        <button type="button" onClick={() => onOpenHeichal?.({ kind: "els_from_number", root })}><span>ELS / צפנים</span><strong>בדוק ממצאים קיימים או פתח חקירה</strong><small>לא רץ אוטומטית</small></button>
        <button type="button" onClick={() => onOpenHeichal?.({ kind: "spatial_from_number", root })}><span>3D / מרחב</span><strong>פתח רק אם המבנה מוסיף הבנה</strong><small>Lazy · עומק לפי דרישה</small></button>
      </div>
      {sources.length > 5 ? <DepthButton onClick={() => setShowAllSources((value) => !value)}>{showAllSources ? "צמצם מקורות" : "ראה מקורות נוספים"}</DepthButton> : null}
    </section>

    {people.length ? <section className="sod29-lw-section" id="number-people" data-experience-capability="number-people">
      <SectionHead kicker="PEOPLE · RESEARCHERS" title="אנשים וחוקרים" text="מופיעים רק כשיש תרומה ממשית לחומר סביב המספר. זהות וייחוס נשארים בבעלי הבית הקיימים." />
      <div className="sod29-lw-people">{people.map((person) => <article key={person.name}><span>אדם / חוקר</span><strong>{person.name}</strong><small>{person.reason}</small></article>)}</div>
    </section> : null}

    {timeline.length ? <section className="sod29-lw-section" id="number-timeline-live" data-experience-capability="number-timeline">
      <SectionHead kicker="LIVING RESEARCH" title="ציר ההתגלות" text="תחנות מחקר, גילוי והוספה למחקר. זמן הכנסת חומר אינו מוצג כאילו הוא זמן האירוע בעולם." />
      <div className="sod29-lw-timeline">
        {timelineShown.map((item, index) => <article key={item?.id || index}><time>{item?.at ? new Date(item.at).toLocaleDateString("he-IL") : "—"}</time><i /><div><strong>{clean(item?.label) || clean(item?.kind) || "פריט מחקר"}</strong><small>{clean(item?.kind) || "נוסף למחקר"}{item?.status ? ` · ${item.status}` : ""}</small></div></article>)}
      </div>
      {timeline.length > 5 ? <DepthButton onClick={() => setShowAllTimeline((value) => !value)}>{showAllTimeline ? "צמצם" : "פתח את ציר המחקר המלא"}</DepthButton> : null}
    </section> : null}

    <section className="sod29-lw-section sod29-lw-about" id="number-about" data-experience-capability="number-about">
      <SectionHead kicker="ABOUT" title={`על המספר ${root}`} text="תמונה מרוכזת של הביטויים, הקשרים, המקורות והעולמות שכבר קיימים סביב המספר." />
      <p>
        {root} מחבר כרגע {expressionRows.length} ביטויים שניתנים להצגה, {relations.length} קשרים, {sources.length} מקורות
        {worldCards.length ? ` ו־${worldCards.length} עולמות מחקר` : ""}. {sparseMode ? "כיוון שהחומר הישיר דל, משפחת שיטת האפס מרחיבה את הסיפור בלי להחליף את זהות המספר." : "הסיפור מוביל קודם בחומר הישיר ורק אחר כך בהרחבות."}
      </p>
    </section>

    <section className="sod29-lw-section sod29-lw-journey" id="number-journey-gate" data-experience-capability="number-journey-gate">
      <SectionHead kicker="JOURNEY GATE" title={`לאן ${root} לוקח אותך?`} text="המסע הוא דרך לנוע בתוך אותו Research Context. תיק אישי הוא מצב נשמר; המסע הוא הדרך להתקדם בו." />
      <div className="sod29-lw-journey-grid">
        <button type="button" onClick={() => onJourney?.()}><span>מסע כללי</span><strong>צא למסע בעולם של {root}</strong><small>עולמות · מספרים · מקורות · תחנות</small></button>
        <button type="button" onClick={() => onPersonalJourney?.()}><span>מסע אישי</span><strong>קח אדם דרך {root}</strong><small>פרטי כברירת מחדל · בלי ליצור תיק אוטומטית</small></button>
        <button type="button" onClick={() => onRazielAction?.("resume_or_start_journey", { root })}><span>המשך</span><strong>המשך מאיפה שהפסקת</strong><small>רזיאל מציע את הצעד הבא</small></button>
      </div>
    </section>

    <section className="sod29-lw-section sod29-lw-deep-gate" data-experience-capability="number-deep-research-gate">
      <SectionHead kicker="DEEP RESEARCH" title="רזיאל והמחקר העמוק" text="דף המספר נשאר עולם שלם. Trace, הרצות חדשות, ELS מלא, 3D מלא ומאות התאמות עוברים לעומק רק כשמבקשים." />
      <div className="sod29-lw-actions">
        <DepthButton primary onClick={() => onRazielAction?.("number_next_step", { root })}>מה כדאי לבדוק עכשיו?</DepthButton>
        <DepthButton onClick={() => onOpenHeichal?.({ kind: "number_deep_research", root })}>פתח בהיכל</DepthButton>
        <DepthButton onClick={() => jump("number-deep-view")}>פתח מפת מחקר</DepthButton>
      </div>
      <div className="sod29-lw-truth-strip">
        <span>חוזק מחקרי · {researchState?.independent ?? researchState?.engineMatches ?? "—"}</span>
        <span>אוצרות אנושית · {researchState?.gold ? `Gold × ${researchState.gold}` : researchState?.silver ? `Silver × ${researchState.silver}` : "—"}</span>
        <span>פעילות · {activityCount || "—"}</span>
      </div>
    </section>
  </div>;
}
