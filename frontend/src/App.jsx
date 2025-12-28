import { useState, useEffect } from "react";
import { ThemeProvider } from "./ui/theme/ThemeProvider";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import Profile from "./pages/Profile";
import { BottomNav } from "./ui/components/BottomNav";

// ⚠️ ВАЖНО: Login и auth — ВНЕ ThemeProvider
function AppContent() {
  const [page, setPage] = useState("Home");
  const [onboarded, setOnboarded] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    setOnboarded(localStorage.getItem("onboarding_done") === "1");
  }, []);

  // ⛔ Telegram Web (ПК) — показываем заглушку
  if (!window.Telegram?.WebApp) {
    return (
      <div style={{ padding: 24 }}>
        Open this app inside Telegram
      </div>
    );
  }

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <Login />;
  }

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

  // ✅ ThemeProvider ТОЛЬКО для основного UI
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
