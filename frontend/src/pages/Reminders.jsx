import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { AddIcon, DeleteIcon, CheckIcon } from "../ui/icons/icons";
import "../styles/Reminders.css";

export default function Reminders() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
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
      const reminderType = reminder.type || reminder.reminder_type;
      await api.post("/reminders/log", {
        medicationId: reminderType === "medication" ? reminder.id : undefined,
        habitId: reminderType !== "medication" ? reminder.id : undefined
      });
      loadReminders(); // Reload to get updated state
    } catch (error) {
      console.error("Error logging reminder:", error);
      alert(t("reminders.errorMarking"));
    }
  };

  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  useEffect(() => {
    if (user) {
      loadCriticalAlerts();
    }
  }, [user]);

  const loadCriticalAlerts = async () => {
    if (!user) return;
    try {
      const response = await api.get("/alerts");
      setCriticalAlerts(response.data || []);
    } catch (error) {
      console.error("Error loading critical alerts:", error);
    }
  };

  const addReminder = async () => {
    if (!newReminder.title) {
      alert(t("reminders.nameRequired"));
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
      alert(t("reminders.errorAdding"));
    }
  };

  const deleteReminder = async (id, type) => {
    if (!window.confirm(t("reminders.deleteConfirm"))) return;
    
    try {
      // Determine if it's medication or habit
      const reminderType = (type === "medication" || type === "medication") ? "medication" : "habit";
      await api.delete(`/reminders/${id}?type=${reminderType}`);
      loadReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      alert(t("reminders.errorDeleting"));
    }
  };

  const types = [
    { value: "medication", label: t("reminders.medication") },
    { value: "water", label: t("reminders.water") },
    { value: "vitamin", label: t("reminders.vitamin") },
    { value: "walk", label: t("reminders.walk") },
    { value: "other", label: t("reminders.other") }
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
        <h1>{t("reminders.title")}</h1>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)} title={t("reminders.addReminder")}>
          <AddIcon />
        </button>
      </div>

      {showAddForm && (
        <div className="add-form-card">
          <h3>{t("reminders.addNew")}</h3>
          <div className="form-group">
            <label>{t("reminders.type")}</label>
            <select
              value={newReminder.type}
              onChange={e => setNewReminder({ ...newReminder, type: e.target.value })}
            >
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t("reminders.name")} *</label>
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
              <label>{t("reminders.dosage")}</label>
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
              <label>{t("reminders.time")}</label>
              <input
                type="time"
                value={newReminder.time}
                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("reminders.frequency")}</label>
              <select
                value={newReminder.frequency}
                onChange={e => setNewReminder({ ...newReminder, frequency: e.target.value })}
              >
                <option value="Daily">{t("reminders.daily")}</option>
                <option value="Every 2 hours">{t("reminders.every2Hours")}</option>
                <option value="Every 4 hours">{t("reminders.every4Hours")}</option>
                <option value="Weekly">{t("reminders.weekly")}</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={addReminder}>{t("common.save")}</button>
            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>{t("common.cancel")}</button>
          </div>
        </div>
      )}

      {/* Critical Alerts Section */}
      <Card className="critical-alerts-card">
        <div className="critical-alerts-header">
          <div>
            <h3>{t("reminders.criticalAlerts")}</h3>
            <p className="critical-alerts-desc">{t("reminders.criticalAlertsDesc")}</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={criticalAlertsEnabled}
              onChange={(e) => setCriticalAlertsEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {criticalAlertsEnabled && criticalAlerts.length > 0 && (
          <div className="alerts-list">
            {criticalAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="alert-item">
                <span className={`alert-severity ${alert.severity}`}>
                  {alert.severity === "critical" ? "🔴" : "⚠️"}
                </span>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{t("reminders.loading")}</p>
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
                    title={t("reminders.markCompleted")}
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
                  onClick={() => deleteReminder(reminder.id, reminder.type || reminder.reminder_type)}
                  title={t("reminders.deleteReminder")}
                >
                  <DeleteIcon />
                </button>
              </Card>
            ))
          ) : (
            <p className="empty-state">{t("reminders.empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}