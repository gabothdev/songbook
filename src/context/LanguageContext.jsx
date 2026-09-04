import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, detectBrowserLanguage } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('songbook_lang');
    if (saved && (saved === 'es' || saved === 'en')) {
      return saved;
    }
    return detectBrowserLanguage();
  });

  useEffect(() => {
    localStorage.setItem('songbook_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang] || translations.es;

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
