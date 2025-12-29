import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
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
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <h1>My Profile</h1>
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
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </Card>

      {/* Edit Mode */}
      {isEditing && (
        <Card className="edit-form">
          <h3>Edit Profile</h3>
          <div className="form-group">
            <label>Name</label>
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
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Blood Type</label>
            <input
              type="text"
              value={formData.bloodType}
              onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Allergies</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={handleSaveProfile}>Save</button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </Card>
      )}

      {/* Medical Info */}
      {!isEditing && (
        <Card className="info-card">
          <h3>Medical Information</h3>
          <div className="info-row">
            <span className="label">Blood Type:</span>
            <span className="value">{profile.bloodType}</span>
          </div>
          <div className="info-row">
            <span className="label">Allergies:</span>
            <span className="value">{profile.allergies}</span>
          </div>
          <div className="info-row">
            <span className="label">Medical Conditions:</span>
            <span className="value">{profile.medicalConditions}</span>
          </div>
        </Card>
      )}

      {/* Trusted Contacts */}
      <div className="section">
        <div className="section-header">
          <h3>Trusted Contacts</h3>
          <button className="add-btn" onClick={() => setShowAddContact(!showAddContact)}>
            + Add
          </button>
        </div>

        {showAddContact && (
          <Card className="add-contact-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Contact name"
                value={newContact.name}
                onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Telegram Username</label>
              <input
                type="text"
                placeholder="e.g., username"
                value={newContact.telegram}
                onChange={e => setNewContact({ ...newContact, telegram: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={handleAddContact}>Add Contact</button>
              <button className="cancel-btn" onClick={() => setShowAddContact(false)}>Cancel</button>
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
                title="Remove contact"
              >
                ✕
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Settings & Logout */}
      <Card className="settings-card">
        <button className="settings-btn">⚙️ Settings</button>
        <button className="help-btn">❓ Help & Support</button>
        <button className="logout-btn" onClick={logout}>🚪 Logout</button>
      </Card>
    </div>
  );
}

