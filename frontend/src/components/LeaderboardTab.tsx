import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, LeaderboardEntry } from '../lib/api';
import { StaggerContainer, StaggerItem } from './PageTransition';

interface Props {
  currentWallet?: string;
}

function short(wallet: string) {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function LeaderboardTab({ currentWallet }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard(20)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myRank = currentWallet
    ? entries.findIndex(e => e.studentWallet === currentWallet) + 1
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {t('leaderboard.title')}
        </p>
        {myRank > 0 && (
          <span className="badge">
            {t('leaderboard.you')} #{myRank}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-[30px]" />)}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🏁</div>
          <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>{t('leaderboard.empty')}</p>
        </div>
      )}

      <StaggerContainer className="space-y-2">
        {entries.map((entry, i) => {
          const isMe = currentWallet && entry.studentWallet === currentWallet;
          const medal = i < 3 ? medalColors[i] : null;
          return (
            <StaggerItem key={entry.studentWallet}>
              <motion.div
                className="card flex items-center gap-4 p-4"
                style={{
                  background: isMe ? 'rgba(159,232,112,0.08)' : 'var(--surface)',
                  borderColor: isMe ? 'rgba(159,232,112,0.35)' : 'var(--border)',
                }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {/* Rank */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: medal ?? 'var(--bg)',
                    color: medal ? '#0e0f0c' : 'var(--text-muted)',
                    border: medal ? 'none' : '2px solid var(--border)',
                    boxShadow: medal ? `0 0 12px ${medal}60` : 'none',
                  }}
                >
                  {medal ? ['🥇','🥈','🥉'][i] : i + 1}
                </div>

                {/* Wallet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold" style={{ color: 'var(--text)' }}>
                      {short(entry.studentWallet)}
                    </p>
                    {isMe && <span className="badge text-[10px] px-2">{t('leaderboard.you')}</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {entry.courseCount} {t('leaderboard.courses').toLowerCase()}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-black" style={{ color: isMe ? 'var(--brand-green)' : 'var(--text)' }}>
                    {entry.completionCount}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {t('leaderboard.tasks')}
                  </p>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}
