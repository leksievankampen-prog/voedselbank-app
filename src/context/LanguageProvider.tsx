import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import i18n, {
  applyDirection,
  isRTL,
  loadStoredLanguage,
  setLanguage as persistLanguage,
  type Language,
} from '@/i18n';

interface LanguageContextValue {
  language: Language;
  rtl: boolean;
  ready: boolean;
  changeLanguage: (next: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('nl');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStoredLanguage().then(async (stored) => {
      if (cancelled) return;
      await i18n.changeLanguage(stored);
      applyDirection(stored);
      setLanguageState(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLanguage = useCallback(async (next: Language) => {
    await persistLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo(
    () => ({ language, rtl: isRTL(language), ready, changeLanguage }),
    [language, ready, changeLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage moet binnen LanguageProvider gebruikt worden');
  return context;
}

/** Kleine hulp zodat schermen niet twee hooks hoeven te importeren. */
export function useI18n() {
  const { t } = useTranslation();
  const { language, rtl, changeLanguage } = useLanguage();
  return { t, language, rtl, changeLanguage };
}
