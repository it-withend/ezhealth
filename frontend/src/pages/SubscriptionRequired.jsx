import React, { useEffect, useState, useContext } from "react";
import { useLanguage } from "../context/LanguageContext";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import "../styles/SubscriptionRequired.css";

export default function SubscriptionRequired() {
  const { t } = useLanguage();
  const { setIsSubscribed, setSubscriptionChecked } = useContext(AuthContext);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState(null);

  useEffect(() => {
    // Get Telegram user ID
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      setTelegramId(tgUser.id);
    }
  }, []);

  const handleCheckSubscription = async () => {
    if (!telegramId) {
      alert(t("subscription.noTelegramId") || "Telegram user ID not found. Please open this app from Telegram.");
      return;
    }

    setChecking(true);
    try {
      const response = await api.get("/auth/check-subscription", {
        params: { telegram_id: telegramId }
      });

      if (response.data.subscribed) {
        // Subscription confirmed, update context and reload
        if (setIsSubscribed) setIsSubscribed(true);
        if (setSubscriptionChecked) setSubscriptionChecked(true);
        // Reload the app to show main content
        window.location.reload();
      } else {
        alert(t("subscription.notSubscribed") || "You are not subscribed to the channel. Please subscribe first.");
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    } finally {
      setChecking(false);
    }
  };

  const handleOpenChannel = () => {
    const channelUsername = "@nedoproggramist";
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${channelUsername.replace('@', '')}`);
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(`https://t.me/${channelUsername.replace('@', '')}`);
    } else {
      window.open(`https://t.me/${channelUsername.replace('@', '')}`, '_blank');
    }
  };

  return (
    <div className="subscription-required-container">
      <div className="subscription-content">
        <div className="subscription-icon">📢</div>
        <h1 className="subscription-title">{t("subscription.title") || "Subscription Required"}</h1>
        <p className="subscription-description">
          {t("subscription.description") || "To use this bot, you need to subscribe to our channel:"}
        </p>
        <div className="channel-info">
          <span className="channel-name">@nedoproggramist</span>
        </div>
        <div className="subscription-actions">
          <button 
            className="btn-subscribe" 
            onClick={handleOpenChannel}
            disabled={checking}
          >
            {t("subscription.openChannel") || "Open Channel"}
          </button>
          <button 
            className="btn-check" 
            onClick={handleCheckSubscription}
            disabled={checking}
          >
            {checking 
              ? (t("subscription.checking") || "Checking...") 
              : (t("subscription.checkSubscription") || "I've Subscribed")}
          </button>
        </div>
        <p className="subscription-hint">
          {t("subscription.hint") || "1. Click 'Open Channel' to subscribe\n2. Then click 'I've Subscribed' to verify"}
        </p>
      </div>
    </div>
  );
}
