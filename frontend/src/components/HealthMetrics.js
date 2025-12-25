import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import '../styles/HealthMetrics.css';

function HealthMetrics() {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'pulse',
    value: '',
    unit: '',
    notes: '',
  });

  useEffect(() => {
    loadMetrics();
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const response = await api.get('/health/metrics', {
        params: { user_id: user.id, limit: 50 },
      });
      setMetrics(response.data.metrics || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.value) return;

    try {
      await api.post('/health/metrics', {
        user_id: user.id,
        ...formData,
        value: parseFloat(formData.value),
      });
      setFormData({ type: 'pulse', value: '', unit: '', notes: '' });
      setShowForm(false);
      loadMetrics();
    } catch (error) {
      console.error('Error adding metric:', error);
      alert('Ошибка при добавлении показателя');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот показатель?')) return;

    try {
      await api.delete(`/health/metrics/${id}`, {
        params: { user_id: user.id },
      });
      loadMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
      alert('Ошибка при удалении');
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      pulse: 'Пульс',
      sleep: 'Сон',
      weight: 'Вес',
      pressure: 'Давление',
      sugar: 'Сахар',
      temperature: 'Температура',
    };
    return labels[type] || type;
  };

  const getDefaultUnit = (type) => {
    const units = {
      pulse: 'уд/мин',
      sleep: 'ч',
      weight: 'кг',
      pressure: 'мм рт.ст.',
      sugar: 'ммоль/л',
      temperature: '°C',
    };
    return units[type] || '';
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
          <h1>Показатели здоровья</h1>
        </div>

        <button
          className="btn btn-primary add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Отмена' : '+ Добавить показатель'}
        </button>

        {showForm && (
          <form className="card metric-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Тип показателя</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    type: e.target.value,
                    unit: getDefaultUnit(e.target.value),
                  });
                }}
              >
                <option value="pulse">Пульс</option>
                <option value="sleep">Сон</option>
                <option value="weight">Вес</option>
                <option value="pressure">Давление</option>
                <option value="sugar">Сахар</option>
                <option value="temperature">Температура</option>
              </select>
            </div>

            <div className="input-group">
              <label>Значение</label>
              <input
                type="number"
                step="0.1"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Единица измерения</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder={getDefaultUnit(formData.type)}
              />
            </div>

            <div className="input-group">
              <label>Заметки (необязательно)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </form>
        )}

        <div className="metrics-list">
          {metrics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>Пока нет записей</p>
            </div>
          ) : (
            metrics.map((metric) => (
              <div key={metric.id} className="list-item">
                <div className="list-item-header">
                  <div className="list-item-title">{getTypeLabel(metric.type)}</div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleDelete(metric.id)}
                  >
                    Удалить
                  </button>
                </div>
                <div className="metric-value">
                  {metric.value} {metric.unit || ''}
                </div>
                {metric.notes && (
                  <div className="metric-notes">{metric.notes}</div>
                )}
                <div className="list-item-date">
                  {format(new Date(metric.recorded_at), 'dd MMMM yyyy, HH:mm', {
                    locale: ru,
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default HealthMetrics;

