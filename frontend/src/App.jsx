import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import Dashboard from "./components/Dashboard";
import Profile from "./pages/Profile";

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
              <Dashboard />
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
