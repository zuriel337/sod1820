import React, { forwardRef, useMemo } from "react";
import "./life-journey-tree-2029.css";

// Display-only person + family tree. Selecting a person only moves the existing map focus
// (Research Context position); it never starts research, ELS, Raziel or a calculation.
function buildForest({ generations, coverage }) {
  const byRef = new Map(coverage.map(row => [row.memberRef, { ...row, children: [] }]));
  const hasParent = new Set();
  for (const link of generations.links) {
    const parent = byRef.get(link.parentRef);
    const child = byRef.get(link.childRef);
    if (!parent || !child || parent === child || hasParent.has(link.childRef)) continue;
    parent.children.push(child);
    hasParent.add(link.childRef);
  }
  return coverage.map(row => byRef.get(row.memberRef)).filter(node => node && !hasParent.has(node.memberRef));
}

function Medallion() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="life-tree__medallion">
    <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.12" />
    <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="24" cy="18" r="7" fill="currentColor" opacity="0.38" />
    <path d="M10 40c3-9 8-12 14-12s11 3 14 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;
}

function TreeNode({ node, level, focusedMemberRef, onFocus }) {
  const focused = focusedMemberRef === node.memberRef;
  return <li className="life-tree__item" data-level={level}>
    <button type="button" className="life-tree__node" aria-pressed={focused} data-focused={focused ? "true" : "false"} onClick={() => onFocus(node.memberRef)}>
      <Medallion />
      <span className="life-tree__name">{node.name}</span>
      <span className="life-tree__chips">
        <span className="life-tree__chip" data-state={node.researchReady ? "checked" : "waiting"}>{node.researchReady ? "נבדק" : "ממתין למחקר"}</span>
        <span className="life-tree__chip" data-state={node.hasBirthdate ? "available" : "waiting"}>{node.hasBirthdate ? "תאריך קיים" : "תאריך חסר"}</span>
      </span>
    </button>
    {node.children.length ? <ul className="life-tree__list" aria-label={`ילדים של ${node.name}`}>
      {node.children.map(child => <TreeNode key={child.memberRef} node={child} level={level + 1} focusedMemberRef={focusedMemberRef} onFocus={onFocus} />)}
    </ul> : null}
  </li>;
}

const LifeJourneyTree2029 = forwardRef(function LifeJourneyTree2029({ generations, coverage, focusedMemberRef, onFocus }, headingRef) {
  const forest = useMemo(() => buildForest({ generations, coverage }), [generations, coverage]);
  if (!forest.length) return null;
  return <section className="life-tree" data-experience-capability="life-journey-research-tree" aria-label="עץ המחקר של האדם והמשפחה">
    <header><small>עץ המחקר</small><h4 ref={headingRef} tabIndex={-1}>אדם ומשפחה, מסע אחד</h4></header>
    <div className="life-tree__stage">
      <div className="life-tree__plane">
        <ul className="life-tree__list life-tree__list--root">
          {forest.map(node => <TreeNode key={node.memberRef} node={node} level={0} focusedMemberRef={focusedMemberRef} onFocus={onFocus} />)}
        </ul>
      </div>
    </div>
    <p>בחירת אדם בעץ קובעת עבור מי נפתחות היכולות שמתחת. היא אינה מפעילה חיפוש, ELS, מנוע או AI.</p>
  </section>;
});

export default LifeJourneyTree2029;
