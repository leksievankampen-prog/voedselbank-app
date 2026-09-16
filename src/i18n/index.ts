import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';
import nl from './locales/nl.json';

export const SUPPORTED_LANGUAGES = ['nl', 'en', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: Language[] = ['ar'];

const STORAGE_KEY = 'vbh.language';

export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.includes(language as Language);
}

function deviceLanguage(): Language {
  const tags = Localization.getLocales();
  for (const locale of tags) {
    const code = locale.languageCode?.toLowerCase();
    if (code && SUPPORTED_LANGUAGES.includes(code as Language)) {
      return code as Language;
    }
  }
  return 'nl';
}

/**
 * Zet de leesrichting. Op web volstaat het `dir`-attribuut, waardoor de taal
 * meteen omschakelt. Native React Native heeft voor een echte RTL-layout een
 * herstart nodig; we zetten de vlag hier zodat die bij de volgende start klopt.
 */
export function applyDirection(language: string) {
  const rtl = isRTL(language);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
    return;
  }
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export async function loadStoredLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // Opslag niet beschikbaar (privémodus in de browser) — val terug op het toestel.
  }
  return deviceLanguage();
}

export async function setLanguage(language: Language) {
  await i18n.changeLanguage(language);
  applyDirection(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Niet kritiek: de taal geldt dan alleen voor deze sessie.
  }
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    nl: { translation: nl },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: 'nl',
  fallbackLng: 'nl',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
