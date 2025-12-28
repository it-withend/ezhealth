import { useState } from "react";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import { BottomNav } from "./ui/components/BottomNav";
import { ThemeProvider } from "./ui/theme/ThemeProvider";

export default function App() {
  const [page, setPage] = useState("Home");
  const [onboarded, setOnboarded] = useState(false);

  if (!onboarded) {
    return (
      <ThemeProvider>
        <Onboarding onFinish={() => setOnboarded(true)} />
      </ThemeProvider>
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
