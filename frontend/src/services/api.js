import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://ezhealth-l6zx.onrender.com/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Передаём Telegram initData в каждый запрос
api.interceptors.request.use((config) => {
  if (window.Telegram?.WebApp?.initData) {
    config.headers["X-Telegram-Init-Data"] =
      window.Telegram.WebApp.initData;
  }
  return config;
});

export default api;
