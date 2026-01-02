import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import '../styles/Profile.css';

function Profile() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactData, setContactData] = useState({
    contact_telegram_id: '',
    contact_name: '',
  });

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      // user_id is now optional - middleware will get it from auth
      const response = await api.get('/user/trusted-contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactData.contact_telegram_id) return;

    try {
      // user_id is now optional - middleware will get it from auth
      await api.post('/user/trusted-contacts', {
        ...contactData,
        contact_telegram_id: parseInt(contactData.contact_telegram_id),
      });
      setContactData({ contact_telegram_id: '', contact_name: '' });
      setShowAddContact(false);
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      const errorMsg = error.response?.data?.error || 'Ошибка при добавлении контакта';
      alert(errorMsg);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Удалить этого доверенного человека?')) return;

    try {
      // user_id is now optional - middleware will get it from auth
      await api.delete(`/user/trusted-contacts/${id}`);
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      const errorMsg = error.response?.data?.error || 'Ошибка при удалении';
      alert(errorMsg);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="container">
        <div className="page-header">
          <Link to="/dashboard" className="back-button">← Назад</Link>
          <h1>Профиль</h1>
        </div>

        <div className="card profile-card">
          <div className="profile-info">
            {user?.photo_url && (
              <img src={user.photo_url} alt="Avatar" className="profile-avatar" />
            )}
            <div className="profile-details">
              <h2>
                {user?.first_name} {user?.last_name}
              </h2>
              {user?.username && <p>@{user.username}</p>}
              <p className="profile-id">ID: {user?.telegram_id}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Доверенные лица</div>
          <p className="card-description">
            Люди, которым вы разрешили просматривать ваши данные о здоровье
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setShowAddContact(!showAddContact)}
            style={{ marginBottom: '16px' }}
          >
            {showAddContact ? 'Отмена' : '+ Добавить доверенное лицо'}
          </button>

          {showAddContact && (
            <form className="contact-form" onSubmit={handleAddContact}>
              <div className="input-group">
                <label>Telegram ID доверенного лица</label>
                <input
                  type="number"
                  value={contactData.contact_telegram_id}
                  onChange={(e) =>
                    setContactData({ ...contactData, contact_telegram_id: e.target.value })
                  }
                  placeholder="123456789"
                  required
                />
              </div>

              <div className="input-group">
                <label>Имя (необязательно)</label>
                <input
                  type="text"
                  value={contactData.contact_name}
                  onChange={(e) =>
                    setContactData({ ...contactData, contact_name: e.target.value })
                  }
                  placeholder="Имя контакта"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Добавить
              </button>
            </form>
          )}

          <div className="contacts-list">
            {contacts.length === 0 ? (
              <div className="empty-state">
                <p>Нет доверенных лиц</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="list-item">
                  <div className="list-item-header">
                    <div>
                      <div className="list-item-title">
                        {contact.contact_name || `ID: ${contact.contact_telegram_id}`}
                      </div>
                      <div className="list-item-date">
                        ID: {contact.contact_telegram_id}
                      </div>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button className="btn btn-danger logout-button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}

export default Profile;

