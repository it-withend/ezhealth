import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HomeIcon, HealthIcon, ChatIcon, BellIcon, UserIcon } from "../icons/icons";
import "../styles/BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/home", label: "Home", icon: HomeIcon },
    { path: "/health", label: "Health", icon: HealthIcon },
    { path: "/consultation", label: "Consultation", icon: ChatIcon },
    { path: "/reminders", label: "Reminders", icon: BellIcon },
    { path: "/profile", label: "Profile", icon: UserIcon }
  ];

  const isActive = path => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <span className="nav-icon">
              <Icon />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
