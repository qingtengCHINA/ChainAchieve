import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, Course, Task } from '../lib/api';
import { TaskList } from '../components/TaskList';
import { AchievementGrid } from '../components/AchievementGrid';
import { LeaderboardTab } from '../components/LeaderboardTab';
import { FadeUp, StaggerContainer, StaggerItem } from '../components/PageTransition';
import { WalletButton } from '../components/WalletButton';

type Tab = 'courses' | 'achievements' | 'leaderboard';

function isEmoji(str: string) {
  return /^\p{Emoji}/u.test((str ?? '').trim()) && (str ?? '').trim().length <= 4;
}

function CourseThumb({ imageUrl, symbol, size = 56 }: { imageUrl: string; symbol: string; size?: number }) {
  const s: React.CSSProperties = { width: size, height: size, borderRadius: 12, flexShrink: 0 };
  if (imageUrl && isEmoji(imageUrl)) {
    return (
      <div style={{ ...s, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45 }}>
        {imageUrl.trim()}
      </div>
    );
  }
  if (imageUrl) return <img src={imageUrl} alt={symbol} style={{ ...s, objectFit: 'cover' }} />;
  return (
    <div style={{ ...s, background: 'var(--brand-green)', color: '#163300', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
      {symbol.slice(0, 2)}
    </div>
  );
}

function PasscodeModal({ course, onSubmit, onClose }: {
  course: Course;
  onSubmit: (passcode: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true); setError(false);
    const ok = await onSubmit(value.trim().toUpperCase());
    if (!ok) { setError(true); setLoading(false); }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="card w-full max-w-sm p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="text-center">
          <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{course.name}</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('student.passcodeRequired')}</p>
        </div>
        <div>
          <label className="label">{t('student.passcodeLabel')}</label>
          <input
            className={`input font-mono tracking-widest text-center text-lg ${error ? 'border-red-500' : ''}`}
            value={value}
            onChange={e => { setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setError(false); }}
            placeholder={t('student.passcodePlaceholder')}
            maxLength={8}
            autoFocus
          />
          {error && <p className="text-xs mt-1 text-red-500">{t('student.passcodeError')}</p>}
        </div>
        <motion.button
          type="submit"
          className="btn-primary w-full py-3 justify-center"
          disabled={loading || !value.trim()}
          whileTap={{ scale: loading ? 1 : 0.97 }}
        >
          {loading ? '…' : t('student.passcodeSubmit')}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}

function isWalletAddress(q: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
}

export default function StudentPage() {
  const { publicKey } = useWallet();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [passcodeTarget, setPasscodeTarget] = useState<Course | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenDone = useRef(false);

  useEffect(() => {
    api.getCourses().then(data => {
      setCourses(data);
      setFilteredCourses(data);
      // Auto-open course from share link ?course=<id>
      const courseParam = searchParams.get('course');
      if (courseParam && !autoOpenDone.current) {
        autoOpenDone.current = true;
        const target = data.find(c => c.id === courseParam);
        if (target) {
          setSearchParams({}, { replace: true });
          if (target.hasPasscode) setPasscodeTarget(target);
          else loadCourseTasks(target);
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setCompletedTaskIds(new Set());
      setCompletedCourseIds(new Set());
      return;
    }
    api.getStudentCompletions(publicKey.toBase58()).then(completions => {
      setCompletedTaskIds(new Set(completions.map(c => c.taskId)));
      if (completions.length === 0) setCompletedCourseIds(new Set());
    }).catch(() => {});
  }, [publicKey]);

  const completedCount = completedTaskIds.size;
  useEffect(() => {
    if (completedCount === 0 || courses.length === 0) return;
    let mounted = true;
    const earned = new Set<string>();
    Promise.all(courses.map(course =>
      api.getCourseTasks(course.id).then(courseTasks => {
        if (courseTasks.length > 0 && courseTasks.every(t => completedTaskIds.has(t.id))) {
          earned.add(course.id);
        }
      }).catch(() => {})
    )).then(() => { if (mounted) setCompletedCourseIds(new Set(earned)); });
    return () => { mounted = false; };
  // completedTaskIds identity is stable from the Set reference; using completedCount as proxy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount, courses]);

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setFilteredCourses(courses); return; }
    searchTimer.current = setTimeout(() => {
      if (isWalletAddress(q.trim())) {
        // Wallet address: hit backend to filter by teacher_wallet
        api.getCourses(q.trim()).then(data => setFilteredCourses(data)).catch(() => {});
      } else {
        const lower = q.toLowerCase();
        setFilteredCourses(courses.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          c.symbol.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower)
        ));
      }
    }, 300);
  }

  async function loadCourseTasks(course: Course, passcode?: string) {
    setSelectedCourse(course);
    setLoading(true);
    setError(null);
    try {
      setTasks(await api.getCourseTasks(course.id, passcode));
      return true;
    } catch (err) {
      const msg = String(err);
      if (msg.includes('passcode') || msg.includes('403')) {
        setSelectedCourse(null);
        return false;
      }
      setError(msg);
      return true;
    } finally {
      setLoading(false);
    }
  }

  function handleCourseClick(course: Course) {
    if (course.hasPasscode) {
      setPasscodeTarget(course);
    } else {
      loadCourseTasks(course);
    }
  }

  async function handlePasscodeSubmit(passcode: string): Promise<boolean> {
    if (!passcodeTarget) return false;
    const ok = await loadCourseTasks(passcodeTarget, passcode);
    if (ok) setPasscodeTarget(null);
    return ok;
  }

  return (
    <div className="page-container pt-20">
      <AnimatePresence>
        {passcodeTarget && (
          <PasscodeModal
            key="passcode-modal"
            course={passcodeTarget}
            onSubmit={handlePasscodeSubmit}
            onClose={() => setPasscodeTarget(null)}
          />
        )}
      </AnimatePresence>

      <FadeUp>
        <h1 className="display-section mb-6 mt-4">{t('student.title')}</h1>
      </FadeUp>

      {/* Tabs */}
      <FadeUp delay={0.05}>
        <div className="tab-group mb-6">
          {(['courses', 'achievements', 'leaderboard'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setSelectedCourse(null); }}
              className={`tab ${tab === tabKey ? 'active' : ''}`}
            >
              {t(`student.tabs.${tabKey === 'courses' ? 'browse' : tabKey}`)}
            </button>
          ))}
        </div>
      </FadeUp>

      <AnimatePresence mode="wait">
        {tab === 'achievements' && (
          <motion.div key="achievements"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <AchievementGrid courses={courses} completedCourseIds={completedCourseIds} />
          </motion.div>
        )}

        {tab === 'leaderboard' && (
          <motion.div key="leaderboard"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <LeaderboardTab currentWallet={publicKey?.toBase58()} />
          </motion.div>
        )}

        {tab === 'courses' && !selectedCourse && (
          <motion.div key="course-list"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input pl-10"
                placeholder={t('student.search')}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>

            {filteredCourses.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-4xl mb-3">{searchQuery ? '🔍' : '📚'}</p>
                <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {searchQuery ? t('student.noResults', { q: searchQuery }) : t('student.empty')}
                </p>
              </div>
            ) : (
              <StaggerContainer className="space-y-3">
                {filteredCourses.map(course => {
                  const done = completedCourseIds.has(course.id);
                  return (
                    <StaggerItem key={course.id}>
                      <motion.div
                        onClick={() => handleCourseClick(course)}
                        className="card-hover flex items-center gap-4 p-4"
                        whileTap={{ scale: 0.98 }}
                      >
                        <CourseThumb imageUrl={course.imageUrl} symbol={course.symbol} size={52} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[15px] leading-tight" style={{ color: 'var(--text)' }}>
                              {course.name}
                            </p>
                            {course.hasPasscode && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(255,192,145,0.12)', color: '#ffc091' }}>私密</span>
                            )}
                            {done && <span className="badge text-[10px] px-2 py-0.5">✓ Done</span>}
                          </div>
                          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                            {course.description}
                          </p>
                        </div>
                        <span className="text-xs font-black shrink-0 tracking-wider"
                          style={{ color: 'var(--brand-green)' }}>{course.symbol}</span>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </motion.div>
        )}

        {tab === 'courses' && selectedCourse && (
          <motion.div key="course-detail"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>

            <motion.button onClick={() => setSelectedCourse(null)}
              className="btn-ghost mb-5 -ml-2" whileTap={{ scale: 0.95 }}>
              ← {t('student.back')}
            </motion.button>

            <div className="card mb-5 p-5">
              <div className="flex items-start gap-4">
                <CourseThumb imageUrl={selectedCourse.imageUrl} symbol={selectedCourse.symbol} size={56} />
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-xl leading-tight mb-1" style={{ color: 'var(--text)' }}>
                    {selectedCourse.name}
                  </h2>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {selectedCourse.description}
                  </p>
                  {selectedCourse.launchSignature && (
                    <a
                      href={`https://explorer.solana.com/tx/${selectedCourse.launchSignature}?cluster=mainnet-beta`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold mt-2"
                      style={{ color: 'var(--brand-green)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      View on Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            {!publicKey && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="card mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                style={{ background: 'rgba(159,232,112,0.08)', borderColor: 'rgba(159,232,112,0.3)' }}>
                <p className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>
                  {t('student.connectToComplete')}
                </p>
                <WalletButton />
              </motion.div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
              </div>
            )}
            {error && (
              <div className="card" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
              </div>
            )}
            {!loading && (
              <TaskList
                tasks={tasks}
                studentWallet={publicKey?.toBase58() ?? ''}
                completedTaskIds={completedTaskIds}
                onComplete={taskId => setCompletedTaskIds(prev => new Set([...prev, taskId]))}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
