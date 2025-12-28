import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1️⃣ Пытаемся восстановить пользователя
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setLoading(false);
          setInitialized(true);
          return;
        }

        // 2️⃣ Только Telegram Mini App
        if (!window.Telegram?.WebApp) {
          console.warn("Not in Telegram Mini App");
          setLoading(false);
          setInitialized(true);
          return;
        }

        const tg = window.Telegram.WebApp;
        tg.ready();

        const tgUser = tg.initDataUnsafe?.user;
        if (!tgUser) {
          console.warn("No Telegram user");
          setLoading(false);
          setInitialized(true);
          return;
        }

        // 3️⃣ Авторизация через backend
        const res = await api.post("/auth/telegram", {
          telegram_id: tgUser.id,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          username: tgUser.username,
          photo_url: tgUser.photo_url,
        });

        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    if (!initialized) {
      initAuth();
    }
  }, [initialized]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
