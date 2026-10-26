import React, { useId, useMemo, useState } from "react";
import "./life-journey-tree-2029.css";

// Display-only projection of the existing maps projection: one research tree for the person and family.
// It never starts research; every branch only moves the existing map position (tab + focused person + lens).
const BRANCH_STATE = Object.freeze({ checked: "נבדק", waiting: "ממתין", ready: "זמין", missing: "חסר", manual: "מופעל ידנית", not_connected: "ממתין לחיבור" });

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

function branchesFor(node, onSelect) {
  return [
    { id: "name", label: "שם", state: node.researchReady ? "checked" : "waiting", go: () => onSelect("matrix", { memberRef: node.memberRef }) },
    { id: "date", label: "תאריך", state: node.hasBirthdate ? "ready" : "missing", go: () => onSelect("time", { memberRef: node.memberRef }), disabled: !node.hasBirthdate },
    { id: "family", label: "משפחה", state: node.relationshipCount ? "ready" : "waiting", go: () => onSelect("generations", { memberRef: node.memberRef }) },
    { id: "human", label: "Human Design", state: "manual", go: () => onSelect("creation", { memberRef: node.memberRef, lens: "human" }), disabled: !node.hasBirthdate },
    { id: "sky", label: "שמיים", state: "manual", go: () => onSelect("creation", { memberRef: node.memberRef, lens: "sky" }), disabled: !node.hasBirthdate },
    { id: "els", label: "ELS", state: "not_connected", go: null, disabled: true },
  ];
}

function TreeNode({ node, level, expandedRef, onToggle, onSelect, focusedMemberRef }) {
  const panelId = useId();
  const open = expandedRef === node.memberRef;
  const branches = useMemo(() => branchesFor(node, onSelect), [node, onSelect]);
  return <li className="life-tree__item" data-level={level}>
    <div className="life-tree__node" data-focused={focusedMemberRef === node.memberRef ? "true" : "false"} data-open={open ? "true" : "false"}>
      <button type="button" className="life-tree__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => onToggle(open ? "" : node.memberRef)}>
        <span className="life-tree__name">{node.name}</span>
        <span className="life-tree__state" data-state={node.researchReady ? "checked" : "waiting"}>{node.researchReady ? "נבדק" : "ממתין למחקר"}</span>
      </button>
      <div id={panelId} className="life-tree__branches" hidden={!open} role="group" aria-label={`ענפי המסע של ${node.name}`}>
        {branches.map(branch => <button
          type="button"
          key={branch.id}
          className="life-tree__branch"
          data-branch={branch.id}
          data-state={branch.state}
          disabled={branch.disabled}
          onClick={branch.go || undefined}
        ><span>{branch.label}</span><small>{BRANCH_STATE[branch.state]}</small></button>)}
      </div>
    </div>
    {node.children.length ? <ul className="life-tree__list" aria-label={`ילדים של ${node.name}`}>
      {node.children.map(child => <TreeNode key={child.memberRef} node={child} level={level + 1} expandedRef={expandedRef} onToggle={onToggle} onSelect={onSelect} focusedMemberRef={focusedMemberRef} />)}
    </ul> : null}
  </li>;
}

export default function LifeJourneyTree2029({ generations, coverage, onSelect, focusedMemberRef }) {
  const forest = useMemo(() => buildForest({ generations, coverage }), [generations, coverage]);
  const [expandedRef, setExpandedRef] = useState(() => focusedMemberRef || forest[0]?.memberRef || "");
  if (!forest.length) return null;
  return <section className="life-tree" data-experience-capability="life-journey-research-tree" aria-label="עץ המחקר של האדם והמשפחה">
    <header><small>עץ המחקר</small><h4>אדם ומשפחה, מסע אחד</h4></header>
    <ul className="life-tree__list life-tree__list--root">
      {forest.map(node => <TreeNode key={node.memberRef} node={node} level={0} expandedRef={expandedRef} onToggle={setExpandedRef} onSelect={onSelect} focusedMemberRef={focusedMemberRef} />)}
    </ul>
    <p>פתיחת ענף מעבירה לתצוגה הקיימת בלבד, ואינה מפעילה חיפוש, ELS או מנוע. החזרה לעץ שומרת את האדם והמפה שנבחרו.</p>
  </section>;
}
