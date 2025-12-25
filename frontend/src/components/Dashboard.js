import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    latestPulse: null,
    latestSleep: null,
    latestWeight: null,
    analysesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get latest health metrics
      const [pulseRes, sleepRes, weightRes, analysesRes] = await Promise.all([
        api.get('/health/metrics/latest', { params: { user_id: user.id, type: 'pulse' } }),
        api.get('/health/metrics/latest', { params: { user_id: user.id, type: 'sleep' } }),
        api.get('/health/metrics/latest', { params: { user_id: user.id, type: 'weight' } }),
        api.get('/analysis', { params: { user_id: user.id, limit: 1 } }),
      ]);

      setStats({
        latestPulse: pulseRes.data.metric,
        latestSleep: sleepRes.data.metric,
        latestWeight: weightRes.data.metric,
        analysesCount: analysesRes.data.analyses?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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
        <div className="dashboard-header">
          <h1>Добро пожаловать, {user?.first_name || 'Пользователь'}!</h1>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">❤️</div>
            <div className="stat-content">
              <div className="stat-label">Пульс</div>
              <div className="stat-value">
                {stats.latestPulse ? `${stats.latestPulse.value} ${stats.latestPulse.unit || 'уд/мин'}` : 'Нет данных'}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">😴</div>
            <div className="stat-content">
              <div className="stat-label">Сон</div>
              <div className="stat-value">
                {stats.latestSleep ? `${stats.latestSleep.value} ${stats.latestSleep.unit || 'ч'}` : 'Нет данных'}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="stat-content">
              <div className="stat-label">Вес</div>
              <div className="stat-value">
                {stats.latestWeight ? `${stats.latestWeight.value} ${stats.latestWeight.unit || 'кг'}` : 'Нет данных'}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-label">Анализы</div>
              <div className="stat-value">{stats.analysesCount}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <Link to="/health" className="action-card">
            <div className="action-icon">📊</div>
            <div className="action-text">
              <div className="action-title">Показатели здоровья</div>
              <div className="action-subtitle">Пульс, сон, давление и др.</div>
            </div>
          </Link>

          <Link to="/analysis" className="action-card">
            <div className="action-icon">🔬</div>
            <div className="action-text">
              <div className="action-title">Анализы и снимки</div>
              <div className="action-subtitle">Дневник медицинских данных</div>
            </div>
          </Link>

          <Link to="/profile" className="action-card">
            <div className="action-icon">👤</div>
            <div className="action-text">
              <div className="action-title">Профиль</div>
              <div className="action-subtitle">Настройки и доверенные лица</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

