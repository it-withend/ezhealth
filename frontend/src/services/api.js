import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include user_id if available
api.interceptors.request.use((config) => {
  // Only add user_id if it's not already in the request and we're not making an auth request
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.id) {
    // Don't add user_id to auth endpoints
    if (!config.url.includes('/auth/')) {
      if (config.method === 'get') {
        config.params = { ...config.params, user_id: user.id };
      } else {
        config.data = { ...config.data, user_id: user.id };
      }
    }
  }
  return config;
});

export default api;

