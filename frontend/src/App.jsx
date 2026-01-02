import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import HealthMetrics from "./pages/HealthMetrics";
import Consultation from "./pages/Consultation";
import Reminders from "./pages/Reminders";
import Profile from "./pages/Profile";
import Documents from "./pages/Documents";
import GenerateReport from "./pages/GenerateReport";

import BottomNav from "./ui/components/BottomNav";
import { AuthProvider } from "./context/AuthContext";

// #region agent log
const logAppEvent = (event, data) => {
  fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'App.jsx',
      message: event,
      data: data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    })
  }).catch(() => {});
};
// #endregion

function App() {
  // #region agent log
  React.useEffect(() => {
    logAppEvent('App mounted', { path: window.location.pathname });
  }, []);
  // #endregion

  return (
    <AuthProvider>
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
          path="/consultation"
          element={
            <>
              <Consultation />
              <BottomNav />
            </>
          }
        />

        <Route
          path="/ai-chat"
          element={
            <>
              <Consultation />
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
    </AuthProvider>
  );
}

export default App;
