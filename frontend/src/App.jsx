import { useState, useEffect } from "react";
import { ThemeProvider } from "./ui/theme/ThemeProvider.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.js";

import Login from "./components/Login.js";
import Onboarding from "./pages/Onboarding.jsx";
import Home from "./pages/Home.jsx";
import Assistant from "./pages/Assistant.jsx";
import Profile from "./pages/Profile.jsx";
import { BottomNav } from "./ui/components/BottomNav.jsx";

// Основная логика приложения
function AppContent() {
  const [page, setPage] = useState("Home");
  const [onboarded, setOnboarded] = useState(false);
  const { user, loading } = useAuth();

  // Проверка онбординга
  useEffect(() => {
    const onboardedStatus =
      localStorage.getItem("onboarding_done") === "1";
    setOnboarded(onboardedStatus);
  }, []);

  // ⏳ Пока идёт авторизация Telegram
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          background: "#000",
        }}
      >
        Загрузка...
      </div>
    );
  }

  // ❌ Если пользователь не авторизован
  if (!user) {
    return <Login />;
  }

  // 🧭 Навигация по страницам
  const renderPage = () => {
    switch (page) {
      case "Home":
        return <Home />;
      case "Assistant":
        return <Assistant />;
      case "Profile":
        return <Profile />;
      default:
        return <Home />;
    }
  };

  // 🧩 Онбординг
  if (!onboarded) {
    return <Onboarding onFinish={() => {
      localStorage.setItem("onboarding_done", "1");
      setOnboarded(true);
    }} />;
  }

  return (
    <>
      {renderPage()}
      <BottomNav page={page} onChange={setPage} />
    </>
  );
}

// Обёртка с провайдерами
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
