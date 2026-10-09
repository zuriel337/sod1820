import React, { createContext, useContext, useEffect } from "react";

// Presentation extension of SystemFrame's one Command Island. The frame owns the
// registration lifetime; the surface keeps its inputs, engine and findings.
export const SystemToolDockContext2029 = createContext(null);

export function useSystemToolDock2029(projection) {
  const register = useContext(SystemToolDockContext2029);
  useEffect(() => {
    if (register && projection) return register(projection);
  }, [register, projection]);
  return Boolean(register);
}

export function SystemToolDockActions2029({ actions, onInvoke }) {
  return actions.map((action) => <button
    type="button" key={action.id} data-tool-action={action.id}
    aria-label={action.label} title={action.label}
    aria-expanded={action.expanded} aria-controls={action.controls}
    onClick={(event) => onInvoke(action, event.currentTarget)}
  ><span aria-hidden="true">{action.icon}</span><small>{action.shortLabel || action.label}</small></button>);
}
