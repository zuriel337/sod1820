import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EXPLORER_FACETS,
  fetchExplorerFacetPage,
  fetchExplorerFacetDetail,
  facetHasDetail,
  parseExplorerUrlState,
  explorerUrlSearch,
  explorerReopenWindow,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import { resolveExplorerDepth } from "../lib/research/explorerAccess.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";

// 🧪 Universal Explorer — INTERNAL PREVIEW, Slice 2 (UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_
// FACET_COMPOSITION, work_log dispatch 0b70e0f9) + Slice 3 (UNIVERSAL_EXPLORER_V1_SLICE3_
// RESEARCH_CONTEXT_REOPEN, work_log dispatch ff9c3f2a). Thin shell: a facet switcher + a
// paginated card grid over the Slice-1 list-mode readers (src/lib/research/explorerFacets.js).
// No SEO, no Raziel hook. Naming here is intentionally provisional/internal — this is NOT
// canonical product copy and NOT "Heichal"; it stays unlinked from any public nav until a naming
// Human-Gate decision (checkpoint 0fa2f0e8) and further Explorer slices land.
//
// Slice 3 adds exact reopen/return, reusing the SAME Research Context contract as TopicPage /
// EntityHubPreviewPageFunctional verbatim (root subject sticky-if-absent; selection+lens follow
// the active facet; a card click records returnTo before navigating away) — no new store. The
// facet+offset themselves live in the URL (?facet=&offset=); Research Context's own
// `dimensions.explorerFacet`/`explorerOffset` mirror the same two values so BottomBar's "כאן"
// sheet can see them too, without BottomBar.jsx itself being touched (its /explorer-preview label
// falls through to a generic "פוסט" — a known, accepted, out-of-scope cosmetic gap for this slice).
//
// PAGE-WINDOW reopen (corrected per GPT challenge 8fc2d310 / dispatch 3d04a64b): a mount/reopen
// with a nonzero ?offset= fetches EXACTLY that one page window (explorerReopenWindow — one bounded
// request of PAGE_SIZE rows starting at offset, for ANY offset, no hard cap needed) rather than
// replaying every row from position 0. This restores the exact position a returnTo/deep-link
// points at truthfully, for any offset — it does not also replay everything seen before it in the
// original browsing session (that was the prior, incorrect "replay" contract, which silently
// truncated past ~76 accumulated rows). Clicking "עוד ←" afterwards keeps accumulating forward
// from that window exactly as during live browsing.
//
// Slice 4 (UNIVERSAL_EXPLORER_V1_SLICE4_DETAIL_COMPOSITION_REUSE, work_log dispatch 6871d978) adds
// ON-DEMAND detail composition for facets that have a real, already-composable detail adapter —
// today only "topic" (facetHasDetail/fetchExplorerFacetDetail wrap the SAME
// fetchCanonicalTopicConvergenceFinding + TopicConvergenceContent already used by /topic/:slug).
// Expand happens on ONE card at a time, on explicit click only — never per row on list load, never
// more than one bounded fetch in flight. Every other facet (all node-backed types + book) has no
// composable detail panel yet — per the dispatch's own anticipated fallback, they stay route-only
// (their card's existing click-through to /number/:n, entity-hub-preview, or /book/:slug), rather
// than fabricating a pseudo-detail body or duplicating EntityHubPreviewPageFunctional's page-level
// equality-row rendering into a second, drifting renderer of the same truth.
//
// Slice 5 (UNIVERSAL_EXPLORER_V1_SLICE5_RANKING_V1) adds explainable DISPLAY ranking only.
// Topic/Convergence is globally server-ordered by the existing public-safe meter_score signal,
// then approved_at, then id (via the ONE canonical topic-list reader — topicConvergence.js's
// buildTopicListQuery/fetchTopicCardList called with rankByMeterScore:true, not a forked reader;
// corrected per independent audit AFTER 6050377d / dispatch 764b3b9b). Every facet without a safe
// list-level signal stays rank-neutral and preserves its existing deterministic reader order.
// Rank never changes truth, verification, publication, canonical state, or access.
//
// Slice 6 (UNIVERSAL_EXPLORER_V1_SLICE6_PROGRESSIVE_DEPTH_ACCESS) adds only a transparent
// presentation projection over the EXISTING AuthContext owners. Anonymous/registered/member/admin
// identity can be named, but the complete Slice-5 public surface remains available at every level.
// No new permission store, no new reader, no RLS/security change, no truth/ranking mutation.
// Premium/admin-specific Explorer depth remains explicitly disabled until an already-owned,
// live capability can be reused safely. Access ≠ Truth; stronger identity ≠ stronger truth.

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

function RankNote({ rank }) {
  if (!rank) return null;
  if (rank.neutral) {
    return (
      <div style={{ color: C.soft, opacity: 0.72, fontSize: 10.5, marginTop: 8 }}>
        דירוג ניטרלי · אין אות דירוג בטוח זמין ברשימה הזו
      </div>
    );
  }
  const signal = rank.signals?.[0];
  return (
    <div style={{ color: C.gold, opacity: 0.9, fontSize: 10.5, marginTop: 8 }}>
      דירוג תצוגה · {signal?.label || "אות קיים"}: {signal?.value ?? rank.score}
      {signal?.source ? ` · מקור: ${signal.source}` : ""}
    </div>
  );
}

function AccessNote({ access }) {
  return (
    <div style={{ ...card, padding: "10px 14px", marginTop: 8, fontSize: 12.5, color: C.soft }}>
      <div style={{ color: C.gold, fontWeight: 900 }}>עומק / גישה · {access.label}</div>
      <div style={{ marginTop: 4, opacity: 0.86 }}>
        גישה אינה אמת: הרשימות, הנתיבים ופרטי ההתכנסות הציבוריים נשארים פתוחים בדיוק כמו קודם.
        אין ב־Slice 6 נעילת תוכן חדשה, ואין הרחבת Premium/Admin בלי capability חי של owner קיים.
      </div>
    </div>
  );
}

// The navigable title/subtitle stays a <Link> (unchanged click-through + onLeave/returnTo
// behavior from Slice 3). "expandable" adds a SIBLING button — not nested inside the anchor, so
// expand/collapse never triggers navigation — shown only for a facet with a real detail adapter
// (facetHasDetail; today: topic only).
function FacetCard({ item, onLeave, expandable, expanded, onToggleDetail }) {
  return (
    <div style={{ ...card, padding: 14, minWidth: 0 }}>
      <Link to={item.href} onClick={() => onLeave?.(item)} style={{ display: "block", textDecoration: "none", color: C.ink }}>
        <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.35, overflowWrap: "anywhere" }}>{item.label}</div>
        {item.sub ? <div style={{ color: C.soft, fontSize: 12.5, marginTop: 6, lineHeight: 1.6 }}>{item.sub}</div> : null}
        <RankNote rank={item.rank} />
      </Link>
      {expandable ? (
        <button
          type="button"
          onClick={() => onToggleDetail?.(item)}
          style={{
            cursor: "pointer", marginTop: 10, padding: "4px 10px", borderRadius: 999,
            border: `1px solid ${C.gold2}`, background: expanded ? C.gold : "transparent",
            color: expanded ? C.onGold : C.gold, fontWeight: 700, fontSize: 12,
          }}
        >
          {expanded ? "סגור פרטים ▲" : "הצג פרטים ▾"}
        </button>
      ) : null}
    </div>
  );
}

// Renders exactly what /topic/:slug itself renders (same finding, same component, same palette
// hook) — the Explorer adds no truth here, only a bounded on-demand fetch + an inline mount point.
function DetailPanel({ detail, palette, onLeave, onClose }) {
  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ color: C.gold, fontSize: 11, letterSpacing: 1, fontWeight: 900 }}>פרטים מלאים</div>
        <button type="button" onClick={onClose} style={{ cursor: "pointer", background: "transparent", border: "none", color: C.soft, fontSize: 13 }}>✕ סגור</button>
      </div>
      {detail.loading ? <div style={{ color: C.soft }}>טוען פרטים…</div> : null}
      {detail.error ? <div style={{ color: "#f28b82" }}>שגיאה בטעינת הפרטים: {String(detail.error.message || detail.error)}</div> : null}
      {!detail.loading && !detail.error && detail.finding ? (
        <TopicConvergenceContent finding={detail.finding} palette={palette} onLeave={onLeave} />
      ) : null}
      {!detail.loading && !detail.error && !detail.finding ? <div style={{ color: C.soft }}>אין פרטים זמינים עבור פריט זה.</div> : null}
    </div>
  );
}

const DEFAULT_FACET_KEY = EXPLORER_FACETS[0]?.key || "number";
const EMPTY_DETAIL = Object.freeze({ key: null, loading: false, finding: null, error: null });

export default function ExplorerPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const research = useResearch();
  const palette = usePalette();
  const { verified, isMember, isAdmin } = useAuth();
  const access = useMemo(
    () => resolveExplorerDepth({ verified, isMember, isAdmin }),
    [verified, isMember, isAdmin],
  );
  const urlState = useMemo(() => parseExplorerUrlState(searchParams, DEFAULT_FACET_KEY), [searchParams]);
  const activeKey = urlState.facet || DEFAULT_FACET_KEY;
  const [state, setState] = useState({ loading: true, cards: [], hasMore: false, error: null, offset: 0 });
  const [detail, setDetail] = useState(EMPTY_DETAIL);

  // replace=true always fetches exactly the ONE bounded window {offset,limit} and replaces the
  // grid with it (used for both a fresh facet switch — offset 0 — and a page-window reopen — any
  // offset); replace=false appends the next page onto what's already on screen ("עוד ←").
  const loadPage = useCallback((facetKey, offset, replace, limit = PAGE_SIZE) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchExplorerFacetPage(facetKey, { limit, offset })
      .then((pageResult) => {
        if (!pageResult) {
          setState({ loading: false, cards: [], hasMore: false, error: new Error("פאספט לא ידוע"), offset: 0 });
          return;
        }
        setState((prev) => ({
          loading: false,
          error: null,
          hasMore: pageResult.hasMore,
          offset,
          cards: replace ? pageResult.cards : [...prev.cards, ...pageResult.cards],
        }));
      })
      .catch((error) => setState((prev) => ({ ...prev, loading: false, error })));
  }, []);

  // Reopen: a nonzero ?offset= fetches EXACTLY that one page window in one bounded request
  // (explorerReopenWindow — always PAGE_SIZE rows, for any offset, no hard cap needed) — the
  // truthful, corrected contract from GPT challenge 8fc2d310 (the prior "replay from 0" contract
  // silently truncated past ~76 rows). Re-runs only when the facet or the URL's own offset
  // changes, not on every "עוד ←" click (those advance state.offset locally, not the URL).
  useEffect(() => {
    const win = explorerReopenWindow(urlState.offset, PAGE_SIZE);
    loadPage(activeKey, win.offset, true, win.limit);
    setDetail(EMPTY_DETAIL); // a stale expanded detail from a prior facet/page has no meaning here
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

  // Shared by both ways of leaving the Explorer — a card click (which navigates to the entity's
  // own page) and a link followed from inside an expanded detail panel (TopicConvergenceContent's
  // own onLeave hook, e.g. a number chip inside the topic body) — records the exact facet+offset
  // as returnTo so BottomBar's existing "חזרה" reopens this same page, mirroring leaveHub/leaveTopic.
  const recordReturnTo = (lens, selection) => {
    if (!activeFacet) return;
    const explorerHref = `/explorer-preview${explorerUrlSearch({ facet: activeKey, offset: state.offset })}`;
    const subject = { id: activeKey, type: "explorer-facet", label: activeFacet.label, href: explorerHref };
    research.updateResearchContext?.({ lens, selection, returnTo: { href: explorerHref, label: activeFacet.label, subject } });
  };
  const onLeaveCard = (item) => recordReturnTo(activeFacet?.key, explorerCardSelection(item));

  // Slice 4: expand/collapse ONE card's detail at a time — a second click on the same card
  // collapses it; switching cards re-fetches for the new one. Slice 6 preserves the existing
  // public Topic detail for every identity depth; access.publicTopicDetailVisible is deliberately
  // true for all tiers and exists here only to make that invariant explicit at the composition edge.
  const toggleDetail = (item) => {
    if (detail.key === item.id) { setDetail(EMPTY_DETAIL); return; }
    setDetail({ key: item.id, loading: true, finding: null, error: null });
    fetchExplorerFacetDetail(activeKey, item)
      .then((finding) => setDetail((prev) => (prev.key === item.id ? { key: item.id, loading: false, finding, error: null } : prev)))
      .catch((error) => setDetail((prev) => (prev.key === item.id ? { key: item.id, loading: false, finding: null, error } : prev)));
  };

  return (
    <main style={page}>
      <div style={shell}>
        <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900 }}>
          SOD1820 · UNIVERSAL EXPLORER · INTERNAL PREVIEW v1 (SLICE 6)
        </div>
        <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(28px,5vw,42px)", color: C.ink }}>
          {activeFacet?.label || "עדשה"}
        </h1>
        <div style={{ ...card, padding: "10px 14px", marginTop: 4, fontSize: 12.5, color: C.soft }}>
          דירוג הוא סדר תצוגה בלבד — לא אמת ולא קנון. התכנסויות מדורגות לפי meter_score הציבורי; עדשות שאין להן אות רשימתי בטוח נשארות ניטרליות ובסדר הקורא הקיים. אין שימוש ב־cross_method_strength.
        </div>
        <AccessNote access={access} />

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
          {state.cards.map((item) => (
            <FacetCard
              key={`${item.facet}:${item.id}`}
              item={item}
              onLeave={onLeaveCard}
              expandable={access.publicTopicDetailVisible && facetHasDetail(activeKey)}
              expanded={detail.key === item.id}
              onToggleDetail={toggleDetail}
            />
          ))}
        </div>

        {detail.key ? <DetailPanel detail={detail} palette={palette} onLeave={recordReturnTo} onClose={() => setDetail(EMPTY_DETAIL)} /> : null}

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
