import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import "../styles/Assistant.css";

export default function Assistant() {
  const navigate = useNavigate();

  const assistantOptions = [
    {
      id: 1,
      icon: "🏥",
      title: "Schedule an Appointment",
      description: "Find a doctor and book your appointment",
      color: "#2D9B8C"
    },
    {
      id: 2,
      icon: "📖",
      title: "Get Advice",
      description: "Chat with our AI and get medical advice",
      color: "#4db8a8"
    },
    {
      id: 3,
      icon: "📄",
      title: "Browse Documents",
      description: "View your medical records and documents",
      color: "#2D9B8C"
    },
    {
      id: 4,
      icon: "👥",
      title: "Review Doctors",
      description: "Read reviews and find specialists",
      color: "#4db8a8"
    }
  ];

  const handleOptionClick = (option) => {
    if (option.id === 1) {
      navigate("/appointments");
    } else if (option.id === 2) {
      navigate("/ai-chat");
    } else if (option.id === 3) {
      navigate("/documents");
    } else if (option.id === 4) {
      navigate("/doctors");
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
            <p>Hello! 👋 I'm your Virtual Assistant. Select any topic or write your question below:</p>
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
            placeholder="Type here to write your message"
            className="message-input"
          />
          <button className="send-btn">Send</button>
        </div>
      </div>
    </div>
  );
}
