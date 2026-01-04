import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HomeIcon, HealthIcon, ChatIcon, BellIcon, UserIcon } from "../icons/icons";
import { useLanguage } from "../../context/LanguageContext";
import "../styles/BottomNav.css";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/home", label: t("nav.home"), icon: HomeIcon },
    { path: "/health", label: t("nav.health"), icon: HealthIcon },
    { path: "/consultation", label: t("nav.aiChat"), icon: ChatIcon },
    { path: "/reminders", label: t("nav.reminders"), icon: BellIcon },
    { path: "/profile", label: t("nav.profile"), icon: UserIcon }
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
