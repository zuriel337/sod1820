// Left side panel tab policy inside a Post (ZURIEL 12.11.2026, decision 7). Pure.
//   - On a Post the panel prefers "ctx" (הקשר) first, because the context follows the active unit.
//   - A tab the reader chose ("feed" = עדכונים, "seq" = רצף האירועים, or "ctx") is never replaced while they read: scrolling,
//     a new active unit, or new feed rows do not move them. Only leaving the Post (a new surface) resets to the preferred tab.
//   - The context itself follows the active unit (activeSectionId); that is the context's content, not the tab choice.
// Meaning of the tabs: feed = what entered the site · ctx = connections of the active unit · seq = time of the events themselves,
// never the edit history of the HTML.
export const COMPANION_TABS = Object.freeze({ feed: "feed", ctx: "ctx", seq: "seq" });

export function preferredCompanionTab({ surface, hasContext = false, hasSequence = false } = {}) {
  if (surface === "post" && hasContext) return COMPANION_TABS.ctx;
  return COMPANION_TABS.feed;
}

// state = { tab, chosenByReader, surface }; event = { type: "surface" | "choose" | "context-change" | "feed-change" | "sequence-change", ... }
export function companionTabReducer(state, event, availability = {}) {
  switch (event?.type) {
    case "surface": {
      const surface = event.surface;
      return { surface, tab: preferredCompanionTab({ surface, ...availability }), chosenByReader: false };
    }
    case "choose":
      return Object.values(COMPANION_TABS).includes(event.tab) ? { ...state, tab: event.tab, chosenByReader: true } : state;
    case "context-change":
    case "feed-change":
    case "sequence-change":
      // Availability changed: only an UNCHOSEN tab may move (e.g. context became available); a chosen tab stays put,
      // unless its content disappeared entirely, in which case fall back to the preferred tab without marking a choice.
      if (state.chosenByReader) {
        const missing = (state.tab === "ctx" && !availability.hasContext) || (state.tab === "seq" && !availability.hasSequence);
        return missing ? { ...state, tab: preferredCompanionTab({ surface: state.surface, ...availability }), chosenByReader: false } : state;
      }
      return { ...state, tab: preferredCompanionTab({ surface: state.surface, ...availability }) };
    default:
      return state;
  }
}
