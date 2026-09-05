import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useLegacyNav } from "../lib/legacyNav.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { getPostBySlug } from "../lib/supabase.js";
import {
  BlogPage, PostPageBySlug, CategoryPage, TagPage, GematriaPhrasePage,
  AboutPage, LoginPage, ContactPage, ChatPage, SpotimChatPage,
  AdminPage, TrafficDashboardPage, NumbersReportPage, ThemePreviewPage,
  PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_STORE_KEY,
} from "../legacy/legacy.jsx";

// עמודי תוכן קיימים שנשמרים כפי שהם — עטופים במתאם הניווט החדש.

export function PostsRoute() {
  const nav = useLegacyNav();
  return <BlogPage onNav={nav} pageContent={PAGE_CONTENT_DEFAULTS.blog} adminMode={false} />;
}

export function PostBySlugRoute() {
  const nav = useLegacyNav();
  const { slug } = useParams();
  const research = useResearch();

  // 🧭 Universal Research Context — reuse the real posts row identity; never promote slug text itself to canonical identity.
  // The legacy renderer keeps its own read for now; this wrapper read is an adapter-only duplication until Post projection is composed.
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    getPostBySlug(slug).then(post => {
      if (!alive || !post) return;
      const stableId = post.id ?? post.wp_id ?? null;
      if (stableId == null) return;
      const id = String(stableId);
      const title = typeof post.title === "string" ? post.title : (post.title?.rendered || post.slug || slug);
      const subject = { id, type: "post", label: title, href: `/${post.slug || slug}` };
      const selection = { entityId: id, entityType: "post", locator: `/${post.slug || slug}` };
      if (!research.context?.subject) {
        research.setResearchContext?.({ subject, selection, lens: "post" });
      } else {
        research.updateResearchContext?.({ selection, lens: "post" });
      }
    }).catch(() => { /* renderer owns user-facing post errors */ });
    return () => { alive = false; };
    // Entering a new slug is the event. Context mutations are intentionally not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return <PostPageBySlug onNav={nav} />;
}

export function CategoryRoute() {
  const nav = useLegacyNav();
  return <CategoryPage onNav={nav} />;
}

export function TagRoute() {
  const nav = useLegacyNav();
  return <TagPage onNav={nav} />;
}

export function GematriaRoute() {
  const nav = useLegacyNav();
  return <GematriaPhrasePage onNav={nav} />;
}

export function AboutRoute() {
  const nav = useLegacyNav();
  return <AboutPage onNav={nav} pageContent={PAGE_CONTENT_DEFAULTS.about} adminMode={false} />;
}

export function LoginRoute() {
  const nav = useLegacyNav();
  return <LoginPage onNav={nav} />;
}

export function ContactRoute() {
  return <ContactPage />;
}

export function ChatRoute() {
  return <ChatPage />;
}

export function SpotimChatRoute() {
  return <SpotimChatPage />;
}

export function TrafficRoute() {
  const nav = useLegacyNav();
  return <TrafficDashboardPage onNav={nav} />;
}

export function NumbersReportRoute() {
  return <NumbersReportPage />;
}

export function ThemePreviewRoute() {
  return <ThemePreviewPage />;
}

// ניהול — עוטף מצב תוכן-עמודים מקומי (כמו ב-AppContent הישן)
export function AdminRoute() {
  const [pageContent, setPageContent] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(PAGE_CONTENT_STORE_KEY) || "{}"); }
    catch { return {}; }
  });
  const [selectedPageKey, setSelectedPageKey] = useState("home");
  const [, setAdminMode] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(PAGE_CONTENT_STORE_KEY, JSON.stringify(pageContent)); } catch { /* ignore */ }
  }, [pageContent]);

  function savePageContent(key, values) {
    setPageContent(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...values } }));
  }

  return (
    <AdminPage
      pageContent={pageContent}
      onSavePage={savePageContent}
      selectedPageKey={selectedPageKey}
      setSelectedPageKey={setSelectedPageKey}
      setAdminMode={setAdminMode}
    />
  );
}
