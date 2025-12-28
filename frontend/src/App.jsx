import { useState, useEffect } from "react";
import { ThemeProvider } from "./ui/theme/ThemeProvider";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import Profile from "./pages/Profile";
import BottomNav from "./ui/components/BottomNav";

// Обернутый компонент для использования аутентификации
function AppContent() {
  const [page, setPage] = useState("Home");
  const [onboarded, setOnboarded] = useState(false);
  const { user, loading } = useAuth();

  // Проверяем, завершен ли онбординг
  useEffect(() => {
    const onboardedStatus = localStorage.getItem("onboarding_done") === "1";
    setOnboarded(onboardedStatus);
  }, []);

  // Если загружается, показываем индикатор
  if (loading) {
    return (
      <ThemeProvider>
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh",
          background: "#f5f5f5"
        }}>
          <div>Загрузка...</div>
        </div>
      </ThemeProvider>
    );
  }

  // Если пользователь не аутентифицирован, показываем Login
  if (!user) {
    return (
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    );
  }

  // Если не завершен онбординг, показываем онбординг
  if (!onboarded) {
    return (
      <ThemeProvider>
        <Onboarding 
          onFinish={() => {
            localStorage.setItem("onboarding_done", "1");
            setOnboarded(true);
          }} 
        />
      </ThemeProvider>
    );
  }

  // После аутентификации и онбординга показываем основной интерфейс с навигацией
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
