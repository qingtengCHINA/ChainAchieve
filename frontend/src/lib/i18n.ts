import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en';
import zh from '../locales/zh';
import ja from '../locales/ja';
import ko from '../locales/ko';
import fr from '../locales/fr';
import es from '../locales/es';
import de from '../locales/de';
import ru from '../locales/ru';

let savedLang = 'en';
try { savedLang = localStorage.getItem('ca-lang') ?? 'en'; } catch { /* private browsing / test env */ }

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
      ru: { translation: ru },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;

export const LANGS = ['en', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'ru'] as const;
export type Lang = (typeof LANGS)[number];
