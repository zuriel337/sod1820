import React, { useEffect, useMemo, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  DAAT_TEVUNOT_BRANCHES,
  DAAT_TEVUNOT_SECTIONS,
  DAAT_TEVUNOT_SOURCE,
} from "../data/daatTevunotSections2029.js";
import { applySeo } from "../lib/seo.js";
import "./daatTevunotTree2029.css";

const branchByKey = new Map(DAAT_TEVUNOT_BRANCHES.map(branch => [branch.key, branch]));
const sectionsByBranch = new Map(DAAT_TEVUNOT_BRANCHES.map(branch => [
  branch.key,
  DAAT_TEVUNOT_SECTIONS.filter(section => section.branch === branch.key),
]));

function requestedSection() {
  if (typeof window === "undefined") return 1;
  const value = Number(new URLSearchParams(window.location.search).get("section"));
  return Number.isInteger(value) && value >= 1 && value <= DAAT_TEVUNOT_SECTIONS.length ? value : 1;
}

function replaceSectionInUrl(sectionId) {
  const next = new URL(window.location.href);
  next.searchParams.set("section", String(sectionId));
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

function SectionNode({ section, active, matched, onSelect }) {
  return <button
    type="button"
    className={`daat29-node${active ? " is-active" : ""}${matched ? " is-match" : ""}`}
    onClick={() => onSelect(section.id)}
    aria-pressed={active}
    aria-label={`סעיף ${section.marker}, עמוד ${section.pdfPage}`}
    title={`סעיף ${section.marker} · ${section.speaker} · עמוד ${section.pdfPage}`}
  >
    <span>{section.marker}</span>
  </button>;
}

function SourcePanel({ section }) {
  const pdfUrl = `${DAAT_TEVUNOT_SOURCE.pdfUrl}#page=${section.pdfPage}&view=FitH`;
  return <aside id="daat29-source" className="daat29-source" aria-labelledby="daat29-source-title">
    <header>
      <div>
        <span>המקור המלא · PDF</span>
        <h2 id="daat29-source-title">עמוד {section.pdfPage}</h2>
      </div>
      <b>סעיף {section.marker}</b>
    </header>
    <div className="daat29-pdf-frame">
      <iframe
        key={section.pdfPage}
        src={pdfUrl}
        title={`${DAAT_TEVUNOT_SOURCE.title}, עמוד ${section.pdfPage}`}
        loading="eager"
      />
    </div>
    <dl>
      <div><dt>ספר</dt><dd>{DAAT_TEVUNOT_SOURCE.title}</dd></div>
      <div><dt>מחבר</dt><dd>{DAAT_TEVUNOT_SOURCE.author}</dd></div>
      <div><dt>עד</dt><dd>מהדורת האתר</dd></div>
      <div><dt>רישיון</dt><dd>{DAAT_TEVUNOT_SOURCE.license}</dd></div>
    </dl>
    <a href={DAAT_TEVUNOT_SOURCE.pdfUrl} target="_blank" rel="noreferrer">פתיחת ה־PDF בחלון נפרד ↗</a>
    <p>מספרי העמודים שייכים למהדורת האתר. זהו עד מחקר יציב ונגיש, לא מהדורה דיפלומטית היסטורית.</p>
  </aside>;
}

function ReadingPanel({ section, onSelect }) {
  const branch = branchByKey.get(section.branch);
  return <article className="daat29-reader" aria-labelledby="daat29-reader-title">
    <header>
      <div className="daat29-reader-index">
        <strong>{section.marker}</strong>
        <span>{section.id} / {DAAT_TEVUNOT_SECTIONS.length}</span>
      </div>
      <div>
        <span className="daat29-overline">{branch.title} · עמוד {section.pdfPage}</span>
        <h2 id="daat29-reader-title">{section.speaker} · סעיף {section.marker}</h2>
      </div>
    </header>

    <div className="daat29-reader-source">
      <span>נוסח המקור המלא</span>
      <p>{section.sourceText}</p>
    </div>

    <section className="daat29-reading-key" aria-labelledby="daat29-reading-key-title">
      <div>
        <span>מפתח קריאה בעברית עכשווית</span>
        <h3 id="daat29-reading-key-title">מה קורה בענף הזה?</h3>
      </div>
      <p>{branch.plainGuide}</p>
      <blockquote>
        <span>מוקד הסעיף · מתוך המקור</span>
        <strong>{section.focus}</strong>
      </blockquote>
      <ul>{branch.questions.map(question => <li key={question}>{question}</li>)}</ul>
      <small>מפתח הקריאה הוא הסבר מסייע בפריוויו. הוא אינו ציטוט, אינו תרגום מילולי ואינו ממצא קנוני.</small>
    </section>

    <nav className="daat29-reader-nav" aria-label="מעבר בין סעיפים">
      <button type="button" onClick={() => onSelect(section.id === 1 ? DAAT_TEVUNOT_SECTIONS.length : section.id - 1)}>→ הסעיף הקודם</button>
      <a href="#daat29-source">למקור · עמוד {section.pdfPage}</a>
      <button type="button" onClick={() => onSelect(section.id === DAAT_TEVUNOT_SECTIONS.length ? 1 : section.id + 1)}>הסעיף הבא ←</button>
    </nav>
  </article>;
}

export default function DaatTevunotTree2029Page() {
  const [selectedId, setSelectedId] = useState(requestedSection);
  const [query, setQuery] = useState("");
  const [activeBranch, setActiveBranch] = useState("all");
  const selected = DAAT_TEVUNOT_SECTIONS[selectedId - 1] || DAAT_TEVUNOT_SECTIONS[0];

  useEffect(() => {
    applySeo({
      title: `עץ דעת תבונות · סעיף ${selected.marker}`,
      description: "כל 195 סעיפי דעת תבונות בעץ קריאה עברי, לצד המקור המלא ועמוד ה־PDF.",
      path: "/2029/control",
      noindex: true,
    });
  }, [selected.marker]);

  const normalizedQuery = query.trim().toLocaleLowerCase("he");
  const matchingIds = useMemo(() => {
    if (!normalizedQuery) return new Set();
    return new Set(DAAT_TEVUNOT_SECTIONS.filter(section => {
      const branch = branchByKey.get(section.branch);
      return [section.marker, section.speaker, section.sourceText, branch.title, branch.summary]
        .some(value => value.toLocaleLowerCase("he").includes(normalizedQuery));
    }).map(section => section.id));
  }, [normalizedQuery]);

  const selectSection = sectionId => {
    const next = DAAT_TEVUNOT_SECTIONS[sectionId - 1];
    if (!next) return;
    setSelectedId(sectionId);
    replaceSectionInUrl(sectionId);
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("daat29-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  return <Sod2029Shell
    title="עץ דעת תבונות"
    eyebrow="ספרים 2029 · מהדורת מקור מלאה"
    description="195 סעיפים, תשעה ענפי־על ומקור פתוח לצד כל נקודת קריאה."
    status="Preview מוגן · קריאה בלבד"
    surface="books"
    symbol={<NavigationIcon2029 name="books" />}
    introVariant="none"
    wide
  >
    <main className="daat29" data-preview-only="true" data-publication-effect="none" data-source-license="CC-BY-SA-4.0">
      <section className="daat29-hero" aria-labelledby="daat29-title">
        <div className="daat29-hero-copy">
          <div className="daat29-kicker"><span /> הרמח״ל · נוסח עברי מלא</div>
          <h1 id="daat29-title">לראות את הספר<br /><em>כעץ אחד חי</em></h1>
          <p>כל סעיף הוא צומת. כל צומת שייך לענף רעיוני, נשאר מחובר לנוסח המלא ומוביל ישירות לעמוד המדויק במהדורת האתר.</p>
          <div className="daat29-hero-actions">
            <a href="#daat29-tree">כניסה לעץ</a>
            <a href="#daat29-source">המקור נשאר פתוח</a>
          </div>
        </div>
        <div className="daat29-hero-tree" aria-hidden="true">
          <div className="daat29-crown">
            {DAAT_TEVUNOT_BRANCHES.map((branch, index) => <i key={branch.key} style={{ "--i": index, "--branch-color": branch.color }} />)}
          </div>
          <div className="daat29-trunk"><strong>דעת</strong><span>תבונות</span></div>
          <div className="daat29-roots"><i /><i /><i /><i /><i /></div>
        </div>
        <div className="daat29-preview-note"><strong>הדמיית מוצר מלאה</strong><span>אין פרסום, שינוי הרשאה או כתיבה למסד.</span></div>
      </section>

      <section className="daat29-status" aria-label="מצב החומר">
        <article className="is-complete"><strong>195 / 195</strong><span>סעיפים במקור</span><small>הטקסט המבני הושלם</small></article>
        <article className="is-complete"><strong>99</strong><span>עמודי PDF</span><small>מקור נגיש בכל זמן</small></article>
        <article><strong>9</strong><span>ענפי קריאה</span><small>סכומם 195 סעיפים</small></article>
        <article className="is-candidate"><strong>מועמד</strong><span>מחקר פנימי</span><small>לא ממצא ציבורי</small></article>
        <article className="is-locked"><strong>0</strong><span>ממצאים ציבוריים</span><small>לא פורסם דבר</small></article>
      </section>

      <div className="daat29-product-layout">
        <div className="daat29-story">
          <section id="daat29-tree" className="daat29-tree" aria-labelledby="daat29-tree-title">
            <header>
              <div>
                <span className="daat29-overline">מפת הספר המלאה</span>
                <h2 id="daat29-tree-title">תשעה ענפים · 195 צמתים</h2>
                <p>בחר ענף או סעיף. הצבע מראה את המשפחה הרעיונית; המספר פותח את הנוסח המלא ואת עמוד המקור.</p>
              </div>
              <label>
                <span>חיפוש בעץ</span>
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="מילה, נושא או סעיף…" />
              </label>
            </header>

            <div className="daat29-branch-filter" role="group" aria-label="בחירת ענף">
              <button type="button" className={activeBranch === "all" ? "is-active" : ""} onClick={() => setActiveBranch("all")}>כל העץ · 195</button>
              {DAAT_TEVUNOT_BRANCHES.map(branch => <button
                type="button"
                key={branch.key}
                className={activeBranch === branch.key ? "is-active" : ""}
                style={{ "--branch-color": branch.color }}
                onClick={() => setActiveBranch(branch.key)}
              >{branch.shortTitle} · {branch.range[1] - branch.range[0] + 1}</button>)}
            </div>

            {normalizedQuery && <div className="daat29-search-result" aria-live="polite">נמצאו {matchingIds.size} סעיפים</div>}

            <div className="daat29-branches">
              {DAAT_TEVUNOT_BRANCHES.map((branch, branchIndex) => {
                if (activeBranch !== "all" && activeBranch !== branch.key) return null;
                const sections = sectionsByBranch.get(branch.key);
                const branchMatches = !normalizedQuery || sections.some(section => matchingIds.has(section.id));
                return <section
                  key={branch.key}
                  className={`daat29-branch${branchMatches ? "" : " is-dimmed"}`}
                  style={{ "--branch-color": branch.color, "--branch-index": branchIndex }}
                  aria-labelledby={`daat29-branch-${branch.key}`}
                >
                  <div className="daat29-branch-line"><i /><span>{String(branchIndex + 1).padStart(2, "0")}</span></div>
                  <header>
                    <div>
                      <span>סעיפים {sections[0].marker}–{sections.at(-1).marker}</span>
                      <h3 id={`daat29-branch-${branch.key}`}>{branch.title}</h3>
                    </div>
                    <strong>{sections.length}</strong>
                  </header>
                  <p>{branch.summary}</p>
                  <div className="daat29-node-grid" role="group" aria-label={`${branch.title}, ${sections.length} סעיפים`}>
                    {sections.map(section => <SectionNode
                      key={section.id}
                      section={section}
                      active={selected.id === section.id}
                      matched={matchingIds.has(section.id)}
                      onSelect={selectSection}
                    />)}
                  </div>
                </section>;
              })}
            </div>
          </section>

          <div id="daat29-reader"><ReadingPanel section={selected} onSelect={selectSection} /></div>
        </div>

        <SourcePanel section={selected} />
      </div>

      <section className="daat29-boundary" aria-labelledby="daat29-boundary-title">
        <div>
          <span className="daat29-overline">מקור, הסבר ומעמד</span>
          <h2 id="daat29-boundary-title">שלוש שכבות שאינן מתערבבות</h2>
        </div>
        <ol>
          <li><span>01</span><strong>המקור</strong><p>כל 195 הסעיפים מוצגים בשלמותם על בסיס נוסח ויקיטקסט וברישיון {DAAT_TEVUNOT_SOURCE.license}.</p></li>
          <li><span>02</span><strong>מפת הקריאה</strong><p>הענפים וההסברים הם עזרי ניווט עכשוויים, ומסומנים בנפרד מן המקור.</p></li>
          <li><span>03</span><strong>מעמד המחקר</strong><p>הדוסייה הקנוני נשאר פרטי ומועמד; המסך אינו מפרסם ממצאים ואינו משנה אמת מערכתית.</p></li>
        </ol>
      </section>

      <footer className="daat29-license">
        <div><strong>ייחוס ורישיון</strong><span>{DAAT_TEVUNOT_SOURCE.edition}</span></div>
        <nav aria-label="קישורי מקור ורישיון">
          <a href={DAAT_TEVUNOT_SOURCE.wikisourceUrl} target="_blank" rel="noreferrer">נוסח ויקיטקסט ↗</a>
          <a href={DAAT_TEVUNOT_SOURCE.licenseUrl} target="_blank" rel="noreferrer">{DAAT_TEVUNOT_SOURCE.license} ↗</a>
        </nav>
      </footer>
    </main>
  </Sod2029Shell>;
}
