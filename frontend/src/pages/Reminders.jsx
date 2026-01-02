import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { AddIcon, DeleteIcon, CheckIcon } from "../ui/icons/icons";
import "../styles/Reminders.css";

export default function Reminders() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    type: "medication",
    title: "",
    time: "09:00",
    frequency: "Daily",
    dosage: ""
  });

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;
    try {
      const response = await api.get("/reminders");
      setReminders(response.data || []);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (reminder) => {
    try {
      await api.post("/reminders/log", {
        medicationId: reminder.type === "medication" ? reminder.id : undefined,
        habitId: reminder.type !== "medication" ? reminder.id : undefined
      });
      loadReminders(); // Reload to get updated state
    } catch (error) {
      console.error("Error logging reminder:", error);
      alert("Ошибка при отметке напоминания");
    }
  };

  const addReminder = async () => {
    if (!newReminder.title) {
      alert("Пожалуйста, введите название");
      return;
    }

    try {
      await api.post("/reminders", {
        type: newReminder.type,
        name: newReminder.title,
        reminderTime: newReminder.time,
        frequency: newReminder.frequency,
        dosage: newReminder.dosage || undefined
      });
      setNewReminder({ type: "medication", title: "", time: "09:00", frequency: "Daily", dosage: "" });
      setShowAddForm(false);
      loadReminders();
    } catch (error) {
      console.error("Error adding reminder:", error);
      alert("Ошибка при добавлении напоминания");
    }
  };

  const deleteReminder = async (id, type) => {
    if (!window.confirm("Удалить это напоминание?")) return;
    
    try {
      await api.delete(`/reminders/${id}?type=${type}`);
      loadReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      alert("Ошибка при удалении напоминания");
    }
  };

  const types = [
    { value: "medication", label: "💊 Medication" },
    { value: "water", label: "💧 Drink Water" },
    { value: "vitamin", label: "🌅 Vitamin" },
    { value: "walk", label: "🚶 Physical Activity" },
    { value: "other", label: "✅ Other Habit" }
  ];

  const getReminderIcon = (type) => {
    const icons = {
      medication: "💊",
      water: "💧",
      vitamin: "🌅",
      walk: "🚶",
      other: "✅"
    };
    return icons[type] || "✅";
  };

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
            <label>Название *</label>
            <input
              type="text"
              placeholder="e.g., Aspirin"
              value={newReminder.title}
              onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
              required
            />
          </div>
          {newReminder.type === "medication" && (
            <div className="form-group">
              <label>Дозировка</label>
              <input
                type="text"
                placeholder="e.g., 500mg"
                value={newReminder.dosage}
                onChange={e => setNewReminder({ ...newReminder, dosage: e.target.value })}
              />
            </div>
          )}
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
                <option value="Daily">Ежедневно</option>
                <option value="Every 2 hours">Каждые 2 часа</option>
                <option value="Every 4 hours">Каждые 4 часа</option>
                <option value="Weekly">Еженедельно</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={addReminder}>Сохранить</button>
            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка напоминаний...</p>
        </div>
      ) : (
        <div className="reminders-list">
          {reminders.length > 0 ? (
            reminders.map(reminder => (
              <Card key={reminder.id} className="reminder-card">
                <div className="reminder-content">
                  <button
                    className="reminder-checkbox-btn"
                    onClick={() => toggleReminder(reminder)}
                    title="Mark as completed"
                  >
                    ✓
                  </button>
                  <div className="reminder-icon">{getReminderIcon(reminder.type)}</div>
                  <div className="reminder-details">
                    <div className="reminder-title">{reminder.title}</div>
                    <div className="reminder-meta">
                      {reminder.time && <span className="time">⏰ {reminder.time}</span>}
                      {reminder.frequency && <span className="frequency">{reminder.frequency}</span>}
                      {reminder.dosage && <span className="dosage">💊 {reminder.dosage}</span>}
                    </div>
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => deleteReminder(reminder.id, reminder.type)}
                  title="Delete reminder"
                >
                  <DeleteIcon />
                </button>
              </Card>
            ))
          ) : (
            <p className="empty-state">Пока нет напоминаний. Добавьте первое!</p>
          )}
        </div>
      )}
    </div>
  );
}