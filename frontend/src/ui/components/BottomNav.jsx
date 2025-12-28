import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const itemStyle = path => ({
    flex: 1,
    textAlign: "center",
    padding: 12,
    cursor: "pointer",
    color: location.pathname === path ? "#479D90" : "#888",
    fontWeight: location.pathname === path ? 600 : 400
  });

  return (
    <div
      style={{
        display: "flex",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#FFFFFF",
        borderTop: "1px solid #CAEEEA"
      }}
    >
      <div style={itemStyle("/home")} onClick={() => navigate("/home")}>
        Home
      </div>
      <div style={itemStyle("/assistant")} onClick={() => navigate("/assistant")}>
        Assistant
      </div>
      <div style={itemStyle("/profile")} onClick={() => navigate("/profile")}>
        Profile
      </div>
    </div>
  );
}
