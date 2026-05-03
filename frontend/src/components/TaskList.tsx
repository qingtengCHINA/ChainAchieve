import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, Task } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface Props {
  tasks: Task[];
  studentWallet: string;
  completedTaskIds: Set<string>;
  onComplete: (taskId: string) => void;
}

export function TaskList({ tasks, studentWallet, completedTaskIds, onComplete }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(taskId: string) {
    if (!studentWallet) return;
    setLoading(taskId); setError(null);
    try {
      const result = await api.completeTask(taskId, studentWallet);
      onComplete(taskId);
      toast.success(t('student.taskDone', { reward: result.tokenReward }));
    } catch (err) {
      const msg = String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  const doneCount = tasks.filter(t => completedTaskIds.has(t.id)).length;

  if (tasks.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress summary */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Tasks
        </p>
        <span className="badge">
          {doneCount}/{tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--surface)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--brand-green)' }}
          initial={{ width: 0 }}
          animate={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {error && (
        <div className="card p-3 mb-2" style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}>
          <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
        </div>
      )}

      <AnimatePresence>
        {tasks.map((task, i) => {
          const done = completedTaskIds.has(task.id);
          const isLoading = loading === task.id;
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="card flex items-center gap-4 p-4"
              style={{
                background: done ? 'rgba(159,232,112,0.07)' : 'var(--surface)',
                borderColor: done ? 'rgba(159,232,112,0.3)' : 'var(--border)',
              }}
            >
              {/* Status circle */}
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: done ? 'var(--brand-green)' : 'var(--bg)',
                  border: done ? 'none' : '2px solid var(--border)',
                }}
                animate={{ scale: done ? [1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {done && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </motion.div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${done ? 'line-through' : ''}`}
                  style={{ color: done ? 'var(--text-muted)' : 'var(--text)' }}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="badge">{task.tokenReward}</span>
                {!done && (
                  <motion.button
                    onClick={() => handleComplete(task.id)}
                    disabled={isLoading || !studentWallet}
                    className="btn-primary py-1.5 px-3 text-xs"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    {isLoading ? '…' : 'Complete'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {doneCount === tasks.length && tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-6 mt-2"
          style={{ background: 'rgba(159,232,112,0.10)', borderColor: 'rgba(159,232,112,0.4)' }}
        >
          <div className="text-3xl mb-2">🏆</div>
          <p className="font-black text-base" style={{ color: 'var(--brand-dark-green)' }}>All tasks complete!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Achievement token earned</p>
        </motion.div>
      )}
    </div>
  );
}
