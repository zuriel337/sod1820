import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import SpaceBackground from "./SpaceBackground.jsx";
import Navbar from "./Navbar.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx";
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";
import NumberDrawer from "../NumberDrawer.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import JoinCelebration from "../JoinCelebration.jsx";
import AdminJoinMonitor from "../AdminJoinMonitor.jsx";
import JoinInvite from "../JoinInvite.jsx";

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: "#ede4d3", fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      <SpaceBackground />
      <RevelationAxis />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <LiveActivityBar />
        <main>
          <ErrorBoundary routeKey={pathname}><Outlet /></ErrorBoundary>
        </main>
        <Footer />
      </div>
      <NumberDrawer />
      <JoinCelebration />
      <AdminJoinMonitor />
      <JoinInvite />
    </div>
  );
}
