import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "../styles/AIChat.css";

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI health assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    // API call to AI analyze endpoint
    try {
      const response = await api.post("/ai/analyze", {
        message: inputValue,
        history: messages.filter(m => m.sender === "user" || m.sender === "bot").map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      });

      const botMessage = {
        id: messages.length + 2,
        text: response.data.response || "I understand. Could you provide more details?",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Unknown error";
      const botMessage = {
        id: messages.length + 2,
        text: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = () => {
    // Implementation for file upload
    const userMessage = {
      id: messages.length + 1,
      text: "📄 Medical document uploaded",
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const handleGenerateReport = () => {
    navigate("/generate-report", { state: { messages } });
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          ← Back
        </button>
        <h1>Health Assistant</h1>
        <button className="report-btn" onClick={handleGenerateReport} title="Generate Report">
          📋
        </button>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text}
            </div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <div className="upload-options">
          {showUploadOptions && (
            <div className="upload-menu">
              <button onClick={handleFileUpload}>📷 Upload Photo</button>
              <button onClick={handleFileUpload}>📄 Upload Document</button>
              <button onClick={() => setShowUploadOptions(false)}>Cancel</button>
            </div>
          )}
        </div>

        <div className="input-area">
          <button
            className="upload-btn"
            onClick={() => setShowUploadOptions(!showUploadOptions)}
            title="Upload files"
          >
            ➕
          </button>
          <input
            type="text"
            placeholder="Describe your symptoms or ask a question..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSendMessage()}
            className="chat-input"
          />
          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            title="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
