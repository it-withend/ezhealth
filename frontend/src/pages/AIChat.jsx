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
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    const messageText = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'AIChat.jsx:handleSendMessage',
        message: 'Sending message to AI',
        data: { message: messageText, messagesCount: messages.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'E'
      })
    }).catch(() => {});
    // #endregion

    // API call to AI analyze endpoint
    try {
      const response = await api.post("/ai/analyze", {
        message: messageText,
        history: messages.filter(m => m.sender === "user" || m.sender === "bot").map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AIChat.jsx:handleSendMessage',
          message: 'AI response received',
          data: { hasResponse: !!response.data?.response, responseLength: response.data?.response?.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        })
      }).catch(() => {});
      // #endregion

      const botMessage = {
        id: messages.length + 2,
        text: response.data.response || "I understand. Could you provide more details?",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AIChat.jsx:handleSendMessage',
          message: 'AI API error',
          data: { error: error.message, status: error.response?.status, responseData: error.response?.data },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        })
      }).catch(() => {});
      // #endregion

      console.error("Error:", error);
      let errorMessage = error.response?.data?.error || error.message || "Unknown error";
      
      // Translate common error messages to Russian
      if (errorMessage.includes("quota exceeded") || errorMessage.includes("insufficient_quota") || errorMessage.includes("quota")) {
        errorMessage = "Превышен лимит использования AI API. Пожалуйста, проверьте баланс и квоты вашего аккаунта. Сервис временно недоступен.";
      } else if (errorMessage.includes("authentication failed") || errorMessage.includes("API key")) {
        errorMessage = "Ошибка аутентификации AI API. Пожалуйста, проверьте настройки API ключа.";
      } else if (errorMessage.includes("temporarily unavailable")) {
        errorMessage = "AI сервис временно недоступен. Пожалуйста, попробуйте позже.";
      }
      
      const botMessage = {
        id: messages.length + 2,
        text: `Извините, произошла ошибка: ${errorMessage}`,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const userMessage = {
      id: messages.length + 1,
      text: `📄 Загружен документ: ${file.name}`,
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/ai/analyze-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const botMessage = {
        id: messages.length + 2,
        text: response.data.analysis || "Документ проанализирован",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("File upload error:", error);
      let errorMessage = error.response?.data?.error || error.message || "Ошибка при анализе файла";
      
      // Translate common error messages
      if (errorMessage.includes("quota exceeded") || errorMessage.includes("insufficient_quota") || errorMessage.includes("quota")) {
        errorMessage = "Превышен лимит использования AI API. Пожалуйста, проверьте баланс и квоты вашего аккаунта.";
      } else if (errorMessage.includes("authentication failed") || errorMessage.includes("API key")) {
        errorMessage = "Ошибка аутентификации AI API. Пожалуйста, проверьте настройки API ключа.";
      }
      
      const botMessage = {
        id: messages.length + 2,
        text: `Ошибка: ${errorMessage}`,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
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
              <label style={{ cursor: 'pointer', display: 'block', padding: '8px' }}>
                📷 Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                      setShowUploadOptions(false);
                    }
                  }}
                />
              </label>
              <label style={{ cursor: 'pointer', display: 'block', padding: '8px' }}>
                📄 Upload Document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                      setShowUploadOptions(false);
                    }
                  }}
                />
              </label>
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
