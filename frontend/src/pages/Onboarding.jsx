import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Onboarding.css";

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading animation
    setIsLoading(false);
  }, []);

  const handleGetStarted = () => {
    navigate("/home");
  };

  return (
    <div className="onboarding-container">
      <div className="pills-background">
        <div className="pill pill-1"></div>
        <div className="pill pill-2"></div>
        <div className="pill pill-3"></div>
        <div className="pill pill-4"></div>
        <div className="pill pill-5"></div>
        <div className="pill pill-6"></div>
      </div>

      <div className="onboarding-content">
        <div className="text-section">
          <h1 className="onboarding-title">{t("onboarding.title")}</h1>
          <p className="onboarding-subtitle">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <button className="get-started-btn" onClick={handleGetStarted}>
          {t("onboarding.getStarted")}
        </button>
      </div>
    </div>
  );
}
