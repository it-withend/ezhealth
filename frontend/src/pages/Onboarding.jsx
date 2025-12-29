import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Onboarding.css";

export default function Onboarding() {
  const navigate = useNavigate();
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
          <h1 className="onboarding-title">Your digital healthcare assistant</h1>
          <p className="onboarding-subtitle">
            Book appointments, review doctors and track your medical history
          </p>
        </div>

        <button className="get-started-btn" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  );
}
