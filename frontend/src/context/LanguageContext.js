import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

// Supported languages in our app
const SUPPORTED_LANGUAGES = ['en', 'ru', 'uz'];

// Map Telegram language codes to our language codes
function mapTelegramLanguage(tgLang) {
  if (!tgLang) return null;
  
  const lang = tgLang.toLowerCase();
  
  // Direct matches
  if (lang.startsWith('uz') || lang === 'uzbek' || lang === 'uz-uz' || lang === 'uz_uz') {
    return 'uz';
  }
  if (lang.startsWith('ru') || lang === 'russian' || lang === 'ru-ru' || lang === 'ru_ru') {
    return 'ru';
  }
  if (lang.startsWith('en') || lang === 'english' || lang === 'en-us' || lang === 'en_us' || lang === 'en-gb' || lang === 'en_gb') {
    return 'en';
  }
  
  // If language not supported, return null (will fallback to English)
  return null;
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default to English

  // Detect language on mount
  useEffect(() => {
    let detectedLang = null;
    let detectionSource = '';
    let telegramProvidedLanguage = false;

    // 1. Try to get language from Telegram WebApp first (highest priority)
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Try to get language from initDataUnsafe
      if (tg.initDataUnsafe?.user?.language_code) {
        telegramProvidedLanguage = true;
        const tgLang = tg.initDataUnsafe.user.language_code;
        console.log('🌐 Telegram language detected (initDataUnsafe):', tgLang);
        const mappedLang = mapTelegramLanguage(tgLang);
        if (mappedLang) {
          detectedLang = mappedLang;
          detectionSource = 'Telegram (initDataUnsafe)';
        } else {
          // Telegram language not supported - use English immediately
          console.log('🌐 Telegram language not supported, using English:', tgLang);
          detectedLang = 'en';
          detectionSource = 'Telegram (unsupported -> English)';
        }
      }
      
      // Try to get language from Telegram WebApp versionParams if not found yet
      if (!detectedLang && tg.versionParams?.language_code) {
        telegramProvidedLanguage = true;
        const tgLang = tg.versionParams.language_code;
        console.log('🌐 Telegram language detected (versionParams):', tgLang);
        const mappedLang = mapTelegramLanguage(tgLang);
        if (mappedLang) {
          detectedLang = mappedLang;
          detectionSource = 'Telegram (versionParams)';
        } else {
          // Telegram language not supported - use English immediately
          console.log('🌐 Telegram language not supported, using English:', tgLang);
          detectedLang = 'en';
          detectionSource = 'Telegram (unsupported -> English)';
        }
      }
    }

    // 2. Try to get language from browser/system ONLY if Telegram didn't provide language
    // If Telegram provided unsupported language, we already set English, so skip browser check
    if (!detectedLang) {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang) {
        const langCode = browserLang.toLowerCase().split('-')[0];
        console.log('🌐 Browser language detected:', browserLang, '->', langCode);
        
        if (langCode === 'uz') {
          detectedLang = 'uz';
          detectionSource = 'Browser';
        } else if (langCode === 'ru') {
          detectedLang = 'ru';
          detectionSource = 'Browser';
        } else if (langCode === 'en') {
          detectedLang = 'en';
          detectionSource = 'Browser';
        } else {
          // Browser language not supported, use English
          console.log('🌐 Browser language not supported, using English:', browserLang);
          detectedLang = 'en';
          detectionSource = 'Browser (unsupported -> English)';
        }
      }
    }

    // 3. Check localStorage for saved language preference (only if no auto-detection)
    if (!detectedLang) {
      const savedLanguage = localStorage.getItem('app_language');
      if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
        detectedLang = savedLanguage;
        detectionSource = 'Saved preference';
        console.log('🌐 Using saved language:', savedLanguage);
      }
    }

    // 4. Default to English if nothing detected
    if (!detectedLang) {
      detectedLang = 'en';
      detectionSource = 'Default';
      console.log('🌐 Using default language: en');
    }

    console.log(`🌐 Language set to: ${detectedLang} (source: ${detectionSource})`);
    setLanguage(detectedLang);
    localStorage.setItem('app_language', detectedLang);
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

