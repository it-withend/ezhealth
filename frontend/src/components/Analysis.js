import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';
import ru from 'date-fns/locale/ru';
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
    file: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, [user]);

  const loadAnalyses = async () => {
    if (!user) return;

    try {
      // user_id is now optional - middleware will get it from auth
      // But we keep it for backward compatibility
      const response = await api.get('/analysis', {
        params: { limit: 100 },
      });
      setAnalyses(response.data.analyses || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file, title: formData.title || file.name });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    setUploading(true);
    try {
      if (formData.file) {
        // Upload with file
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.file);
        uploadFormData.append('title', formData.title);
        uploadFormData.append('type', formData.type);
        uploadFormData.append('date', formData.date);
        if (formData.notes) {
          uploadFormData.append('notes', formData.notes);
        }

        await api.post('/analysis', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Upload without file
        await api.post('/analysis', {
          title: formData.title,
          type: formData.type,
          date: formData.date,
          notes: formData.notes
        });
      }

      setFormData({
        title: '',
        type: '',
        notes: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        file: null
      });
      setShowForm(false);
      loadAnalyses();
    } catch (error) {
      console.error('Error adding analysis:', error);
      const errorMsg = error.response?.data?.error || 'Ошибка при добавлении анализа';
      alert(errorMsg);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот анализ?')) return;

    try {
      // user_id is now optional - middleware will get it from auth
      await api.delete(`/analysis/${id}`);
      loadAnalyses();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      const errorMsg = error.response?.data?.error || 'Ошибка при удалении';
      alert(errorMsg);
      if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
      }
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
              <label>Файл (необязательно)</label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {formData.file && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Выбран: {formData.file.name}
                </p>
              )}
            </div>

            <div className="input-group">
              <label>Заметки</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Загрузка...' : 'Сохранить'}
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
                {analysis.file_path && (
                  <div className="analysis-file">
                    <a 
                      href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${analysis.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#479D90', textDecoration: 'underline' }}
                    >
                      📄 Открыть файл
                    </a>
                  </div>
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

