import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import HealthMetrics from "./pages/HealthMetrics";
import Consultation from "./pages/Consultation";
import AIChat from "./pages/AIChat";
import Reminders from "./pages/Reminders";
import Profile from "./pages/Profile";
import Documents from "./pages/Documents";
import GenerateReport from "./pages/GenerateReport";
import SubscriptionRequired from "./pages/SubscriptionRequired";

import BottomNav from "./ui/components/BottomNav";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";

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

function AppRoutes() {
  const auth = useAuth();
  const { subscriptionChecked = false, isSubscribed = false, loading = true } = auth || {};

  // Show subscription screen if not subscribed (only after check is complete)
  if (!loading && subscriptionChecked === true && isSubscribed === false) {
    return <SubscriptionRequired />;
  }

  // Show loading while checking subscription
  if (loading || subscriptionChecked === false) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2D9B8C',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
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
  );
}

function App() {
  // #region agent log
  React.useEffect(() => {
    logAppEvent('App mounted', { path: window.location.pathname });
  }, []);
  // #endregion

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
