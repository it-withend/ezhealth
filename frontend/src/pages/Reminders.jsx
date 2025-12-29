import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { AddIcon, DeleteIcon, CheckIcon } from "../ui/icons/icons";
import "../styles/Reminders.css";

export default function Reminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([
    {
      id: 1,
      type: "medication",
      title: "Aspirin",
      time: "09:00 AM",
      frequency: "Daily",
      completed: false,
      icon: "💊"
    },
    {
      id: 2,
      type: "water",
      title: "Drink water",
      time: "12:00 PM",
      frequency: "Every 2 hours",
      completed: true,
      icon: "💧"
    },
    {
      id: 3,
      type: "vitamin",
      title: "Vitamin D",
      time: "08:00 AM",
      frequency: "Daily",
      completed: false,
      icon: "🌅"
    },
    {
      id: 4,
      type: "walk",
      title: "Morning walk",
      time: "07:00 AM",
      frequency: "Daily",
      completed: true,
      icon: "🚶"
    }
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    type: "medication",
    title: "",
    time: "09:00",
    frequency: "Daily"
  });

  // Load reminders from localStorage
  useEffect(() => {
    const savedReminders = localStorage.getItem("reminders");
    if (savedReminders) {
      try {
        setReminders(JSON.parse(savedReminders));
      } catch (e) {
        console.error("Failed to load reminders");
      }
    }
  }, []);

  // Save reminders to localStorage
  useEffect(() => {
    localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders]);

  const toggleReminder = (id) => {
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r)
    );
  };

  const addReminder = () => {
    if (newReminder.title) {
      setReminders(prev => [...prev, {
        id: Math.max(...prev.map(r => r.id), 0) + 1,
        ...newReminder,
        completed: false,
        icon: newReminder.type === "medication" ? "💊" : newReminder.type === "water" ? "💧" : newReminder.type === "vitamin" ? "🌅" : "🚶"
      }]);
      setNewReminder({ type: "medication", title: "", time: "09:00", frequency: "Daily" });
      setShowAddForm(false);
    }
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const types = [
    { value: "medication", label: "💊 Medication" },
    { value: "water", label: "💧 Drink Water" },
    { value: "vitamin", label: "🌅 Vitamin" },
    { value: "walk", label: "🚶 Physical Activity" }
  ];

  return (
    <div className="reminders-container">
      <div className="reminders-header">
        <h1>Напоминания здоровья</h1>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)} title="Добавить напоминание">
          <AddIcon />
        </button>
      </div>

      {showAddForm && (
        <div className="add-form-card">
          <h3>Добавить новое напоминание</h3>
          <div className="form-group">
            <label>Тип</label>
            <select
              value={newReminder.type}
              onChange={e => setNewReminder({ ...newReminder, type: e.target.value })}
            >
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              placeholder="e.g., Aspirin"
              value={newReminder.title}
              onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Время</label>
              <input
                type="time"
                value={newReminder.time}
                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Частота</label>
              <select
                value={newReminder.frequency}
                onChange={e => setNewReminder({ ...newReminder, frequency: e.target.value })}
              >
                <option>Ежедневно</option>
                <option>Каждые 2 часа</option>
                <option>Каждые 4 часа</option>
                <option>Еженедельно</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={addReminder}>Сохранить</button>
            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="reminders-list">
        {reminders.length > 0 ? (
          reminders.map(reminder => (
            <Card key={reminder.id} className={`reminder-card ${reminder.completed ? "completed" : ""}`}>
              <div className="reminder-content">
                <input
                  type="checkbox"
                  checked={reminder.completed}
                  onChange={() => toggleReminder(reminder.id)}
                  className="reminder-checkbox"
                />
                <div className="reminder-icon">{reminder.icon}</div>
                <div className="reminder-details">
                  <div className="reminder-title">{reminder.title}</div>
                  <div className="reminder-meta">
                    <span className="time">⏰ {reminder.time}</span>
                    <span className="frequency">{reminder.frequency}</span>
                  </div>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteReminder(reminder.id)}
                title="Delete reminder"
              >
                <DeleteIcon />
              </button>
            </Card>
          ))
        ) : (
          <p className="empty-state">Пока нет напоминаний. Добавьте первое!</p>
