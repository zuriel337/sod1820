// The one on-demand join point of the public action family list (Traffic Intelligence v12, ZURIEL 25.11.2026).
// A family loaded with its surface (story_2029 today; a later family such as runtime errors tomorrow) is ADDED to globalThis.sodSpecs,
// a plain map name -> definition that readingActionSpec() spreads BEFORE its built-in families. So:
//   - a new family never replaces a family that is already registered (first definition wins; a second one is refused);
//   - an on-demand family never replaces a built-in family (the built-ins are written after the spread);
//   - a registered definition is frozen, so a module loaded later cannot change its events or fields.
// Not part of the code every page loads: only on-demand family modules import it. Self-contained: serialized into the request worker.
export function registerMeasurementFamilies2029(families, scope = globalThis) {
  const map = scope.sodSpecs && typeof scope.sodSpecs === "object" ? scope.sodSpecs : (scope.sodSpecs = {});
  const refused = [];
  for (const [name, spec] of Object.entries(families || {})) {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(name) || !spec || typeof spec !== "object" || !Array.isArray(spec.events) || !spec.fields
      || typeof spec.fields !== "object") { refused.push(name); continue; }
    if (Object.prototype.hasOwnProperty.call(map, name)) {
      if (JSON.stringify(map[name]) !== JSON.stringify(spec)) refused.push(name);
      continue;
    }
    map[name] = Object.freeze({ events: Object.freeze([...spec.events]), fields: Object.freeze({ ...spec.fields }) });
  }
  return refused;
}
