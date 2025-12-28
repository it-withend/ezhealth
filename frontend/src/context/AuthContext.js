import React, { createContext, useContext, useReducer } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext();
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: JSON.parse(localStorage.getItem('user')) || null,
    isAuthenticated: !!localStorage.getItem('user'),
    loading: false
  });

  const login = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Отправляем данные аутентификации на бэкенд через axios
      const response = await api.post('/auth/telegram', userData);
      
      if (response.data.success && response.data.user) {
        // Сохраняем пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        dispatch({ type: 'LOGIN', payload: response.data.user });
        return true;
      } else {
        console.error('Login failed: No user data in response');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error.response || error.message || error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

