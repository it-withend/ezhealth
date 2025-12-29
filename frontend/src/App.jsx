import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import HealthMetrics from "./pages/HealthMetrics";
import AIChat from "./pages/AIChat";
import Reminders from "./pages/Reminders";
import Profile from "./pages/Profile";
import Documents from "./pages/Documents";
import GenerateReport from "./pages/GenerateReport";

import BottomNav from "./ui/components/BottomNav";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />

        <Route
          path="/home"
          element={
            <>
              <Home />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/assistant"
          element={
            <>
              <Assistant />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/health"
          element={
            <>
              <HealthMetrics />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/ai-chat"
          element={
            <>
              <AIChat />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/reminders"
          element={
            <>
              <Reminders />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/documents"
          element={
            <>
              <Documents />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/generate-report"
          element={
            <>
              <GenerateReport />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/profile"
          element={
            <>
              <Profile />
              <BottomNav />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
