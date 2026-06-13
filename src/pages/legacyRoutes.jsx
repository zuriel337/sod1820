import React, { useState, useEffect } from "react";
import { useLegacyNav } from "../lib/legacyNav.js";
import { C, F } from "../theme.js";
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

// דף הצ'אט המאוחד: שני טאבים — צ'אט האתר (Supabase, דרך המשתמש הרשום)
// והצ'אט הוותיק (Spot.IM, 133.7k הודעות היסטוריות).
export function CommunityChatRoute() {
  const [tab, setTab] = useState("site"); // site = צ'אט האתר · legacy = הוותיק
  const tabBtn = on => ({
    cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700,
    padding: "9px 20px", borderRadius: 999,
    border: `1px solid ${on ? C.gold : C.border}`,
    background: on ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))" : "transparent",
    color: on ? C.goldBright : C.muted,
  });
  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", padding: "28px 16px 0" }}>
        <button style={tabBtn(tab === "site")} onClick={() => setTab("site")}>💬 צ'אט האתר</button>
        <button style={tabBtn(tab === "legacy")} onClick={() => setTab("legacy")}>🏛 הצ'אט הוותיק · 133.7k</button>
      </div>
      {tab === "site"
        ? <ChatPage />
        : <SpotimChatPage />}
    </div>
  );
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
