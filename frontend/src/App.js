import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HealthMetrics from './components/HealthMetrics';
import Analysis from './components/Analysis';
import Profile from './components/Profile';
import './App.css';

// Обернутый компонент приложения для использования AuthContext
function AppContent() {
  const { user, login, logout, loading } = useAuth();

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/health"
          element={user ? <HealthMetrics /> : <Navigate to="/login" />}
        />
        <Route
          path="/analysis"
          element={user ? <Analysis /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={user ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={!user ? <Navigate to="/login" /> : <Navigate to="/dashboard" />}
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

