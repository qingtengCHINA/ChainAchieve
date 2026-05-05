import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, CourseStats } from '../lib/api';
import { CourseWizard } from '../components/CourseWizard';
import { RoyaltyPanel } from '../components/RoyaltyPanel';
import { FadeUp, StaggerContainer, StaggerItem } from '../components/PageTransition';
import { WalletButton } from '../components/WalletButton';
import { createWalletAuthHeaders } from '../lib/walletAuth';

type Tab = 'create' | 'courses' | 'royalties';

interface TeacherCourse {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  hasPasscode: boolean;
  mintAddress: string | null;
  launchSignature: string | null;
  stats: CourseStats;
}

function isEmoji(str: string) {
  return /^\p{Emoji}/u.test((str ?? '').trim()) && (str ?? '').trim().length <= 4;
}

function CourseImage({ imageUrl, symbol }: { imageUrl: string; symbol: string }) {
  if (imageUrl && isEmoji(imageUrl)) {
    return (
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: 'var(--surface)' }}>
        {imageUrl.trim()}
      </div>
    );
  }
  if (imageUrl) {
    return <img src={imageUrl} alt={symbol} className="w-12 h-12 rounded-xl object-cover shrink-0" />;
  }
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0"
      style={{ background: 'var(--brand-green)', color: '#163300' }}>
      {symbol.slice(0, 2)}
    </div>
  );
}

function LaunchModal({ course, onClose, onSuccess }: {
  course: TeacherCourse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { publicKey, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLaunch() {
    if (!publicKey || !signMessage) return;
    setLoading(true); setError(null);
    try {
      const path = '/tokens/launch';
      const headers = await createWalletAuthHeaders(
        { wallet: publicKey.toBase58(), signMessage },
        'POST', `/api${path}`
      );
      await api.launchToken({ courseId: course.id, configKey: '', initialBuyLamports: 0 }, headers);
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card w-full max-w-md p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{t('teacher.launchToken')}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', lineHeight: 1, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} className="hover:opacity-70 transition-opacity text-xl">×</button>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{course.name}</p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {course.mintAddress?.slice(0, 20)}…
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('teacher.launchDesc')}</p>
        {error && (
          <div className="card p-3" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
            <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <motion.button className="btn-secondary flex-1 py-3" onClick={onClose} whileTap={{ scale: 0.97 }}>
            {t('common.cancel')}
          </motion.button>
          <motion.button
            className="btn-primary flex-1 py-3 justify-center"
            onClick={handleLaunch}
            disabled={loading}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? t('teacher.launching') : t('teacher.launchToken')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditModal({ course, wallet, signMessage, onClose, onSuccess }: {
  course: TeacherCourse;
  wallet: string;
  signMessage: ((msg: Uint8Array) => Promise<Uint8Array>) | undefined;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: course.name,
    description: course.description,
    imageUrl: course.imageUrl ?? '',
    passcode: '',
    clearPasscode: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!signMessage) return;
    if (form.passcode && !/^[A-Za-z0-9]{8}$/.test(form.passcode)) {
      setError(t('teacher.editModal.passcodeError'));
      return;
    }
    setLoading(true); setError(null);
    try {
      await api.updateCourse(
        course.id,
        {
          name: form.name,
          description: form.description,
          imageUrl: form.imageUrl,
          passcode: form.clearPasscode ? null : (form.passcode || undefined),
        },
        { wallet, signMessage }
      );
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card w-full max-w-md p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{t('teacher.editModal.title')}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', lineHeight: 1, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} className="hover:opacity-70 transition-opacity text-xl">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{t('teacher.editModal.courseName')}</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={32} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{t('teacher.editModal.courseDesc')}</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={200} rows={3} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{t('teacher.editModal.coverImage')}</label>
            <input style={inputStyle} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… 🎓" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
              {t('teacher.editModal.changePasscode')} {course.hasPasscode && <span style={{ color: 'var(--brand-green)' }}>{t('teacher.editModal.passcodeSet')}</span>}
            </label>
            <input
              style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em' }}
              value={form.passcode}
              onChange={e => setForm(f => ({ ...f, passcode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), clearPasscode: false }))}
              placeholder={t('teacher.editModal.passcodePh')}
              maxLength={8}
            />
            {course.hasPasscode && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.clearPasscode}
                  onChange={e => setForm(f => ({ ...f, clearPasscode: e.target.checked, passcode: '' }))}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('teacher.editModal.clearPasscode')}</span>
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="card p-3" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
            <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <motion.button className="btn-secondary flex-1 py-3" onClick={onClose} whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
          <motion.button
            className="btn-primary flex-1 py-3 justify-center"
            onClick={handleSave}
            disabled={loading}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? t('teacher.editModal.saving') : t('teacher.editModal.save')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteModal({ course, wallet, signMessage, onClose, onSuccess }: {
  course: TeacherCourse;
  wallet: string;
  signMessage: ((msg: Uint8Array) => Promise<Uint8Array>) | undefined;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!signMessage) return;
    setLoading(true); setError(null);
    try {
      await api.deleteCourse(course.id, { wallet, signMessage });
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card w-full max-w-sm p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="font-black text-lg mb-2" style={{ color: 'var(--text)' }}>{t('teacher.deleteModal.title')}</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('teacher.deleteModal.body', { name: course.name })}
            {' '}<span style={{ color: '#d03238' }}>{t('teacher.deleteModal.cannotUndo')}</span>
          </p>
        </div>
        {error && (
          <div className="card p-3" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
            <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <motion.button className="btn-secondary flex-1 py-3" onClick={onClose} whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
          <motion.button
            className="flex-1 py-3 font-bold rounded-2xl justify-center"
            style={{ background: 'rgba(208,50,56,0.15)', color: '#d03238', border: '1.5px solid rgba(208,50,56,0.3)' }}
            onClick={handleDelete}
            disabled={loading}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? t('teacher.deleteModal.deleting') : t('teacher.deleteModal.confirmDelete')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareModal({ course, onClose }: { course: TeacherCourse; onClose: () => void }) {
  const { t } = useTranslation();
  const shareUrl = `${window.location.origin}/student?course=${course.id}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card w-full max-w-sm p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{t('teacher.shareModal.title')}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', lineHeight: 1, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} className="hover:opacity-70 transition-opacity text-xl">×</button>
        </div>

        <div className="card p-4 flex flex-col items-center gap-3">
          <div style={{ background: '#fff', borderRadius: 12, padding: 12, display: 'inline-flex' }}>
            <QRCodeSVG value={shareUrl} size={160} fgColor="#163300" bgColor="#ffffff" />
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{t('teacher.shareModal.qrHint')}</p>
        </div>

        <div className="card p-3">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{t('teacher.shareModal.linkLabel')}</p>
          <p className="font-mono text-xs break-all mb-3" style={{ color: 'var(--text)' }}>{shareUrl}</p>
          <motion.button
            className="btn-primary w-full justify-center"
            onClick={copy}
            whileTap={{ scale: 0.97 }}
          >
            {copied ? t('teacher.shareModal.copied') : t('teacher.shareModal.copy')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TeacherPage() {
  const { publicKey, signMessage } = useWallet();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('create');
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [launchingCourse, setLaunchingCourse] = useState<TeacherCourse | null>(null);
  const [editingCourse, setEditingCourse] = useState<TeacherCourse | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<TeacherCourse | null>(null);
  const [sharingCourse, setSharingCourse] = useState<TeacherCourse | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  function fetchCourses() {
    if (!publicKey) return;
    setLoadingCourses(true);
    setCoursesError(null);
    api.getTeacherCourses(publicKey.toBase58())
      .then(data => setCourses(data as TeacherCourse[]))
      .catch(err => setCoursesError(String(err)))
      .finally(() => setLoadingCourses(false));
  }

  useEffect(() => {
    if (tab === 'courses' && publicKey) fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, publicKey]);

  if (!publicKey) {
    return (
      <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70dvh] text-center">
        <FadeUp>
          <div className="card max-w-sm mx-auto p-10">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="font-black text-xl mb-3" style={{ color: 'var(--text)' }}>
              {t('teacher.title')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('teacher.connectPrompt')}
            </p>
            <WalletButton />
          </div>
        </FadeUp>
      </div>
    );
  }

  const wallet = publicKey.toBase58();

  return (
    <div className="page-container pt-20">
      <AnimatePresence>
        {launchingCourse && (
          <LaunchModal
            key="launch-modal"
            course={launchingCourse}
            onClose={() => setLaunchingCourse(null)}
            onSuccess={() => { setLaunchingCourse(null); fetchCourses(); }}
          />
        )}
        {editingCourse && (
          <EditModal
            key="edit-modal"
            course={editingCourse}
            wallet={wallet}
            signMessage={signMessage}
            onClose={() => setEditingCourse(null)}
            onSuccess={() => { setEditingCourse(null); fetchCourses(); }}
          />
        )}
        {deletingCourse && (
          <DeleteModal
            key="delete-modal"
            course={deletingCourse}
            wallet={wallet}
            signMessage={signMessage}
            onClose={() => setDeletingCourse(null)}
            onSuccess={() => { setDeletingCourse(null); fetchCourses(); }}
          />
        )}
        {sharingCourse && (
          <ShareModal
            key="share-modal"
            course={sharingCourse}
            onClose={() => setSharingCourse(null)}
          />
        )}
      </AnimatePresence>

      <FadeUp>
        <h1 className="display-section mb-6 mt-4">{t('teacher.title')}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="tab-group mb-6">
          {(['create', 'courses', 'royalties'] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`tab ${tab === tabKey ? 'active' : ''}`}>
              {t(`teacher.tabs.${tabKey}`)}
            </button>
          ))}
        </div>
      </FadeUp>

      <AnimatePresence mode="wait">
        {tab === 'create' && (
          <motion.div key="create"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <CourseWizard
              teacherWallet={publicKey.toBase58()}
              signMessage={signMessage}
              onComplete={() => {
                fetchCourses();
                setTab('courses');
              }}
            />
          </motion.div>
        )}

        {tab === 'courses' && (
          <motion.div key="courses"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>

            {loadingCourses && (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="skeleton h-36 rounded-[30px]" />)}
              </div>
            )}

            {coursesError && (
              <div className="card p-4" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{coursesError}</p>
                <button className="text-xs mt-2 underline" style={{ color: 'var(--text-muted)' }} onClick={fetchCourses}>{t('teacher.retryBtn')}</button>
              </div>
            )}

            {!loadingCourses && !coursesError && courses.length === 0 && (
              <div className="card text-center py-12">
                <div className="text-4xl mb-3">🎓</div>
                <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>{t('teacher.noCourses')}</p>
              </div>
            )}

            <StaggerContainer className="space-y-4">
              {courses.map(c => (
                <StaggerItem key={c.id}>
                  <div className="card p-5">
                    <div className="flex items-start gap-4 mb-4">
                      <CourseImage imageUrl={c.imageUrl} symbol={c.symbol} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-base" style={{ color: 'var(--text)' }}>{c.name}</p>
                          {c.hasPasscode && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'rgba(255,192,145,0.15)', color: '#ffc091' }}>
                              {t('teacher.privateLabel')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold tracking-wider" style={{ color: 'var(--brand-green)' }}>{c.symbol}</p>
                        {c.launchSignature ? (
                          <a href={`https://explorer.solana.com/tx/${c.launchSignature}?cluster=mainnet-beta`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold mt-1 inline-flex items-center gap-1"
                            style={{ color: 'var(--text-muted)' }}>
                            {t('teacher.launched')}
                          </a>
                        ) : (
                          <button
                            onClick={() => setLaunchingCourse(c)}
                            className="text-xs font-semibold mt-1 inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                            style={{ color: '#ffc091' }}
                          >
                            ⚠ {t('teacher.pendingLaunch')} — {t('teacher.launchToken')} →
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        <motion.button
                          onClick={() => setSharingCourse(c)}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700 }}
                          whileTap={{ scale: 0.93 }}
                        >
                          {t('teacher.shareBtn')}
                        </motion.button>
                        <motion.button
                          onClick={() => setEditingCourse(c)}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700 }}
                          whileTap={{ scale: 0.93 }}
                        >
                          {t('teacher.editBtn')}
                        </motion.button>
                        <motion.button
                          onClick={() => setDeletingCourse(c)}
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(208,50,56,0.1)', color: '#d03238', border: '1.5px solid rgba(208,50,56,0.25)', borderRadius: 10, cursor: 'pointer' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          {t('teacher.deleteBtn')}
                        </motion.button>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { key: 'students', val: c.stats.studentCount },
                        { key: 'tasks', val: c.stats.totalTasks },
                        { key: 'completions', val: c.stats.totalCompletions },
                        { key: 'earned', val: c.stats.earnedStudents },
                      ] as const).map(({ key, val }) => (
                        <div key={key} className="rounded-2xl p-3 text-center"
                          style={{ background: 'var(--bg)' }}>
                          <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{val}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                            style={{ color: 'var(--text-muted)' }}>
                            {t(`teacher.stats.${key}`)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Mint address */}
                    {c.mintAddress && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                          style={{ color: 'var(--text-muted)' }}>
                          {t('teacher.mint')}
                        </p>
                        <p className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {c.mintAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.div>
        )}

        {tab === 'royalties' && (
          <motion.div key="royalties"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <RoyaltyPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
