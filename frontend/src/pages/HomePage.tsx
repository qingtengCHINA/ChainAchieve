import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FadeUp, StaggerContainer, StaggerItem } from '../components/PageTransition';

const features = [
  { key: 'f1', emoji: '🪙' },
  { key: 'f2', emoji: '🎓' },
  { key: 'f3', emoji: '♾️' },
  { key: 'f4', emoji: '📜' },
];

const steps = ['step1', 'step2', 'step3', 'step4'] as const;
const stats = ['s1', 's2', 's3', 's4'] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center overflow-hidden">
        {/* Background decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(159,232,112,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/3 -left-32 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'rgba(159,232,112,0.06)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute top-1/2 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'rgba(159,232,112,0.04)', filter: 'blur(80px)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <FadeUp delay={0.05}>
            <span className="badge mb-8 inline-flex">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" fill="#9fe870" stroke="#163300" strokeWidth="1" />
                <circle cx="6" cy="6" r="2" fill="#163300" />
              </svg>
              {t('home.badge')}
            </span>
          </FadeUp>

          {/* Headline */}
          <FadeUp delay={0.1}>
            <h1 className="display-hero mb-6 tracking-tight">
              <span className="block">{t('home.hero1')}</span>
              <span className="block text-gradient-green">{t('home.hero2')}</span>
              <span className="block">{t('home.hero3')}</span>
            </h1>
          </FadeUp>

          {/* Subtitle */}
          <FadeUp delay={0.2}>
            <p
              className="text-lg sm:text-xl font-semibold max-w-xl mx-auto mb-10 leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('home.subtitle')}
            </p>
          </FadeUp>

          {/* CTA buttons */}
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <motion.button
                className="btn-primary text-base px-8 py-3.5 shadow-ring-green"
                onClick={() => navigate('/student')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('home.ctaStudent')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </motion.button>
              <motion.button
                className="btn-secondary text-base px-8 py-3.5"
                onClick={() => navigate('/teacher')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('home.ctaTeacher')}
              </motion.button>
            </div>
          </FadeUp>

          {/* Scroll indicator */}
          <FadeUp delay={0.5}>
            <div className="mt-16 flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span className="text-xs font-semibold tracking-widest uppercase">{t('home.scroll')}</span>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </motion.div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 max-w-5xl mx-auto">
        <FadeUp>
          <h2 className="display-section text-center mb-4">{t('home.howTitle')}</h2>
        </FadeUp>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
          {features.map(f => (
            <StaggerItem key={f.key}>
              <motion.div
                className="card-hover p-7"
                whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(14,15,12,0.12)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: 'var(--brand-mint)' }}
                >
                  {f.emoji}
                </div>
                <h3 className="text-feature font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  {t(`home.${f.key}Title`)}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t(`home.${f.key}Desc`)}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* How it works steps */}
      <section
        className="px-4 py-20 mx-4 sm:mx-6 rounded-[40px] my-8"
        style={{ background: 'var(--surface)' }}
      >
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <h2 className="display-section text-center mb-12">
              {t('home.howTitle')}
            </h2>
          </FadeUp>
          <StaggerContainer className="space-y-6">
            {steps.map((step, i) => (
              <StaggerItem key={step}>
                <div className="flex gap-4 items-start">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5"
                    style={{ background: 'var(--brand-green)', color: '#163300' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-base font-semibold pt-1.5 leading-snug" style={{ color: 'var(--text)' }}>
                    {t(`home.${step}`)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <FadeUp>
          <h2
            className="text-center text-xl font-black mb-10 tracking-widest uppercase text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('home.statsTitle')}
          </h2>
        </FadeUp>
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <StaggerItem key={s}>
              <motion.div
                className="card text-center py-6"
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--brand-green)' }}
                >
                  <span className="text-xs font-black" style={{ color: '#163300' }}>{i + 1}</span>
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t(`home.${s}`)}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 text-center max-w-2xl mx-auto">
        <FadeUp>
          <h2 className="display-section mb-4">{t('home.ctaTitle')}</h2>
          <p className="text-lg font-semibold mb-8" style={{ color: 'var(--text-secondary)' }}>
            {t('home.ctaDesc')}
          </p>
          <motion.button
            className="btn-primary text-base px-10 py-4"
            onClick={() => navigate('/student')}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            {t('home.ctaStudent')}
          </motion.button>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          ChainAchieve · Built for The Bags Hackathon · Solana Devnet
        </p>
      </footer>
    </div>
  );
}
