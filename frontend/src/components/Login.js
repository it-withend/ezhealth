import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Telegram WebApp is available
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Get initData from Telegram
      const initData = tg.initData;
      const initDataUnsafe = tg.initDataUnsafe;
      
      // Try to get auth data from initDataUnsafe first
      if (initDataUnsafe && initDataUnsafe.user) {
        // User is authenticated via Telegram
        const authData = {
          ...initDataUnsafe,
          id: initDataUnsafe.user.id,
          first_name: initDataUnsafe.user.first_name,
          last_name: initDataUnsafe.user.last_name,
          username: initDataUnsafe.user.username,
          photo_url: initDataUnsafe.user.photo_url,
        };
        handleTelegramAuth(authData);
      } else if (initData) {
        // Parse initData string
        const params = new URLSearchParams(initData);
        const authData = {};
        params.forEach((value, key) => {
          authData[key] = value;
        });
        // Parse user data if it's a JSON string
        if (authData.user) {
          try {
            const userData = JSON.parse(authData.user);
            authData.id = userData.id;
            authData.first_name = userData.first_name;
            authData.last_name = userData.last_name;
            authData.username = userData.username;
            authData.photo_url = userData.photo_url;
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        handleTelegramAuth(authData);
      }
    }
  }, []);

  const handleTelegramAuth = async (authData) => {
    // Format auth data for backend
    // Telegram sends data in different formats, so we need to handle both
    const formattedData = {
      id: authData.user?.id || authData.id,
      first_name: authData.user?.first_name || authData.first_name,
      last_name: authData.user?.last_name || authData.last_name,
      username: authData.user?.username || authData.username,
      photo_url: authData.user?.photo_url || authData.photo_url,
      auth_date: authData.auth_date || authData.authDate,
      hash: authData.hash,
    };

    // Only proceed if we have at least an ID
    if (!formattedData.id) {
      console.error('No user ID found in auth data');
      return;
    }

    const success = await login(formattedData);
    if (success) {
      navigate('/dashboard');
    } else {
      console.error('Login failed');
    }
  };

  const handleManualLogin = async () => {
    // Development mode: allow login in browser for testing
    if (!window.Telegram || !window.Telegram.WebApp) {
      // Create test user data for browser testing
      const testAuthData = {
        id: 123456789, // Test Telegram ID
        first_name: 'Test',
        last_name: 'User',
        username: 'test_user',
        photo_url: null,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'dev_mode_hash', // Will be bypassed in development
      };
      
      const success = await login(testAuthData);
      if (success) {
        navigate('/dashboard');
      } else {
        alert('Ошибка входа. Убедитесь, что backend запущен и NODE_ENV=development');
      }
    } else {
      const tg = window.Telegram.WebApp;
      tg.showAlert('Пожалуйста, используйте Telegram для входа');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Health Tracker</h1>
        <p className="login-subtitle">Отслеживание вашего здоровья</p>
        
        <div className="login-content">
          {!window.Telegram || !window.Telegram.WebApp ? (
            <>
              <p>⚠️ Режим разработки: Тестирование в браузере</p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                В production приложение работает только в Telegram Mini App
              </p>
              <button className="btn btn-primary login-button" onClick={handleManualLogin}>
                Войти как тестовый пользователь
              </button>
            </>
          ) : (
            <>
              <p>Для использования приложения необходимо войти через Telegram</p>
              <button className="btn btn-primary login-button" onClick={handleManualLogin}>
                Войти через Telegram
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

