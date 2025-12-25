import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import '../styles/Analysis.css';

function Analysis() {
  const { user } = useContext(AuthContext);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadAnalyses();
  }, [user]);

  const loadAnalyses = async () => {
    if (!user) return;

    try {
      const response = await api.get('/analysis', {
        params: { user_id: user.id, limit: 100 },
      });
      setAnalyses(response.data.analyses || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    try {
      await api.post('/analysis', {
        user_id: user.id,
        ...formData,
      });
      setFormData({
        title: '',
        type: '',
        notes: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowForm(false);
      loadAnalyses();
    } catch (error) {
      console.error('Error adding analysis:', error);
      alert('Ошибка при добавлении анализа');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот анализ?')) return;

    try {
      await api.delete(`/analysis/${id}`, {
        params: { user_id: user.id },
      });
      loadAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Ошибка при удалении');
    }
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
          <h1>Анализы и снимки</h1>
        </div>

        <button
          className="btn btn-primary add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Отмена' : '+ Добавить анализ'}
        </button>

        {showForm && (
          <form className="card analysis-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Общий анализ крови"
                required
              />
            </div>

            <div className="input-group">
              <label>Тип</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="Например: Анализ крови, Рентген"
              />
            </div>

            <div className="input-group">
              <label>Дата *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Заметки</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </form>
        )}

        <div className="analyses-list">
          {analyses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              <p>Пока нет анализов</p>
            </div>
          ) : (
            analyses.map((analysis) => (
              <div key={analysis.id} className="list-item">
                <div className="list-item-header">
                  <div className="list-item-title">{analysis.title}</div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleDelete(analysis.id)}
                  >
                    Удалить
                  </button>
                </div>
                {analysis.type && (
                  <div className="analysis-type">Тип: {analysis.type}</div>
                )}
                {analysis.notes && (
                  <div className="analysis-notes">{analysis.notes}</div>
                )}
                <div className="list-item-date">
                  {format(new Date(analysis.date), 'dd MMMM yyyy', { locale: ru })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Analysis;

