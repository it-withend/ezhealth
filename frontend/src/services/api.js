import axios from "axios";

// Ensure API_URL always ends with /api
let API_URL = process.env.REACT_APP_API_URL || "https://ezhealth-l6zx.onrender.com/api";

// Force fix: remove trailing slash and ensure /api suffix
API_URL = API_URL.trim().replace(/\/+$/, ''); // Remove trailing slashes
if (!API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'api.js:config',
    message: 'API configuration',
    data: { 
      apiUrl: API_URL, 
      envUrl: process.env.REACT_APP_API_URL,
      fullUrl: `${API_URL}/auth/telegram`,
      fixed: true,
      afterFix: API_URL
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run2',
    hypothesisId: 'B'
  })
}).catch(() => {});
// #endregion

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Передаём Telegram initData в каждый запрос
api.interceptors.request.use((config) => {
  // #region agent log
  const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
  fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'api.js:request',
      message: 'API request',
      data: { 
        url: config.url, 
        baseURL: config.baseURL,
        fullUrl: fullUrl,
        method: config.method, 
        hasInitData: !!window.Telegram?.WebApp?.initData 
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B'
    })
  }).catch(() => {});
  // #endregion

  if (window.Telegram?.WebApp?.initData) {
    config.headers["X-Telegram-Init-Data"] =
      window.Telegram.WebApp.initData;
  }
  return config;
});

// Response interceptor для логирования ошибок
api.interceptors.response.use(
  (response) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api.js:response',
        message: 'API response success',
        data: { url: response.config?.url, status: response.status },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      })
    }).catch(() => {});
    // #endregion
    return response;
  },
  (error) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api.js:response-error',
        message: 'API response error',
        data: {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.message,
          responseData: error.response?.data
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      })
    }).catch(() => {});
    // #endregion
    return Promise.reject(error);
  }
);

export default api;
