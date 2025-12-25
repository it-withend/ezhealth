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
      
      // Initialize Telegram WebApp
      tg.ready();
      tg.expand();
      
      // Get initData from Telegram
      const initData = tg.initData;
      const initDataUnsafe = tg.initDataUnsafe;
      
      console.log('Telegram WebApp initialized');
      console.log('initData:', initData);
      console.log('initDataUnsafe:', initDataUnsafe);
      
      // Always parse initData string to get all fields including hash
      if (initData) {
        const params = new URLSearchParams(initData);
        const authData = {};
        
        // Parse all parameters from initData
        params.forEach((value, key) => {
          authData[key] = decodeURIComponent(value);
        });
        
        // Parse user data if it's a JSON string
        if (authData.user) {
          try {
            const userData = JSON.parse(authData.user);
            // Merge user data into authData
            authData.id = userData.id;
            authData.first_name = userData.first_name;
            authData.last_name = userData.last_name;
            authData.username = userData.username;
            authData.photo_url = userData.photo_url;
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        // If initDataUnsafe is available, prefer its user data (more reliable)
        if (initDataUnsafe && initDataUnsafe.user) {
          authData.id = initDataUnsafe.user.id;
          authData.first_name = initDataUnsafe.user.first_name;
          authData.last_name = initDataUnsafe.user.last_name;
          authData.username = initDataUnsafe.user.username;
          authData.photo_url = initDataUnsafe.user.photo_url;
        }
        
        // Ensure we have required fields
        if (authData.id && authData.hash) {
          console.log('Using initData with hash:', { 
            id: authData.id, 
            first_name: authData.first_name,
            hash: '***' 
          });
          handleTelegramAuth(authData);
        } else {
          console.error('Missing required fields:', { 
            has_id: !!authData.id, 
            has_hash: !!authData.hash 
          });
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert('Ошибка: не удалось получить данные авторизации из Telegram');
          }
        }
      } else {
        console.warn('No Telegram initData available');
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Ошибка: данные Telegram недоступны. Попробуйте перезагрузить страницу.');
        }
      }
    }
  }, []);

  const handleTelegramAuth = async (authData) => {
    try {
      // Only proceed if we have at least an ID and hash
      if (!authData.id) {
        console.error('No user ID found in auth data:', authData);
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Ошибка: не удалось получить данные пользователя из Telegram');
        }
        return;
      }

      if (!authData.hash) {
        console.error('No hash found in auth data:', authData);
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Ошибка: не удалось получить hash для проверки авторизации');
        }
        return;
      }

      // Send all fields from initData to backend for hash verification
      // Telegram requires ALL fields (except hash) to be included for verification
      const formattedData = {
        ...authData, // Include all fields from initData
        id: authData.id, // Ensure id is set
        first_name: authData.first_name || null,
        last_name: authData.last_name || null,
        username: authData.username || null,
        photo_url: authData.photo_url || null,
      };

      // Remove empty strings and convert to null for consistency
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] === '') {
          formattedData[key] = null;
        }
      });

      console.log('Attempting login with data:', { 
        id: formattedData.id,
        first_name: formattedData.first_name,
        auth_date: formattedData.auth_date,
        has_hash: !!formattedData.hash,
        all_keys: Object.keys(formattedData).filter(k => k !== 'hash')
      });
      
      const success = await login(formattedData);
      if (success) {
        navigate('/dashboard');
      } else {
        console.error('Login failed - check backend logs');
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Ошибка авторизации. Проверьте настройки сервера и токен бота.');
        }
      }
    } catch (error) {
      console.error('Error in handleTelegramAuth:', error);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Ошибка при авторизации: ' + (error.message || 'Неизвестная ошибка'));
      }
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
              <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
              <p>Авторизация через Telegram...</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                Если авторизация не происходит автоматически, попробуйте перезагрузить страницу
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

