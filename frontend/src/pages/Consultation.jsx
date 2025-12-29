import React, { useState, useEffect, useRef } from "react";
import { SendIcon, UploadIcon, CloseIcon } from "../ui/icons/icons";
import "./styles/Consultation.css";

export default function Consultation() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem("consultationSessionId");
    if (!id) {
      id = "session_" + Date.now();
      localStorage.setItem("consultationSessionId", id);
    }
    return id;
  });
  const messagesEndRef = useRef(null);

  // Load messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`messages_${sessionId}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to load messages");
      }
    }
  }, [sessionId]);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(`messages_${sessionId}`, JSON.stringify(messages));
  }, [messages, sessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mockChatGPTResponse = (userMessage) => {
    const responses = {
      headache: "Я понимаю, что у вас болит голова. Это может быть вызвано стрессом, недостатком сна или напряжением. Рекомендую:\n\n1. Отдохнуть в тихом месте\n2. Выпить воды\n3. Применить холодный компресс\n4. Если боль сильная, можно принять парацетамол\n\nЕсли боль не проходит более 2 дней, обратитесь к врачу.",
      fever: "Повышенная температура может указывать на инфекцию. Что я рекомендую:\n\n1. Измерьте температуру регулярно\n2. Пейте много жидкости (вода, чай с лимоном)\n3. Отдыхайте\n4. При температуре выше 38.5°C примите жаропонижающее\n\nОбратитесь к врачу, если температура держится более 3 дней.",
      cough: "Кашель может быть проявлением простуды, гриппа или аллергии. Рекомендации:\n\n1. Увлажняйте воздух в помещении\n2. Пейте теплые напитки\n3. Избегайте раздражителей\n4. При сухом кашле помогут леденцы\n5. При влажном кашле - экспекторанты\n\nЕсли кашель длится более недели, посетите врача.",
      throat: "Боль в горле часто вызвана вирусной или бактериальной инфекцией. Советы:\n\n1. Полощите горло теплой соленой водой\n2. Пейте теплые жидкости\n3. Избегайте острого и горячего\n4. Используйте мед и лимон\n5. Если боль сильная, примите анальгетик\n\nОбратитесь к врачу при наличии белого налета.",
      pressure: "Высокое кровяное давление требует внимания. Что можно сделать:\n\n1. Расслабьтесь и избегайте стресса\n2. Ограничьте соль в рационе\n3. Увеличьте физическую активность\n4. Избегайте алкоголя и кофеина\n5. Контролируйте вес\n\nМедицинский персонал может назначить специальные лекарства.",
      sleep: "Проблемы со сном очень распространены. Рекомендации для улучшения сна:\n\n1. Установите регулярное расписание сна\n2. Избегайте экранов за час до сна\n3. Создайте комфортную среду\n4. Практикуйте релаксацию или медитацию\n5. Избегайте кофеина и тяжелой пищи перед сном\n\nЕсли проблема сохраняется, консультируйтесь со специалистом.",
      diet: "Здоровое питание - основа здоровья. Основные принципы:\n\n1. Ешьте разнообразные овощи и фрукты\n2. Выбирайте нежирные белки\n3. Включайте цельные зерна\n4. Ограничьте сахар и соль\n5. Пейте достаточно воды\n6. Избегайте обработанных продуктов\n\nПроконсультируйтесь с диетологом для персональной диеты."
    };

    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    return "Спасибо за ваш вопрос! На основе описанных симптомов рекомендую:\n\n1. Проконсультироваться с врачом\n2. Регулярно измерять показатели здоровья\n3. Вести здоровый образ жизни\n4. Питаться правильно\n5. Заниматься физическими упражнениями\n\nЕсли состояние ухудшается, незамедлительно обратитесь в медицинское учреждение.";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

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

    // Simulate AI thinking
    setLoading(true);
    setTimeout(() => {
      const response = mockChatGPTResponse(userMessage);
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, aiMessage]);
      setLoading(false);
    }, 800);
  };

  const handleClearChat = () => {
    if (window.confirm("Вы уверены, что хотите очистить чат?")) {
      setMessages([]);
      localStorage.removeItem(`messages_${sessionId}`);
    }
  };

  return (
    <div className="consultation-container">
      <div className="consultation-header">
        <h1>AI Консультация</h1>
        <p className="header-subtitle">Получите мгновенные советы по здоровью</p>
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
