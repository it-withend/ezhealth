import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Assistant.css";

export default function Assistant() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Assistant.jsx:mount',
        message: 'Assistant component mounted',
        data: { path: window.location.pathname },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'F'
      })
    }).catch(() => {});
  }, []);
  // #endregion

  const assistantOptions = [
    {
      id: 1,
      icon: "🏥",
      title: t("assistant.scheduleAppointment"),
      description: t("assistant.scheduleAppointmentDesc"),
      color: "#2D9B8C"
    },
    {
      id: 2,
      icon: "📖",
      title: t("assistant.getAdvice"),
      description: t("assistant.getAdviceDesc"),
      color: "#4db8a8"
    },
    {
      id: 3,
      icon: "📄",
      title: t("assistant.browseDocuments"),
      description: t("assistant.browseDocumentsDesc"),
      color: "#2D9B8C"
    },
    {
      id: 4,
      icon: "👥",
      title: t("assistant.reviewDoctors"),
      description: t("assistant.reviewDoctorsDesc"),
      color: "#4db8a8"
    }
  ];

  const handleOptionClick = (option) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Assistant.jsx:handleOptionClick',
        message: 'Option clicked',
        data: { optionId: option.id, optionTitle: option.title },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'F'
      })
    }).catch(() => {});
    // #endregion

    try {
      if (option.id === 1) {
        // Navigate to health metrics for appointments
        navigate("/health");
      } else if (option.id === 2) {
        navigate("/ai-chat");
      } else if (option.id === 3) {
        navigate("/documents");
      } else if (option.id === 4) {
        // Navigate to profile for doctor reviews
        navigate("/profile");
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Assistant.jsx:handleOptionClick',
          message: 'Navigation error',
          data: { error: error.message, optionId: option.id },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F'
        })
      }).catch(() => {});
      // #endregion
      console.error('Navigation error:', error);
    }
  };

  return (
    <div className="assistant-container">
      <div className="assistant-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          ←
        </button>
        <div className="assistant-header-center">
          <div className="assistant-icon">🤖</div>
          <h1>Assistant</h1>
        </div>
        <button className="menu-btn">⋯</button>
      </div>

      <div className="assistant-content">
        <div className="greeting-section">
          <div className="greeting-bubble">
            <p>{t("assistant.greeting")} 👋 {t("assistant.greetingDesc")}</p>
          </div>
        </div>

        <div className="options-grid">
          {assistantOptions.map(option => (
            <Card
              key={option.id}
              className="option-card"
              onClick={() => handleOptionClick(option)}
              style={{ borderLeft: `4px solid ${option.color}` }}
            >
              <div className="option-icon">{option.icon}</div>
              <div className="option-title">{option.title}</div>
              <div className="option-description">{option.description}</div>
            </Card>
          ))}
        </div>

        <div className="input-section">
          <input
            type="text"
            placeholder={t("aiChat.placeholder")}
            className="message-input"
          />
          <button className="send-btn">{t("aiChat.send")}</button>
        </div>
      </div>
    </div>
  );
}
