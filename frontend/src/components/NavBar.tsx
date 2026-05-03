import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { WalletButton } from './WalletButton';
import i18n, { LANGS, Lang } from '../lib/i18n';

export function NavBar() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on click outside
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  useEffect(() => setLangOpen(false), [location]);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/student', label: t('nav.courses') },
    { to: '/teacher', label: t('nav.teacher') },
    { to: '/resume', label: t('nav.resume') },
  ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  function changeLang(l: Lang) {
    i18n.changeLanguage(l);
    localStorage.setItem('ca-lang', l);
    setLangOpen(false);
  }

  const langLabels: Record<Lang, string> = { en: 'EN', zh: '中', ja: 'JP', ko: '한', fr: 'FR', es: 'ES', de: 'DE', ru: 'RU' };

  return (
    <header
      className="top-nav fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">
        {/* Logo — always left */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.svg" alt="ChainAchieve" className="w-8 h-8 rounded-xl object-contain" />
          <span className="font-black text-[17px] tracking-tight" style={{ color: 'var(--text)', fontFeatureSettings: '"calt" 1' }}>
            Chain<span style={{ color: 'var(--brand-green)' }}>Achieve</span>
          </span>
        </Link>

        {/* Floating pill nav — desktop only, centered absolutely */}
        <nav
          className="hidden md:flex items-center gap-0.5 p-1 absolute left-1/2 -translate-x-1/2"
          style={{
            background: 'rgba(var(--surface-rgb, 240 244 236), 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 9999,
            border: '1px solid var(--border)',
            padding: '4px',
          }}
        >
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="relative px-4 py-1.5 text-sm font-semibold transition-all duration-150 select-none"
              style={{
                borderRadius: 9999,
                color: isActive(link.to) ? '#163300' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'var(--brand-green)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions — always right */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <motion.button
            onClick={toggle}
            className="w-9 h-9 rounded-pill flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface)' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </motion.button>

          {/* Language switcher */}
          <div className="relative" ref={langRef}>
            <motion.button
              onClick={() => setLangOpen(p => !p)}
              className="h-9 px-3 rounded-pill text-sm font-semibold flex items-center gap-1 transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {langLabels[i18n.language as Lang] ?? 'EN'}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M5 7L1 3h8L5 7z" />
              </svg>
            </motion.button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden shadow-card z-50 min-w-[110px]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {LANGS.map(l => (
                    <button
                      key={l}
                      onClick={() => changeLang(l)}
                      className={`w-full px-4 py-2.5 text-sm font-semibold text-left transition-colors ${
                        i18n.language === l ? 'text-brand-dark-green' : ''
                      }`}
                      style={{
                        color: i18n.language === l ? '#163300' : 'var(--text-secondary)',
                        background: i18n.language === l ? 'var(--brand-green)' : 'transparent',
                      }}
                    >
                      {t(`lang.${l}`)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Wallet button */}
          <div className="hidden sm:block">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
