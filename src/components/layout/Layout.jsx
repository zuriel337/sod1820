import React from "react";
import { Outlet } from "react-router-dom";
import { C, F, GLOBAL_CSS } from "../../theme.js";
import SpaceBackground from "./SpaceBackground.jsx";
import Navbar from "./Navbar.jsx";
import LiveActivityBar from "./LiveActivityBar.jsx";
import Footer from "./Footer.jsx";
import RevelationAxis from "../axis/RevelationAxis.jsx";

export default function Layout() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: "#ede4d3", fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      <SpaceBackground />
      <RevelationAxis />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <LiveActivityBar />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
