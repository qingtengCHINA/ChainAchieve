import { Component, type ReactNode, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, ResumeData, ProfileData } from '../lib/api';
import { FadeUp, StaggerContainer, StaggerItem } from '../components/PageTransition';
import { WalletButton } from '../components/WalletButton';

const Lanyard = lazy(() => import('../components/Lanyard'));

class LanyardErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.warn('[Lanyard]', err.message); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function truncateWallet(addr: string): string {
  if (addr.length < 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function initials(name?: string, wallet?: string): string {
  if (name && name.trim()) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  if (wallet) return wallet.slice(0, 2).toUpperCase();
  return '??';
}

// ── Profile edit form ──────────────────────────────────────────────────────

interface ProfileFormProps {
  initial: ProfileData;
  onSave: (data: ProfileData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function ProfileForm({ initial, onSave, onCancel, saving }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileData>(initial);

  function set(key: keyof ProfileData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: 4,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Avatar Emoji</label>
          <input
            style={inputStyle}
            value={form.avatarEmoji ?? ''}
            onChange={set('avatarEmoji')}
            placeholder="🎓"
            maxLength={8}
          />
        </div>
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            style={inputStyle}
            value={form.displayName ?? ''}
            onChange={set('displayName')}
            placeholder="Satoshi"
            maxLength={50}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Title / Role</label>
        <input
          style={inputStyle}
          value={form.title ?? ''}
          onChange={set('title')}
          placeholder="Web3 Developer & Lifelong Learner"
          maxLength={100}
        />
      </div>
      <div>
        <label style={labelStyle}>Bio</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
          value={form.bio ?? ''}
          onChange={set('bio')}
          placeholder="A short bio about yourself…"
          maxLength={300}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label style={labelStyle}>Twitter</label>
          <input
            style={inputStyle}
            value={form.twitter ?? ''}
            onChange={set('twitter')}
            placeholder="@handle"
            maxLength={50}
          />
        </div>
        <div>
          <label style={labelStyle}>GitHub</label>
          <input
            style={inputStyle}
            value={form.github ?? ''}
            onChange={set('github')}
            placeholder="username"
            maxLength={50}
          />
        </div>
        <div>
          <label style={labelStyle}>Website</label>
          <input
            style={inputStyle}
            value={form.website ?? ''}
            onChange={set('website')}
            placeholder="https://…"
            maxLength={200}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <motion.button
          type="submit"
          className="btn-primary mt-0"
          disabled={saving}
          whileHover={{ scale: saving ? 1 : 1.03 }}
          whileTap={{ scale: saving ? 1 : 0.97 }}
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </motion.button>
        <motion.button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Cancel
        </motion.button>
      </div>
    </form>
  );
}

// ── Profile display ────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: ProfileData;
  canEdit: boolean;
  onEdit: () => void;
}

function ProfileCard({ profile, canEdit, onEdit }: ProfileCardProps) {
  const hasAvatar = !!profile.avatarEmoji;
  const hasName = !!profile.displayName;

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: hasAvatar ? 'transparent' : 'var(--surface)',
          border: '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: hasAvatar ? 38 : 22,
          fontWeight: 700,
          color: 'var(--brand-green)',
          flexShrink: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {hasAvatar ? profile.avatarEmoji : initials(profile.displayName, profile.wallet)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2
            className="font-black text-lg leading-tight"
            style={{ color: 'var(--text)' }}
          >
            {hasName ? profile.displayName : truncateWallet(profile.wallet)}
          </h2>
          {canEdit && (
            <motion.button
              onClick={onEdit}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 8,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Edit
            </motion.button>
          )}
        </div>

        {profile.title && (
          <p className="text-sm mt-0.5 font-semibold" style={{ color: 'var(--brand-green)' }}>
            {profile.title}
          </p>
        )}

        {profile.bio && (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {(profile.twitter || profile.github || profile.website) && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {profile.twitter.startsWith('@') ? profile.twitter : `@${profile.twitter}`}
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {profile.github}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ResumePage() {
  const { publicKey, signMessage } = useWallet();
  const { t } = useTranslation();

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const walletAddr = publicKey?.toBase58() ?? '';

  useEffect(() => {
    if (!publicKey) return;
    const addr = publicKey.toBase58();

    setLoadingResume(true);
    api.getResume(addr)
      .then(setResume)
      .catch(err => setError(String(err)))
      .finally(() => setLoadingResume(false));

    setLoadingProfile(true);
    api.getProfile(addr)
      .then(data => setProfile({ ...data, wallet: addr }))
      .catch(() => setProfile({ wallet: addr }))
      .finally(() => setLoadingProfile(false));
  }, [publicKey]);

  const handleSaveProfile = useCallback(async (data: ProfileData) => {
    if (!signMessage) {
      setSaveError('Wallet does not support message signing.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.upsertProfile(data, { wallet: walletAddr, signMessage });
      setProfile(data);
      setEditing(false);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }, [signMessage, walletAddr]);

  function downloadJson() {
    if (!resume) return;
    const blob = new Blob([JSON.stringify({ profile, resume }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainachieve-resume-${resume.wallet.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareToTwitter() {
    if (!resume) return;
    const count = resume.achievements.length;
    const nameTag = profile?.displayName ? `${profile.displayName} has` : "I've";
    const text = `${nameTag} earned ${count} on-chain achievement${count !== 1 ? 's' : ''} on ChainAchieve! 🏆 Building a verifiable Web3 learning resume on Solana. #ChainAchieve #Solana #Web3Education`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  const achievementCount = resume?.achievements.length ?? 0;

  // ── Not connected ────────────────────────────────────────────────────────

  if (!publicKey) {
    return (
      <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70dvh] text-center">
        <FadeUp>
          <div className="card max-w-sm mx-auto p-10">
            <div className="text-5xl mb-4">📜</div>
            <h2 className="font-black text-xl mb-3" style={{ color: 'var(--text)' }}>
              {t('resume.title')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('resume.connectPrompt')}
            </p>
            <WalletButton />
          </div>
        </FadeUp>
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────────

  return (
    <div className="page-container pt-20" style={{ maxWidth: 1080 }}>
      <div className="flex gap-6 items-start">

        {/* ── Left column (main) ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Page header */}
          <FadeUp>
            <div className="flex items-start justify-between gap-4 mt-4 mb-6 flex-wrap">
              <h1 className="display-section">{t('resume.title')}</h1>
              {resume && resume.achievements.length > 0 && (
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <motion.button
                    className="btn-secondary"
                    onClick={shareToTwitter}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share
                  </motion.button>
                  <motion.button
                    className="btn-primary mt-0"
                    onClick={downloadJson}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('resume.export')}
                  </motion.button>
                </div>
              )}
            </div>
          </FadeUp>

          {/* ── Profile card ──────────────────────────────────────────────── */}
          <FadeUp delay={0.04}>
            <div className="card mb-6">
              {loadingProfile ? (
                <div className="skeleton h-16 rounded-xl" />
              ) : (
                <AnimatePresence mode="wait">
                  {editing ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p
                        className="text-xs font-bold uppercase mb-3"
                        style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
                      >
                        Edit Profile
                      </p>
                      {saveError && (
                        <div
                          className="mb-3 p-3 rounded-xl text-sm font-semibold"
                          style={{ background: 'rgba(208,50,56,0.1)', color: '#d03238', border: '1px solid rgba(208,50,56,0.25)' }}
                        >
                          {saveError}
                        </div>
                      )}
                      <ProfileForm
                        initial={profile ?? { wallet: walletAddr }}
                        onSave={handleSaveProfile}
                        onCancel={() => { setEditing(false); setSaveError(null); }}
                        saving={saving}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      {profile ? (
                        <ProfileCard
                          profile={profile}
                          canEdit={!!signMessage}
                          onEdit={() => setEditing(true)}
                        />
                      ) : (
                        /* fallback: just wallet address */
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                            {t('resume.wallet')}
                          </p>
                          <p className="font-mono text-sm font-bold break-all" style={{ color: 'var(--text)' }}>
                            {walletAddr}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </FadeUp>

          {/* ── Loading skeletons ─────────────────────────────────────────── */}
          {loadingResume && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-24 rounded-[30px]" />
              ))}
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="card" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
              <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
            </div>
          )}

          {/* ── Achievements timeline ─────────────────────────────────────── */}
          {resume && (
            <div>
              {resume.achievements.length === 0 ? (
                <FadeUp>
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-3">🌱</div>
                    <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {t('resume.empty')}
                    </p>
                  </div>
                </FadeUp>
              ) : (
                <>
                  <FadeUp>
                    <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-muted)' }}>
                      {t('resume.achievements', { count: resume.achievements.length })}
                    </p>
                  </FadeUp>

                  <StaggerContainer className="relative">
                    {/* Timeline line */}
                    <div
                      className="absolute left-[22px] top-0 bottom-0 w-px"
                      style={{ background: 'var(--border)' }}
                    />
                    <div className="space-y-4 pl-12">
                      {resume.achievements.map((a, i) => (
                        <StaggerItem key={i}>
                          <div className="relative">
                            {/* Timeline dot */}
                            <div
                              className="absolute -left-[34px] top-4 w-3 h-3 rounded-full border-2 z-10"
                              style={{
                                background: 'var(--brand-green)',
                                borderColor: 'var(--bg)',
                              }}
                            />
                            <motion.div
                              className="card p-5"
                              whileHover={{ x: 4 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-bold text-[15px] leading-tight" style={{ color: 'var(--text)' }}>
                                  {a.taskTitle}
                                </p>
                                <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                                  {new Date(a.completedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="badge text-[11px]">{a.courseName}</span>
                              {a.txSignature && (
                                <a
                                  href={`https://explorer.solana.com/tx/${a.txSignature}?cluster=mainnet-beta`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono mt-2 truncate block hover:underline"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {t('resume.tx')} {a.txSignature.slice(0, 20)}…
                                </a>
                              )}
                            </motion.div>
                          </div>
                        </StaggerItem>
                      ))}
                    </div>
                  </StaggerContainer>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right column (Lanyard 3D card, desktop only) ─────────────── */}
        <div className="hidden md:block w-72 shrink-0 sticky top-20">
          <LanyardErrorBoundary fallback={
            <div style={{ width: 288, height: 200, borderRadius: 20, background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
              <div style={{ fontSize: 48 }}>{profile?.avatarEmoji ?? '🪪'}</div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>{profile?.displayName ?? truncateWallet(walletAddr)}</p>
              {profile?.title && <p style={{ fontSize: 11, color: 'var(--brand-green)', textAlign: 'center' }}>{profile.title}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{walletAddr.slice(0, 8)}…{walletAddr.slice(-4)}</p>
            </div>
          }>
            <Suspense fallback={
              <div style={{ width: 288, height: 420, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-4xl">🪪</div>
              </div>
            }>
              <Lanyard
                position={[0, 0, 26]}
                gravity={[0, -40, 0]}
                fov={20}
                transparent
                displayName={profile?.displayName}
                title={profile?.title}
                avatarEmoji={profile?.avatarEmoji}
                wallet={walletAddr}
                achievementCount={achievementCount}
              />
            </Suspense>
          </LanyardErrorBoundary>
        </div>
      </div>
    </div>
  );
}
