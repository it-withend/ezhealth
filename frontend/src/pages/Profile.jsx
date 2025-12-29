import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { EditIcon, DeleteIcon, AddIcon, LogoutIcon } from "../ui/icons/icons";
import "../styles/Profile.css";

export default function Profile() {
  const navigate = useNavigate();
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
  const [trustedContacts, setTrustedContacts] = useState([
    { id: 1, name: "Mom", telegram: "mom_user", canViewData: true, canAlert: true },
    { id: 2, name: "Sister", telegram: "sister_user", canViewData: true, canAlert: false }
  ]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", telegram: "" });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    const savedContacts = localStorage.getItem("trustedContacts");
    
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setFormData(parsed);
      } catch (e) {
        console.error("Failed to load profile");
      }
    }
    
    if (savedContacts) {
      try {
        setTrustedContacts(JSON.parse(savedContacts));
      } catch (e) {
        console.error("Failed to load contacts");
      }
    }
  }, []);

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  // Save contacts to localStorage
  useEffect(() => {
    localStorage.setItem("trustedContacts", JSON.stringify(trustedContacts));
  }, [trustedContacts]);

  const handleSaveProfile = () => {
    setProfile(formData);
    setIsEditing(false);
  };

  const handleAddContact = () => {
    if (newContact.name && newContact.telegram) {
      setTrustedContacts([
        ...trustedContacts,
        {
          id: Math.max(...trustedContacts.map(c => c.id), 0) + 1,
          ...newContact,
          canViewData: true,
          canAlert: true
        }
      ]);
      setNewContact({ name: "", telegram: "" });
      setShowAddContact(false);
    }
  };

  const removeContact = (id) => {
    setTrustedContacts(trustedContacts.filter(c => c.id !== id));
  };

  const logout = () => {
    if (window.confirm("Вы уверены, что хотите выйти?")) {
      localStorage.clear();
      navigate("/");
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <h1>Мой профиль</h1>
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
            <button className="edit-btn" onClick={() => setIsEditing(true)} title="Редактировать">
              <EditIcon />
            </button>
          )}
        </div>
      </Card>

      {/* Edit Mode */}
      {isEditing && (
        <Card className="edit-form">
          <h3>Редактирование профиля</h3>
          <div className="form-group">
            <label>Имя</label>
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
            <label>Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Дата рождения</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Группа крови</label>
            <input
              type="text"
              value={formData.bloodType}
              onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Аллергии</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={handleSaveProfile}>Сохранить</button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>Отмена</button>
          </div>
        </Card>
      )}

      {/* Medical Info */}
      {!isEditing && (
        <Card className="info-card">
          <h3>Медицинская информация</h3>
          <div className="info-row">
            <span className="label">Группа крови:</span>
            <span className="value">{profile.bloodType}</span>
          </div>
          <div className="info-row">
            <span className="label">Аллергии:</span>
            <span className="value">{profile.allergies}</span>
          </div>
          <div className="info-row">
            <span className="label">Медицинские состояния:</span>
            <span className="value">{profile.medicalConditions}</span>
          </div>
        </Card>
      )}

      {/* Trusted Contacts */}
      <div className="section">
        <div className="section-header">
          <h3>Доверенные контакты</h3>
          <button className="add-btn" onClick={() => setShowAddContact(!showAddContact)} title="Добавить контакт">
            <AddIcon />
          </button>
        </div>

        {showAddContact && (
          <Card className="add-contact-form">
            <div className="form-group">
              <label>Имя</label>
              <input
                type="text"
                placeholder="Имя контакта"
                value={newContact.name}
                onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Telegram пользователь</label>
              <input
                type="text"
                placeholder="e.g., username"
                value={newContact.telegram}
                onChange={e => setNewContact({ ...newContact, telegram: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={handleAddContact}>Добавить контакт</button>
              <button className="cancel-btn" onClick={() => setShowAddContact(false)}>Отмена</button>
            </div>
          </Card>
        )}

        <div className="contacts-list">
          {trustedContacts.map(contact => (
            <Card key={contact.id} className="contact-card">
              <div className="contact-info">
                <div className="contact-icon">👤</div>
                <div className="contact-details">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-handle">@{contact.telegram}</div>
                </div>
              </div>
              <button
                className="remove-btn"
                onClick={() => removeContact(contact.id)}
                title="Удалить контакт"
              >
                <DeleteIcon />
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Settings & Logout */}
      <Card className="settings-card">
        <button className="logout-btn" onClick={logout} title="Выйти из аккаунта">
          <LogoutIcon />
          <span>Выход</span>
        </button>
      </Card>
    </div>
  );
}

