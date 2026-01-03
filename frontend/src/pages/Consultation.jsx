import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SendIcon, UploadIcon, CloseIcon } from "../ui/icons/icons";
import { api } from "../services/api";
import "./styles/Consultation.css";

export default function Consultation() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Здравствуйте! Я ваш AI помощник по здоровью. Как я могу помочь?",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
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
        text: response.data.response || "Извините, не удалось получить ответ. Попробуйте еще раз.",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
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
      let errorMessage = error.response?.data?.error || error.message || "Ошибка при обращении к AI";
      
      // Translate common error messages to Russian
      if (errorMessage.includes("quota exceeded") || errorMessage.includes("insufficient_quota") || errorMessage.includes("quota")) {
        errorMessage = "Превышен лимит использования AI API. Пожалуйста, проверьте баланс и квоты вашего аккаунта. Сервис временно недоступен.";
      } else if (errorMessage.includes("authentication failed") || errorMessage.includes("API key")) {
        errorMessage = "Ошибка аутентификации AI API. Пожалуйста, проверьте настройки API ключа.";
      } else if (errorMessage.includes("temporarily unavailable")) {
        errorMessage = "AI сервис временно недоступен. Пожалуйста, попробуйте позже.";
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        text: `Извините, произошла ошибка: ${errorMessage}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Вы уверены, что хотите очистить чат?")) {
      setMessages([{
        id: 1,
        text: "Здравствуйте! Я ваш AI помощник по здоровью. Как я могу помочь?",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  };

  const handleGenerateReport = () => {
    navigate("/generate-report", { state: { messages } });
  };

  return (
    <div className="consultation-container">
      <div className="consultation-header">
        <h1>AI Консультация</h1>
        <p className="header-subtitle">Получите мгновенные советы по здоровью</p>
        <button 
          className="report-btn" 
          onClick={handleGenerateReport} 
          title="Сгенерировать отчет для врача"
          style={{ marginTop: '10px', padding: '8px 16px', background: '#2D9B8C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          📋 Создать отчет
        </button>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Добро пожаловать в AI Консультацию</h2>
            <p>Задайте вопрос о своем здоровье и получите рекомендации</p>
            <div className="example-questions">
              <div className="example-chip" onClick={() => setInput("У меня болит голова")}>
                💊 У меня болит голова
              </div>
              <div className="example-chip" onClick={() => setInput("Как улучшить сон?")}>
                😴 Как улучшить сон?
              </div>
              <div className="example-chip" onClick={() => setInput("Советы по питанию")}>
                🥗 Советы по питанию
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
        {messages.length > 0 && (
          <button className="clear-btn" onClick={handleClearChat} title="Очистить чат">
            <CloseIcon />
          </button>
        )}
        
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSendMessage()}
            placeholder="Опишите ваши симптомы или спросите совет..."
            className="consultation-input"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="send-btn"
            title="Отправить"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
