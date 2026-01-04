import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ru'); // Default to Russian

  // Detect language on mount
  useEffect(() => {
    // 1. Check localStorage for saved language preference
    const savedLanguage = localStorage.getItem('app_language');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
      return;
    }

    // 2. Try to get language from Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Try to get language from initDataUnsafe
      if (tg.initDataUnsafe?.user?.language_code) {
        const tgLang = tg.initDataUnsafe.user.language_code.toLowerCase();
        // Map Telegram language codes to our language codes
        if (tgLang.startsWith('uz')) {
          setLanguage('uz');
          localStorage.setItem('app_language', 'uz');
          return;
        } else if (tgLang.startsWith('ru')) {
          setLanguage('ru');
          localStorage.setItem('app_language', 'ru');
          return;
        } else if (tgLang.startsWith('en')) {
          setLanguage('en');
          localStorage.setItem('app_language', 'en');
          return;
        }
      }
      
      // Try to get language from Telegram WebApp versionParams
      if (tg.versionParams?.language_code) {
        const tgLang = tg.versionParams.language_code.toLowerCase();
        if (tgLang.startsWith('uz')) {
          setLanguage('uz');
          localStorage.setItem('app_language', 'uz');
          return;
        } else if (tgLang.startsWith('ru')) {
          setLanguage('ru');
          localStorage.setItem('app_language', 'ru');
          return;
        } else if (tgLang.startsWith('en')) {
          setLanguage('en');
          localStorage.setItem('app_language', 'en');
          return;
        }
      }
    }

    // 3. Try to get language from browser/system
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const langCode = browserLang.toLowerCase().split('-')[0];
      if (langCode === 'uz') {
        setLanguage('uz');
        localStorage.setItem('app_language', 'uz');
        return;
      } else if (langCode === 'ru') {
        setLanguage('ru');
        localStorage.setItem('app_language', 'ru');
        return;
      } else if (langCode === 'en') {
        setLanguage('en');
        localStorage.setItem('app_language', 'en');
        return;
      }
    }

    // 4. Default to Russian
    setLanguage('ru');
    localStorage.setItem('app_language', 'ru');
  }, []);

  // Save language preference when changed
  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('app_language', lang);
    }
  };

  // Translation function
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        value = translations.en;
        for (const k2 of keys) {
          if (value && typeof value === 'object') {
            value = value[k2];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

