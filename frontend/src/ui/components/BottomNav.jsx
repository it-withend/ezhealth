import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/home", label: "Home", icon: "🏠" },
    { path: "/health", label: "Health", icon: "❤️" },
    { path: "/ai-chat", label: "Chat", icon: "💬" },
    { path: "/reminders", label: "Reminders", icon: "🔔" },
    { path: "/profile", label: "Profile", icon: "👤" }
  ];

  const isActive = path => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.path}
          className={`nav-item ${isActive(item.path) ? "active" : ""}`}
          onClick={() => navigate(item.path)}
          title={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
