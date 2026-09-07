import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EXPLORER_FACETS,
  fetchExplorerFacetPage,
  parseExplorerUrlState,
  explorerUrlSearch,
  replayLimitFor,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";

// 🧪 Universal Explorer — INTERNAL PREVIEW, Slice 2 (UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_
// FACET_COMPOSITION, work_log dispatch 0b70e0f9) + Slice 3 (UNIVERSAL_EXPLORER_V1_SLICE3_
// RESEARCH_CONTEXT_REOPEN, work_log dispatch ff9c3f2a). Thin shell: a facet switcher + a
// paginated card grid over the Slice-1 list-mode readers (src/lib/research/explorerFacets.js).
// No access tiers, no SEO, no Raziel hook, no ranking beyond each reader's own deterministic
// order. Naming here is intentionally provisional/internal — this is NOT canonical product copy
// and NOT "Heichal"; it stays unlinked from any public nav until a naming Human-Gate decision
// (checkpoint 0fa2f0e8) and further Explorer slices land.
//
// Slice 3 adds exact reopen/return, reusing the SAME Research Context contract as TopicPage /
// EntityHubPreviewPageFunctional verbatim (root subject sticky-if-absent; selection+lens follow
// the active facet; a card click records returnTo before navigating away) — no new store. The
// facet+offset themselves live in the URL (?facet=&offset=), which is what makes a deep link or a
// browser-back exactly reopenable; Research Context's own `dimensions.explorerFacet`/
// `explorerOffset` mirror the same two values so BottomBar's "כאן" sheet can see them too, without
// BottomBar.jsx itself being touched (its /explorer-preview label falls through to a generic
// "פוסט" — a known, accepted, out-of-scope cosmetic gap for this slice only).

const PAGE_SIZE = 24;

const C = {
  page: "#0d0b08",
  panel: "rgba(20,15,12,0.72)",
  ink: "#e8c840",
  soft: "#cfc9d6",
  line: "rgba(212,175,55,0.18)",
  gold: "#d4af37",
  gold2: "rgba(212,175,55,0.38)",
  goldBg: "rgba(212,175,55,0.12)",
  onGold: "#1a1305",
};

const page = {
  minHeight: "100vh",
  direction: "rtl",
  background: C.page,
  color: C.soft,
  padding: "24px 16px 64px",
  fontFamily: "Heebo, Arial, sans-serif",
};
const shell = { maxWidth: 1100, margin: "0 auto" };
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16 };

function FacetSwitcher({ facets, activeKey, onSelect }) {
  return (
    <div className="expl-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
      {facets.map((f) => {
        const active = f.key === activeKey;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onSelect(f.key)}
            style={{
              cursor: "pointer",
              minHeight: 40,
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${active ? C.gold : C.line}`,
              background: active ? C.gold : "transparent",
              color: active ? C.onGold : C.ink,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function FacetCard({ item, onLeave }) {
  return (
    <Link
      to={item.href}
      onClick={() => onLeave?.(item)}
      style={{
        ...card,
        display: "block",
        padding: 14,
        textDecoration: "none",
        color: C.ink,
        minWidth: 0,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.35, overflowWrap: "anywhere" }}>{item.label}</div>
      {item.sub ? <div style={{ color: C.soft, fontSize: 12.5, marginTop: 6, lineHeight: 1.6 }}>{item.sub}</div> : null}
    </Link>
  );
}

const DEFAULT_FACET_KEY = EXPLORER_FACETS[0]?.key || "number";

export default function ExplorerPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const research = useResearch();
  const urlState = useMemo(() => parseExplorerUrlState(searchParams, DEFAULT_FACET_KEY), [searchParams]);
  const activeKey = urlState.facet || DEFAULT_FACET_KEY;
  const [state, setState] = useState({ loading: true, cards: [], hasMore: false, error: null, offset: 0 });

  const loadPage = useCallback((facetKey, offset, replace, limit = PAGE_SIZE) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchExplorerFacetPage(facetKey, { limit, offset: replace ? 0 : offset })
      .then((page) => {
        if (!page) { setState({ loading: false, cards: [], hasMore: false, error: new Error("פאספט לא ידוע"), offset: 0 }); return; }
        setState((prev) => ({
          loading: false,
          error: null,
          hasMore: page.hasMore,
          offset: replace ? Math.max(0, limit - PAGE_SIZE) : offset,
          cards: replace ? page.cards : [...prev.cards, ...page.cards],
        }));
      })
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error })));
  }, []);

  // Deep-link reopen: a nonzero ?offset= replays the same accumulated cards in ONE bounded
  // request (capped at the reader's own 100-row max — never unbounded), so the page a user shared
  // or returned to looks exactly as they left it. Re-runs only when the facet or the URL's own
  // offset changes, not on every "עוד ←" click (those advance state.offset locally, not the URL).
  useEffect(() => {
    loadPage(activeKey, 0, true, replayLimitFor(urlState.offset, PAGE_SIZE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, urlState.offset]);

  const activeFacet = useMemo(() => EXPLORER_FACETS.find((f) => f.key === activeKey) || null, [activeKey]);

  // 🧭 Universal Research Context — same contract as TopicPage/EntityHubPreviewPageFunctional: the
  // root subject stays sticky (never overwritten by browsing the Explorer), current selection/lens
  // follow the active facet, and facet+offset also mirror into `dimensions` as two flat scalar
  // keys (nested objects are dropped by normalizeDimensions — see explorerFacets.js Slice 3 note).
  useEffect(() => {
    if (!activeFacet) return;
    const explorerHref = `/explorer-preview${explorerUrlSearch({ facet: activeKey, offset: state.offset })}`;
    const subject = { id: activeKey, type: "explorer-facet", label: activeFacet.label, href: explorerHref };
    const selection = { entityId: activeKey, entityType: "explorer-facet" };
    const dimensions = { explorerFacet: activeKey, explorerOffset: state.offset };
    if (!research.context?.subject) research.setResearchContext?.({ subject, selection, lens: "explorer", dimensions });
    else research.updateResearchContext?.({ selection, lens: "explorer", dimensions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFacet, activeKey, state.offset]);

  const selectFacet = (key) => setSearchParams(explorerUrlSearch({ facet: key, offset: 0 }).replace(/^\?/, ""));

  const loadMore = () => {
    const nextOffset = state.offset + PAGE_SIZE;
    setSearchParams(explorerUrlSearch({ facet: activeKey, offset: nextOffset }).replace(/^\?/, ""));
    loadPage(activeKey, nextOffset, false);
  };

  // A card click leaves the Explorer for the entity's own page — record the exact facet+offset as
  // returnTo so BottomBar's existing "חזרה" reopens this same accumulated page, mirroring
  // leaveHub/leaveTopic verbatim.
  const onLeaveCard = (card) => {
    if (!activeFacet) return;
    const explorerHref = `/explorer-preview${explorerUrlSearch({ facet: activeKey, offset: state.offset })}`;
    const subject = { id: activeKey, type: "explorer-facet", label: activeFacet.label, href: explorerHref };
    research.updateResearchContext?.({
      lens: activeFacet.key,
      selection: explorerCardSelection(card),
      returnTo: { href: explorerHref, label: activeFacet.label, subject },
    });
  };

  return (
    <main style={page}>
      <div style={shell}>
        <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900 }}>
          SOD1820 · UNIVERSAL EXPLORER · INTERNAL PREVIEW v1 (SLICE 3)
        </div>
        <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(28px,5vw,42px)", color: C.ink }}>
          {activeFacet?.label || "עדשה"}
        </h1>
        <div style={{ ...card, padding: "10px 14px", marginTop: 4, fontSize: 12.5, color: C.soft }}>
          תצוגה פנימית בלבד, לא מקושרת מהניווט הציבורי. רשימה מדורגת לפי הסדר הקבוע של כל קורא — בלי דירוג, בלי הקשר-מחקר, בלי שכבות-הרשאה. כל כרטיס מפנה לדף הישות הקיים.
        </div>

        <FacetSwitcher facets={EXPLORER_FACETS} activeKey={activeKey} onSelect={selectFacet} />

        {state.error ? (
          <div style={{ ...card, padding: 16, marginTop: 16, color: "#f28b82" }}>
            שגיאה בטעינת העדשה: {String(state.error.message || state.error)}
          </div>
        ) : null}

        {!state.error && !state.loading && state.cards.length === 0 ? (
          <div style={{ ...card, padding: 16, marginTop: 16 }}>אין פריטים בעדשה הזו כרגע.</div>
        ) : null}

        <div
          className="expl-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginTop: 16 }}
        >
          {state.cards.map((item) => <FacetCard key={`${item.facet}:${item.id}`} item={item} onLeave={onLeaveCard} />)}
        </div>

        {state.loading ? <div style={{ marginTop: 16, color: C.soft }}>טוען…</div> : null}

        {!state.loading && state.hasMore ? (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              type="button"
              onClick={loadMore}
              style={{
                cursor: "pointer",
                minHeight: 44,
                padding: "10px 22px",
                borderRadius: 999,
                border: `1px solid ${C.gold2}`,
                background: "transparent",
                color: C.gold,
                fontWeight: 800,
              }}
            >
              עוד ←
            </button>
          </div>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 480px) {
          .expl-tabs button { flex: 1 1 auto; text-align: center; }
        }
      `}</style>
    </main>
  );
}
