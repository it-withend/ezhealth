import React, { useState, useEffect, useContext, useCallback } from "react";
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

  const loadTrustedContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const response = await api.get("/contacts");
      console.log("Contacts API response:", response.data);
      
      // Handle both array and object responses
      const contactsData = Array.isArray(response.data) ? response.data : (response.data.contacts || []);
      
      const contacts = contactsData.map(c => {
        // Format telegram ID for display - if it's numeric, show as ID, otherwise show as username
        const telegramId = c.contact_telegram_id;
        const isNumeric = /^\d+$/.test(telegramId);
        const telegramDisplay = isNumeric ? telegramId : `@${telegramId}`;
        
        return {
          id: c.id,
          name: c.contact_name || telegramDisplay,
          telegram: telegramId,
          telegramDisplay: telegramDisplay,
          canViewData: c.can_view_health_data === 1 || c.can_view_health_data === true,
          canAlert: c.can_receive_alerts === 1 || c.can_receive_alerts === true
        };
      });
      
      console.log("Processed contacts:", contacts);
      setTrustedContacts(contacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
      console.error("Error details:", error.response?.data);
      setTrustedContacts([]); // Set empty array on error
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Load trusted contacts from API on mount and when user changes
  useEffect(() => {
    // Always try to load contacts (backend can use initData from headers)
    loadTrustedContacts();
  }, [user, loadTrustedContacts]);

  // Load profile from backend on mount and when user changes
  useEffect(() => {
    console.log("🔍 Profile useEffect triggered, user:", user ? { id: user.id } : null);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:useEffect[user]',message:'useEffect triggered',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Always try to load profile from backend first (backend can use initData from headers)
    // Only use Telegram fallback if loadProfile fails
    console.log("🔍 Attempting to load profile from backend (even if user is null, backend uses initData)");
    loadProfile().catch((error) => {
      console.error("🔍 Failed to load profile from backend, using Telegram fallback:", error);
      // If loadProfile fails, use Telegram data as fallback
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
        console.log("🔍 Using Telegram fallback profile:", fallbackProfile);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:useEffect[user]',message:'Using Telegram fallback after loadProfile failed',data:{fallbackProfile,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        setProfile(fallbackProfile);
        setFormData(fallbackProfile);
      }
    });
  }, [user]);

  const loadProfile = async () => {
    console.log("🔍 loadProfile called, user:", user ? { id: user.id } : null);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'loadProfile ENTRY',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Don't skip if user is null - backend can use initData from headers
    // Only skip if we're sure there's no way to authenticate
    const hasInitData = !!window.Telegram?.WebApp?.initData;
    console.log("🔍 loadProfile - hasUser:", !!user, "hasInitData:", hasInitData);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'Checking auth',data:{hasUser:!!user,hasInitData,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!user && !hasInitData) {
      console.log("loadProfile: No user and no initData, skipping");
      throw new Error("No user and no initData available");
    }
    
    try {
      console.log("Loading profile from backend...");
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'Before API call',data:{userId:user?.id,hasInitData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const response = await api.get("/user/profile");
      console.log("Profile API response:", response.data);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'After API call',data:{response:response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (response.data.profile) {
        const profileData = response.data.profile;
        console.log("Profile data from API:", profileData);
        
        // Get Telegram user data for username only (username is read-only from Telegram)
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramUsername = tgUser?.username || profileData.username || "";
        
        // Use saved name from database (first_name + last_name) or build from profileData
        // Priority: profileData.name (from backend) > first_name + last_name > Telegram name
        const savedFirstName = profileData.first_name || "";
        const savedLastName = profileData.last_name || "";
        const savedNameFromDB = `${savedFirstName} ${savedLastName}`.trim();
        // Use profileData.name first (it's already built correctly on backend), fallback to savedNameFromDB
        const savedName = profileData.name || savedNameFromDB || "";
        
        console.log("🔍 loadProfile - Building savedName:", {
          profileDataName: profileData.name,
          savedFirstName,
          savedLastName,
          savedNameFromDB,
          savedName
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'Building savedName',data:{profileData,savedFirstName,savedLastName,savedNameFromDB,savedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
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
        
        console.log("Loaded profile:", loadedProfile);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:loadProfile',message:'Final loadedProfile',data:{loadedProfile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        setProfile(loadedProfile);
        setFormData(loadedProfile);
      } else {
        console.warn("No profile data in response");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      console.error("Error details:", error.response?.data);
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
        console.log("Using Telegram fallback profile:", fallbackProfile);
        setProfile(fallbackProfile);
        setFormData(fallbackProfile);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      console.log("Saving profile with data:", formData);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:handleSaveProfile',message:'Before API call',data:{formData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const response = await api.put("/user/profile", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        medicalConditions: formData.medicalConditions
      });
      
      console.log("Profile save response:", response.data);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:handleSaveProfile',message:'After API call',data:{response:response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Update state immediately with formData (optimistic update)
      setProfile(formData);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.jsx:handleSaveProfile',message:'State updated with formData',data:{formData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Close edit mode
      setIsEditing(false);
      
      // Then reload from backend to ensure consistency
      setTimeout(async () => {
        await loadProfile();
      }, 100);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleSelectTelegramContact = () => {
    // Telegram Mini Apps don't have a direct API to select from Telegram contacts list
    // The requestContact() method requests device contacts, not Telegram contacts
    // We'll provide helpful instructions instead
    
    const instruction = t("profile.contactSelectionHelp") || 
      "To add a contact:\n\n" +
      "1. Enter the contact's Telegram username (e.g., @username)\n" +
      "2. Or enter their Telegram ID (numeric)\n" +
      "3. Or enter their phone number\n\n" +
      "You can find a contact's username in their Telegram profile.";
    
    alert(instruction);
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.telegram) {
      alert(t("profile.contactRequired"));
      return;
    }

    try {
      // Extract telegram ID - can be username, phone number, or numeric ID
      let telegramId = newContact.telegram.replace("@", "").trim();
      
      // If it's a username (not numeric), we'll use the string as-is
      // If it's a phone number, we'll use it as-is
      // If it's numeric, we'll use it as-is
      const numericId = parseInt(telegramId);
      const finalTelegramId = isNaN(numericId) ? telegramId : numericId.toString();

      console.log("Adding contact:", { finalTelegramId, name: newContact.name });
      const response = await api.post("/contacts", {
        contactTelegramId: finalTelegramId,
        contactName: newContact.name,
        canViewHealthData: newContact.canViewData,
        canReceiveAlerts: newContact.canReceiveAlerts
      });
      console.log("Contact added response:", response.data);
      
      // Clear form and close
      setNewContact({ name: "", telegram: "", canViewData: true, canReceiveAlerts: true });
      setShowAddContact(false);
      
      // Reload contacts immediately
      await loadTrustedContacts();
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
              <div className="contact-input-wrapper">
                <input
                  type="text"
                  placeholder={t("profile.contactTelegramPlaceholder") || "Username, phone, or Telegram ID"}
                  value={newContact.telegram}
                  onChange={e => setNewContact({ ...newContact, telegram: e.target.value })}
                  className="contact-input"
                />
                <button
                  type="button"
                  className="select-contact-btn"
                  onClick={handleSelectTelegramContact}
                  title={t("profile.selectFromTelegram")}
                >
                  📱 {t("profile.selectFromTelegram")}
                </button>
              </div>
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
                      <div className="contact-handle">{contact.telegramDisplay || (contact.telegram && !/^\d+$/.test(contact.telegram) ? `@${contact.telegram}` : contact.telegram)}</div>
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

