import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SendIcon, UploadIcon, CloseIcon } from "../ui/icons/icons";
import { api } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import "./styles/Consultation.css";

export default function Consultation() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: t("aiChat.initialMessage"),
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history from backend on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      console.log("Loading chat history...");
      const response = await api.get("/ai/history");
      console.log("Chat history response:", response.data);
      
      if (response.data.history && response.data.history.length > 0) {
        const loadedMessages = response.data.history.map((msg, index) => {
          const msgDate = msg.timestamp || msg.created_at || Date.now();
          const dateObj = typeof msgDate === 'string' ? new Date(msgDate) : new Date(msgDate);
          return {
            id: msg.id || index + 1,
            text: msg.content,
            sender: msg.role === "assistant" ? "ai" : "user",
            timestamp: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          };
        });
        console.log(`Loaded ${loadedMessages.length} messages from history`);
        setMessages(loadedMessages);
      } else {
        // No history, show initial message
        console.log("No chat history found, showing initial message");
        setMessages([{
          id: 1,
          text: t("aiChat.initialMessage"),
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      console.error("Error details:", error.response?.data);
      // On error, show initial message
      setMessages([{
        id: 1,
        text: t("aiChat.initialMessage"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  };

  // Update initial message when language changes (only if no history)
  useEffect(() => {
    const currentInitialMessage = t("aiChat.initialMessage");
    if (messages.length === 1 && messages[0].sender === "ai" && messages[0].id === 1 && messages[0].text !== currentInitialMessage) {
      setMessages([{
        id: 1,
        text: currentInitialMessage,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  }, [language, t, messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Call real API
    setLoading(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Consultation.jsx:handleSendMessage',
          message: 'Sending message to AI',
          data: { message: userMessage, messagesCount: messages.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        })
      }).catch(() => {});
      // #endregion

      const response = await api.post("/ai/analyze", {
        message: userMessage,
        history: messages.filter(m => m.sender === "user" || m.sender === "ai").map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }))
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Consultation.jsx:handleSendMessage',
          message: 'AI response received',
          data: { hasResponse: !!response.data?.response, responseLength: response.data?.response?.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        })
      }).catch(() => {});
      // #endregion

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.response || t("aiChat.error"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Consultation.jsx:handleSendMessage',
          message: 'AI API error',
          data: { error: error.message, status: error.response?.status, responseData: error.response?.data },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        })
      }).catch(() => {});
      // #endregion

      console.error("AI API error:", error);
      let errorMessage = error.response?.data?.error || error.message || t("aiChat.error");
      
      // Use translated error messages
      if (errorMessage.includes("quota exceeded") || errorMessage.includes("insufficient_quota") || errorMessage.includes("quota") || error.response?.status === 429) {
        errorMessage = t("aiChat.errorRateLimit");
      } else if (errorMessage.includes("not found") || errorMessage.includes("404") || error.response?.status === 404) {
        errorMessage = t("aiChat.errorModelNotFound");
      } else if (errorMessage.includes("authentication failed") || errorMessage.includes("API key")) {
        errorMessage = t("aiChat.error");
      } else if (errorMessage.includes("temporarily unavailable")) {
        errorMessage = t("aiChat.error");
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        text: `${t("common.error")}: ${errorMessage}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm(t("aiChat.clearChatConfirm") || "Вы уверены, что хотите очистить чат?")) {
      try {
        // Clear history from backend
        await api.delete("/ai/history");
        console.log("Chat history cleared from backend");
      } catch (error) {
        console.error("Error clearing chat history:", error);
        // Continue with local clear even if backend fails
      }
      
      // Clear local messages
      setMessages([{
        id: 1,
        text: t("aiChat.initialMessage"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const userMessage = {
      id: Date.now(),
      text: `${t("aiChat.fileUploaded")} ${file.name}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setShowUploadOptions(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/ai/analyze-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.analysis || t("aiChat.documentAnalyzed"),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("File upload error:", error);
      let errorMessage = error.response?.data?.error || error.message || t("aiChat.errorAnalyzing");
      
      const botMessage = {
        id: Date.now() + 1,
        text: `${t("common.error")}: ${errorMessage}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
    <div className="consultation-container">
      <div className="consultation-header">
        <h1>{t("aiChat.title")}</h1>
        <p className="header-subtitle">{t("aiChat.subtitle")}</p>
        <button 
          className="report-btn" 
          onClick={handleGenerateReport} 
          title={t("aiChat.generateReport")}
          style={{ marginTop: '10px', padding: '8px 16px', background: '#2D9B8C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          📋 {t("aiChat.generateReport")}
        </button>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>{t("aiChat.title")}</h2>
            <p>{t("aiChat.subtitle")}</p>
            <div className="example-questions">
              <div className="example-chip" onClick={() => setInput(t("aiChat.example1") || "У меня болит голова")}>
                💊 {t("aiChat.example1") || "У меня болит голова"}
              </div>
              <div className="example-chip" onClick={() => setInput(t("aiChat.example2") || "Как улучшить сон?")}>
                😴 {t("aiChat.example2") || "Как улучшить сон?"}
              </div>
              <div className="example-chip" onClick={() => setInput(t("aiChat.example3") || "Советы по питанию")}>
                🥗 {t("aiChat.example3") || "Советы по питанию"}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-bubble">
                  <p className="message-text">{msg.text}</p>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message ai">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="consultation-input-area">
        <div className="upload-options">
          {showUploadOptions && (
            <div className="upload-menu">
              <label style={{ cursor: 'pointer', display: 'block', padding: '8px' }}>
                {t("aiChat.uploadPhoto")}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
              <label style={{ cursor: 'pointer', display: 'block', padding: '8px' }}>
                {t("aiChat.uploadDocument")}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
              <button onClick={() => setShowUploadOptions(false)}>{t("common.cancel")}</button>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <button className="clear-btn" onClick={handleClearChat} title={t("aiChat.clearChat") || "Очистить чат"}>
            <CloseIcon />
          </button>
        )}
        
        <div className="input-wrapper">
          <button
            className="upload-btn"
            onClick={() => setShowUploadOptions(!showUploadOptions)}
            title={t("aiChat.uploadFile")}
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: '#F0F0F0', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ➕
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSendMessage()}
            placeholder={t("aiChat.placeholder")}
            className="consultation-input"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="send-btn"
            title={t("aiChat.send")}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
