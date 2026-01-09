import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AuthContext.js:initAuth',
          message: 'initAuth started',
          data: { hasTelegram: !!window.Telegram?.WebApp },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        })
      }).catch(() => {});
      // #endregion

      try {
        // 1️⃣ Пытаемся восстановить пользователя
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'AuthContext.js:initAuth',
              message: 'User restored from localStorage',
              data: { userId: parsedUser?.id },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'D'
            })
          }).catch(() => {});
          // #endregion
          
          // Check subscription for restored user
          if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            try {
              const subscriptionRes = await api.get("/auth/check-subscription", {
                params: { telegram_id: tgUser.id }
              });
              setIsSubscribed(subscriptionRes.data.subscribed || false);
              setSubscriptionChecked(true);
            } catch (subError) {
              console.error("Subscription check error:", subError);
              setIsSubscribed(true);
              setSubscriptionChecked(true);
            }
          } else {
            // If no Telegram context, allow access (development mode)
            setIsSubscribed(true);
            setSubscriptionChecked(true);
          }
          
          setLoading(false);
          setInitialized(true);
          return;
        }

        // 2️⃣ Только Telegram Mini App
        if (!window.Telegram?.WebApp) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'AuthContext.js:initAuth',
              message: 'Not in Telegram Mini App',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'D'
            })
          }).catch(() => {});
          // #endregion
          console.warn("Not in Telegram Mini App");
          // In development mode, allow access without subscription check
          setIsSubscribed(true);
          setSubscriptionChecked(true);
          setLoading(false);
          setInitialized(true);
          return;
        }

        const tg = window.Telegram.WebApp;
        tg.ready();

        const tgUser = tg.initDataUnsafe?.user;
        if (!tgUser) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'AuthContext.js:initAuth',
              message: 'No Telegram user',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'D'
            })
          }).catch(() => {});
          // #endregion
          console.warn("No Telegram user");
          setIsSubscribed(true);
          setSubscriptionChecked(true);
          setLoading(false);
          setInitialized(true);
          return;
        }

        // 3️⃣ Авторизация через backend
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.js:initAuth',
            message: 'Calling auth API',
            data: { telegramId: tgUser.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {});
        // #endregion

        const res = await api.post("/auth/telegram", {
          telegram_id: tgUser.id,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          username: tgUser.username,
          photo_url: tgUser.photo_url,
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.js:initAuth',
            message: 'Auth API success',
            data: { userId: res.data?.id },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {});
        // #endregion

        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));

        // Check subscription after successful auth
        if (res.data && res.data.id) {
          try {
            const subscriptionRes = await api.get("/auth/check-subscription", {
              params: { telegram_id: tgUser.id }
            });
            setIsSubscribed(subscriptionRes.data.subscribed || false);
            setSubscriptionChecked(true);
          } catch (subError) {
            console.error("Subscription check error:", subError);
            // If subscription check fails, allow access (fail open)
            setIsSubscribed(true);
            setSubscriptionChecked(true);
          }
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.js:initAuth',
            message: 'Auth error',
            data: { error: err.message, status: err.response?.status, responseData: err.response?.data },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {});
        // #endregion
        console.error("Auth error:", err);
        // On error, still check subscription status if we have Telegram user
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
          try {
            const subscriptionRes = await api.get("/auth/check-subscription", {
              params: { telegram_id: tgUser.id }
            });
            setIsSubscribed(subscriptionRes.data.subscribed || false);
            setSubscriptionChecked(true);
          } catch (subError) {
            console.error("Subscription check error:", subError);
            setIsSubscribed(true);
            setSubscriptionChecked(true);
          }
        } else {
          setIsSubscribed(true);
          setSubscriptionChecked(true);
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    if (!initialized) {
      initAuth();
    }
  }, [initialized]);

  const checkSubscription = async (telegramId) => {
    try {
      const subscriptionRes = await api.get("/auth/check-subscription", {
        params: { telegram_id: telegramId }
      });
      setIsSubscribed(subscriptionRes.data.subscribed || false);
      setSubscriptionChecked(true);
      return subscriptionRes.data.subscribed || false;
    } catch (subError) {
      console.error("Subscription check error:", subError);
      setIsSubscribed(true);
      setSubscriptionChecked(true);
      return true;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      subscriptionChecked, 
      isSubscribed,
      setIsSubscribed,
      setSubscriptionChecked,
      checkSubscription
    }}>
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
