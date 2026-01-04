import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { EditIcon, DeleteIcon, AddIcon, LogoutIcon } from "../ui/icons/icons";
import { useLanguage } from "../context/LanguageContext";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import "../styles/Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const { t, language, changeLanguage } = useLanguage();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    name: "Kathryn Murphy",
    email: "kathryn.murphy@example.com",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "1990-05-15",
    bloodType: "O+",
    allergies: "Penicillin",
    medicalConditions: "None reported"
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", telegram: "", canViewData: true, canReceiveAlerts: true });
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Load trusted contacts from API
  useEffect(() => {
    if (user) {
      loadTrustedContacts();
    }
  }, [user]);

  const loadTrustedContacts = async () => {
    if (!user) return;
    try {
      setLoadingContacts(true);
      const response = await api.get("/contacts");
      const contacts = response.data.map(c => ({
        id: c.id,
        name: c.contact_name || `@${c.contact_telegram_id}`,
        telegram: c.contact_telegram_id,
        canViewData: c.can_view_health_data === 1,
        canAlert: c.can_receive_alerts === 1
      }));
      setTrustedContacts(contacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setFormData(parsed);
      } catch (e) {
        console.error("Failed to load profile");
      }
    }
  }, []);

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  const handleSaveProfile = () => {
    setProfile(formData);
    setIsEditing(false);
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.telegram) {
      alert(t("profile.contactRequired"));
      return;
    }

    try {
      await api.post("/contacts", {
        contactTelegramId: newContact.telegram.replace("@", ""),
        contactName: newContact.name,
        canViewHealthData: newContact.canViewData,
        canReceiveAlerts: newContact.canReceiveAlerts
      });
      setNewContact({ name: "", telegram: "", canViewData: true, canReceiveAlerts: true });
      setShowAddContact(false);
      loadTrustedContacts();
    } catch (error) {
      console.error("Error adding contact:", error);
      alert(t("profile.errorAddingContact"));
    }
  };

  const removeContact = async (id) => {
    if (!window.confirm(t("profile.deleteContactConfirm"))) return;
    
    try {
      await api.delete(`/contacts/${id}`);
      loadTrustedContacts();
    } catch (error) {
      console.error("Error removing contact:", error);
      alert(t("profile.errorRemovingContact"));
    }
  };

  const handleEmergencyAlert = async () => {
    if (!window.confirm(t("profile.emergencyConfirm"))) return;

    try {
      // Get user's location
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const { latitude, longitude } = position.coords;
      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      // Send emergency alert to trusted contacts
      await api.post("/alerts/emergency", {
        message: t("profile.emergencyMessage"),
        location: { latitude, longitude },
        locationUrl
      });

      alert(t("profile.emergencySent"));
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      if (error.message.includes("Geolocation")) {
        alert(t("profile.locationError"));
      } else {
        alert(t("profile.emergencyError"));
      }
    }
  };

  const handleShareHealthData = async () => {
    try {
      await api.post("/contacts/share", {
        dataType: "health_metrics",
        contactIds: trustedContacts.filter(c => c.canViewData).map(c => c.id)
      });
      alert(t("profile.dataShared"));
    } catch (error) {
      console.error("Error sharing data:", error);
      alert(t("profile.errorSharingData"));
    }
  };

  const logout = () => {
    if (window.confirm(t("profile.logoutConfirm"))) {
      localStorage.clear();
      navigate("/");
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <h1>{t("profile.title")}</h1>
      </div>

      {/* Profile Info Card */}
      <Card className="profile-card">
        <div className="profile-section">
          <div className="profile-avatar">
            <div className="avatar-placeholder">👤</div>
          </div>
          <div className="profile-name">
            <h2>{profile.name}</h2>
            <p className="profile-email">{profile.email}</p>
          </div>
          {!isEditing && (
            <button className="edit-btn" onClick={() => setIsEditing(true)} title={t("common.edit")}>
              <EditIcon />
            </button>
          )}
        </div>
      </Card>

      {/* Edit Mode */}
      {isEditing && (
        <Card className="edit-form">
          <h3>{t("profile.editProfile")}</h3>
          <div className="form-group">
            <label>{t("profile.contactName")}</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.contactTelegram").replace("Telegram ", "")}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("health.date")}</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.bloodType")}</label>
            <input
              type="text"
              value={formData.bloodType}
              onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.allergies")}</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={handleSaveProfile}>{t("common.save")}</button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>{t("common.cancel")}</button>
          </div>
        </Card>
      )}

      {/* Medical Info */}
      {!isEditing && (
        <Card className="info-card">
          <h3>{t("profile.medicalInfo")}</h3>
          <div className="info-row">
            <span className="label">{t("profile.bloodType")}:</span>
            <span className="value">{profile.bloodType}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("profile.allergies")}:</span>
            <span className="value">{profile.allergies}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("profile.medicalConditions")}:</span>
            <span className="value">{profile.medicalConditions}</span>
          </div>
        </Card>
      )}

      {/* Trusted Contacts */}
      <div className="section">
        <div className="section-header">
          <h3>{t("profile.trustedContacts")}</h3>
          <button className="add-btn" onClick={() => setShowAddContact(!showAddContact)} title={t("profile.addContact")}>
            <AddIcon />
          </button>
        </div>

        {showAddContact && (
          <Card className="add-contact-form">
            <div className="form-group">
              <label>{t("profile.contactName")}</label>
              <input
                type="text"
                placeholder={t("profile.contactName")}
                value={newContact.name}
                onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("profile.contactTelegram")}</label>
              <input
                type="text"
                placeholder="e.g., username or telegram_id"
                value={newContact.telegram}
                onChange={e => setNewContact({ ...newContact, telegram: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newContact.canViewData}
                  onChange={e => setNewContact({ ...newContact, canViewData: e.target.checked })}
                />
                {t("profile.canViewData")}
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newContact.canReceiveAlerts}
                  onChange={e => setNewContact({ ...newContact, canReceiveAlerts: e.target.checked })}
                />
                {t("profile.canReceiveAlerts")}
              </label>
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={handleAddContact}>{t("profile.addContact")}</button>
              <button className="cancel-btn" onClick={() => setShowAddContact(false)}>{t("common.cancel")}</button>
            </div>
          </Card>
        )}

        {loadingContacts ? (
          <p>{t("common.loading")}</p>
        ) : (
          <div className="contacts-list">
            {trustedContacts.length > 0 ? (
              trustedContacts.map(contact => (
                <Card key={contact.id} className="contact-card">
                  <div className="contact-info">
                    <div className="contact-icon">👤</div>
                    <div className="contact-details">
                      <div className="contact-name">{contact.name}</div>
                      <div className="contact-handle">@{contact.telegram}</div>
                      <div className="contact-permissions">
                        {contact.canViewData && <span className="permission-badge">{t("profile.canViewData")}</span>}
                        {contact.canAlert && <span className="permission-badge">{t("profile.canReceiveAlerts")}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeContact(contact.id)}
                    title={t("common.delete")}
                  >
                    <DeleteIcon />
                  </button>
                </Card>
              ))
            ) : (
              <p className="empty-state">{t("profile.noContacts")}</p>
            )}
          </div>
        )}
      </div>

      {/* Emergency & Share Section */}
      <Card className="settings-card">
        <button className="emergency-btn" onClick={handleEmergencyAlert}>
          🚨 {t("profile.emergencyButton")}
        </button>
        <button className="share-data-btn" onClick={handleShareHealthData}>
          📊 {t("profile.shareHealthData")}
        </button>
      </Card>

      {/* Language Settings */}
      <Card className="settings-card">
        <div className="language-section">
          <h3>{t("profile.language")}</h3>
          <div className="language-selector">
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              {t("profile.english")}
            </button>
            <button
              className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
              onClick={() => changeLanguage('ru')}
            >
              {t("profile.russian")}
            </button>
            <button
              className={`lang-btn ${language === 'uz' ? 'active' : ''}`}
              onClick={() => changeLanguage('uz')}
            >
              {t("profile.uzbek")}
            </button>
          </div>
        </div>
      </Card>

      {/* Settings & Logout */}
      <Card className="settings-card">
        <button className="logout-btn" onClick={logout} title={t("profile.logout")}>
          <LogoutIcon />
          <span>{t("profile.logout")}</span>
        </button>
      </Card>
    </div>
  );
}

