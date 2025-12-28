import React, { createContext, useContext, useReducer } from 'react';

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
      
      // Отправляем данные аутентификации на бэкенд
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        return false;
      }
      
      const result = await response.json();
      
      if (result.success && result.user) {
        // Сохраняем пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        
        dispatch({ type: 'LOGIN', payload: result.user });
        return true;
      } else {
        console.error('Login failed: No user data in response');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
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

