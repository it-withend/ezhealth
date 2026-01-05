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
    name: "",
    email: "",
    phone: "",
    username: "",
    dateOfBirth: "",
    bloodType: "",
    allergies: "",
    medicalConditions: ""
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
      console.log("Contacts API response:", response.data);
      
      // Handle both array and object responses
      const contactsData = Array.isArray(response.data) ? response.data : (response.data.contacts || []);
      
      const contacts = contactsData.map(c => ({
        id: c.id,
        name: c.contact_name || `@${c.contact_telegram_id}`,
        telegram: c.contact_telegram_id,
        canViewData: c.can_view_health_data === 1 || c.can_view_health_data === true,
        canAlert: c.can_receive_alerts === 1 || c.can_receive_alerts === true
      }));
      
      console.log("Processed contacts:", contacts);
      setTrustedContacts(contacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
      console.error("Error details:", error.response?.data);
      setTrustedContacts([]); // Set empty array on error
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load profile from backend on mount and when user changes
  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      // If no user, try to get Telegram data as fallback
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        const fallbackProfile = {
          name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || "",
          email: "",
          phone: "",
          username: tgUser.username || "",
          dateOfBirth: "",
          bloodType: "",
          allergies: "",
          medicalConditions: ""
        };
        setProfile(fallbackProfile);
        setFormData(fallbackProfile);
      }
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const response = await api.get("/user/profile");
      if (response.data.profile) {
        const profileData = response.data.profile;
        
        // Get Telegram user data for username only (username is read-only from Telegram)
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramUsername = tgUser?.username || profileData.username || "";
        
        // Use saved name from database (first_name + last_name) or build from profileData
        // Priority: saved name in DB > profileData.name > Telegram name
        const savedFirstName = profileData.first_name || "";
        const savedLastName = profileData.last_name || "";
        const savedNameFromDB = `${savedFirstName} ${savedLastName}`.trim();
        const savedName = profileData.name || savedNameFromDB || "";
        
        const loadedProfile = {
          name: savedName || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          username: telegramUsername,
          dateOfBirth: profileData.dateOfBirth || profileData.date_of_birth || "",
          bloodType: profileData.bloodType || profileData.blood_type || "",
          allergies: profileData.allergies || "",
          medicalConditions: profileData.medicalConditions || profileData.medical_conditions || ""
        };
        setProfile(loadedProfile);
        setFormData(loadedProfile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback: use Telegram data
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        const fallbackProfile = {
          name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || "",
          email: "",
          phone: "",
          username: tgUser.username || "",
          dateOfBirth: "",
          bloodType: "",
          allergies: "",
          medicalConditions: ""
        };
        setProfile(fallbackProfile);
        setFormData(fallbackProfile);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await api.put("/user/profile", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        medicalConditions: formData.medicalConditions
      });
      
      // Always reload profile from backend after save to ensure we have latest data
      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.telegram) {
      alert(t("profile.contactRequired"));
      return;
    }

    try {
      // Extract telegram ID - can be username or numeric ID
      let telegramId = newContact.telegram.replace("@", "").trim();
      
      // If it's a username (not numeric), we need to convert it
      // For now, we'll try to parse as number, if it fails, we'll use the string
      // In production, you'd need to resolve username to telegram_id via Bot API
      const numericId = parseInt(telegramId);
      const finalTelegramId = isNaN(numericId) ? telegramId : numericId;

      console.log("Adding contact:", { finalTelegramId, name: newContact.name });
      const response = await api.post("/contacts", {
        contactTelegramId: finalTelegramId,
        contactName: newContact.name,
        canViewHealthData: newContact.canViewData,
        canReceiveAlerts: newContact.canReceiveAlerts
      });
      console.log("Contact added response:", response.data);
      setNewContact({ name: "", telegram: "", canViewData: true, canReceiveAlerts: true });
      setShowAddContact(false);
      // Wait a bit and reload contacts
      setTimeout(() => {
        loadTrustedContacts();
      }, 500);
    } catch (error) {
      console.error("Error adding contact:", error);
      const errorMsg = error.response?.data?.error || error.message || t("profile.errorAddingContact");
      alert(errorMsg);
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
            <h2>{profile.name || t("profile.title")}</h2>
            {profile.email && <p className="profile-email">{profile.email}</p>}
            {profile.username && <p className="profile-username" style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>@{profile.username}</p>}
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
              placeholder={t("profile.namePlaceholder") || "Enter your name"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.email") || "Email"}</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder={t("profile.emailPlaceholder") || "Enter your email"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.username") || "Username"}</label>
            <input
              type="text"
              value={formData.username}
              disabled
              style={{ background: '#f5f5f5', color: '#666' }}
              placeholder={t("profile.usernamePlaceholder") || "Telegram username"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.phone") || "Phone"}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t("profile.phonePlaceholder") || "+1 (555) 123-4567"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.dateOfBirth") || t("health.date")}</label>
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
              placeholder={t("profile.bloodTypePlaceholder") || "e.g., O+"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.allergies")}</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
              placeholder={t("profile.allergiesPlaceholder") || "e.g., Penicillin"}
            />
          </div>
          <div className="form-group">
            <label>{t("profile.medicalConditions")}</label>
            <input
              type="text"
              value={formData.medicalConditions}
              onChange={e => setFormData({ ...formData, medicalConditions: e.target.value })}
              placeholder={t("profile.medicalConditionsPlaceholder") || "Enter medical conditions"}
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
            <span className="value">{profile.bloodType || "-"}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("profile.allergies")}:</span>
            <span className="value">{profile.allergies || "-"}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("profile.medicalConditions")}:</span>
            <span className="value">{profile.medicalConditions || "-"}</span>
          </div>
          {profile.phone && (
            <div className="info-row">
              <span className="label">{t("profile.phone") || "Phone"}:</span>
              <span className="value">{profile.phone}</span>
            </div>
          )}
          {profile.dateOfBirth && (
            <div className="info-row">
              <span className="label">{t("profile.dateOfBirth") || t("health.date")}:</span>
              <span className="value">{new Date(profile.dateOfBirth).toLocaleDateString()}</span>
            </div>
          )}
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

