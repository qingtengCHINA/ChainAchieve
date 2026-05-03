import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { SignMessage } from '../lib/walletAuth';

interface Props {
  teacherWallet: string;
  signMessage?: SignMessage;
  onComplete: () => void;
}

interface Step1Data {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  passcode: string;
}

interface TaskDraft { title: string; description: string; tokenReward: number; }

function isEmoji(str: string) {
  return /^\p{Emoji}/u.test(str.trim()) && str.trim().length <= 4;
}

export function CourseWizard({ teacherWallet, signMessage, onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Step1Data>({ name: '', symbol: '', description: '', imageUrl: '', passcode: '' });
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [newTask, setNewTask] = useState<TaskDraft>({ title: '', description: '', tokenReward: 100 });
  const [courseId, setCourseId] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [launchSignature, setLaunchSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.passcode && !/^[A-Za-z0-9]{8}$/.test(form.passcode)) {
      setError('Passcode must be exactly 8 alphanumeric characters.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const result = await api.createTokenInfo(
        {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          imageUrl: form.imageUrl,
          teacherWallet,
          passcode: form.passcode || undefined,
        },
        { wallet: teacherWallet, signMessage }
      );
      setCourseId(result.courseId);
      setMintAddress(result.tokenMint);
      if (result.launchSignature) setLaunchSignature(result.launchSignature);
      setStep(2);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function addTaskDraft() {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, newTask]);
    setNewTask({ title: '', description: '', tokenReward: 100 });
  }

  async function handleStep2Submit() {
    if (!courseId) return;
    setLoading(true); setError(null);
    try {
      for (const task of tasks) {
        await api.addTask(courseId, task, { wallet: teacherWallet, signMessage });
      }
      setStep(3);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === 3 && courseId && mintAddress) {
    const shareUrl = `${window.location.origin}/student?course=${courseId}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="card p-8 text-center"
        style={{ background: 'rgba(159,232,112,0.08)', borderColor: 'rgba(159,232,112,0.3)' }}
      >
        <div className="text-5xl mb-4">🚀</div>
        <h3 className="font-black text-2xl mb-2" style={{ color: 'var(--text)' }}>{t('wizard.tokenCreated')}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{t('wizard.launchHint')}</p>
        <div className="my-5 space-y-3 text-left">
          {/* Share link */}
          <div className="card p-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>课程分享链接</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs break-all flex-1" style={{ color: 'var(--text)' }}>{shareUrl}</p>
              <motion.button
                className="btn-secondary shrink-0"
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                whileTap={{ scale: 0.93 }}
              >
                复制
              </motion.button>
            </div>
          </div>
          {/* QR code */}
          <div className="card p-4 flex flex-col items-center gap-3">
            <p className="text-xs font-semibold self-start" style={{ color: 'var(--text-muted)' }}>课程二维码</p>
            <div style={{ background: '#fff', borderRadius: 12, padding: 12, display: 'inline-flex' }}>
              <QRCodeSVG value={shareUrl} size={140} fgColor="#163300" bgColor="#ffffff" />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>学生扫码即可直达课程</p>
          </div>
          {/* Mint address */}
          <div className="card p-4">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{t('wizard.mintAddress')}</p>
            <p className="font-mono text-sm break-all" style={{ color: 'var(--text)' }}>{mintAddress}</p>
          </div>
          {launchSignature && (
            <a
              href={`https://explorer.solana.com/tx/${launchSignature}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="card p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
              style={{ borderColor: 'rgba(159,232,112,0.4)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--brand-green)' }}>{t('wizard.tokenLaunched')}</p>
              <p className="font-mono text-xs truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>
                {launchSignature.slice(0, 20)}…
              </p>
            </a>
          )}
        </div>
        <motion.button
          className="btn-primary w-full justify-center"
          onClick={() => onComplete()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {t('wizard.viewCourses')}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex gap-2 mb-2">
        {([1, 2, 3] as const).map(n => (
          <motion.div
            key={n}
            className="h-1.5 flex-1 rounded-full overflow-hidden"
            style={{ background: 'var(--surface)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--brand-green)' }}
              initial={{ width: '0%' }}
              animate={{ width: step >= n ? '100%' : '0%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('wizard.step', { n: step })}</p>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step1"
            onSubmit={handleStep1Submit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <h2 className="font-black text-xl" style={{ color: 'var(--text)' }}>{t('wizard.courseInfo')}</h2>

            <div>
              <label htmlFor="cw-name" className="label">{t('wizard.courseName')}</label>
              <input
                id="cw-name"
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder={t('wizard.courseNamePh')}
              />
            </div>

            <div>
              <label htmlFor="cw-symbol" className="label">{t('wizard.symbol')}</label>
              <input
                id="cw-symbol"
                className="input"
                value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                required
                maxLength={10}
                placeholder={t('wizard.symbolPh')}
              />
            </div>

            <div>
              <label htmlFor="cw-desc" className="label">{t('wizard.description')}</label>
              <textarea
                id="cw-desc"
                className="input resize-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                rows={3}
                placeholder={t('wizard.descPh')}
              />
            </div>

            <div>
              <label htmlFor="cw-image" className="label">{t('wizard.imageLabel')}</label>
              <div className="flex gap-2 items-center">
                {form.imageUrl && isEmoji(form.imageUrl) && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: 'var(--surface)' }}
                  >
                    {form.imageUrl.trim()}
                  </div>
                )}
                <input
                  id="cw-image"
                  className="input flex-1"
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder={t('wizard.imagePh')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cw-passcode" className="label">{t('wizard.passcode')}</label>
              <input
                id="cw-passcode"
                className="input font-mono tracking-widest"
                value={form.passcode}
                onChange={e => setForm(f => ({ ...f, passcode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }))}
                maxLength={8}
                placeholder={t('wizard.passcodePh')}
              />
              {form.passcode && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('wizard.passcodeHint')}</p>
              )}
            </div>

            {error && (
              <div className="card p-3" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
              </div>
            )}

            <motion.button
              type="submit"
              className="btn-primary w-full py-3.5 text-base justify-center"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.03 }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
            >
              {loading ? t('wizard.creating') : t('wizard.next')}
            </motion.button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <h2 className="font-black text-xl" style={{ color: 'var(--text)' }}>{t('wizard.addTasks')}</h2>

            {tasks.length > 0 && (
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card flex items-center justify-between p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: 'var(--brand-green)', color: '#163300' }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{task.title}</span>
                    </div>
                    <span className="badge">{task.tokenReward} tokens</span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('wizard.newTask')}</p>
              <input
                placeholder={t('wizard.taskTitle')}
                className="input"
                value={newTask.title}
                onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
              />
              <textarea
                placeholder={t('wizard.taskDesc')}
                className="input resize-none"
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))}
              />
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label htmlFor="cw-reward" className="label">{t('wizard.tokenReward')}</label>
                  <input
                    id="cw-reward"
                    type="number"
                    min={1}
                    className="input"
                    value={newTask.tokenReward}
                    onChange={e => setNewTask(n => ({ ...n, tokenReward: Number(e.target.value) }))}
                  />
                </div>
                <motion.button
                  type="button"
                  className="btn-secondary mt-6 px-4 py-3"
                  onClick={addTaskDraft}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('wizard.addTask')}
                </motion.button>
              </div>
            </div>

            {error && (
              <div className="card p-3" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <motion.button
                type="button"
                className="btn-secondary flex-1 py-3"
                onClick={() => setStep(1)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {t('wizard.back')}
              </motion.button>
              <motion.button
                type="button"
                className="btn-primary flex-1 py-3 justify-center"
                onClick={handleStep2Submit}
                disabled={loading || tasks.length === 0}
                whileHover={{ scale: loading || tasks.length === 0 ? 1 : 1.03 }}
                whileTap={{ scale: loading || tasks.length === 0 ? 1 : 0.97 }}
              >
                {loading ? t('wizard.saving') : t('wizard.continue')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
