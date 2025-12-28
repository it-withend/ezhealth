import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import ThemeProvider from "./ui/theme/ThemeProvider.jsx";

import Login from "./components/Login.js";
import Onboarding from "./pages/Onboarding.jsx";
import Home from "./pages/Home.jsx";
import Assistant from "./pages/Assistant.jsx";
import Profile from "./pages/Profile.jsx";
import BottomNav from "./ui/components/BottomNav.jsx";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("Home");
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(localStorage.getItem("onboarding_done") === "1");
  }, []);

  // ❗ запуск ТОЛЬКО внутри Telegram
  if (!window.Telegram?.WebApp) {
    return <div style={{ padding: 24 }}>Open this app in Telegram</div>;
  }

  if (loading) return <div>Loading...</div>;

  if (!user) return <Login />;

  if (!onboarded) {
    return (
      <Onboarding
        onFinish={() => {
          localStorage.setItem("onboarding_done", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <ThemeProvider>
      {page === "Home" && <Home />}
      {page === "Assistant" && <Assistant />}
      {page === "Profile" && <Profile />}
      <BottomNav current={page} onChange={setPage} />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
