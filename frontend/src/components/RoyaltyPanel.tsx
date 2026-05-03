import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { api, FeePosition } from '../lib/api';

export function RoyaltyPanel() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [positions, setPositions] = useState<FeePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimSig, setClaimSig] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    api.getFeePositions(publicKey.toBase58())
      .then(setPositions)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [publicKey]);

  async function handleClaim(mint: string) {
    if (!publicKey) return;
    setClaiming(mint); setError(null); setClaimSig(null);
    try {
      const { transactions: txB64s } = await api.getClaimTxs(publicKey.toBase58(), mint);
      for (const b64 of txB64s) {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const tx = Transaction.from(bytes);
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, 'confirmed');
        setClaimSig(sig);
      }
      setPositions(prev => prev.filter(p => p.baseMint !== mint));
    } catch (err) {
      setError(String(err));
    } finally {
      setClaiming(null);
    }
  }

  if (!publicKey) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Connect your wallet to view royalties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Claimable Royalties
      </p>

      <AnimatePresence>
        {claimSig && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card p-4 flex items-center gap-3"
            style={{ background: 'rgba(159,232,112,0.10)', borderColor: 'rgba(159,232,112,0.3)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-green)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Claimed!</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{claimSig.slice(0, 24)}…</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-3"
            style={{ background: 'rgba(208,50,56,0.08)', borderColor: 'rgba(208,50,56,0.3)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#d03238' }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-20 rounded-[30px]" />)}
        </div>
      )}

      {!loading && positions.length === 0 && !error && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">💸</div>
          <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No claimable royalties at the moment.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Royalties accumulate as students trade achievement tokens.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {positions.map(pos => (
          <motion.div
            key={pos.baseMint}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center justify-between gap-4 p-5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate mb-1" style={{ color: 'var(--text-muted)' }}>
                {pos.baseMint}
              </p>
              <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>
                {pos.claimableDisplayAmount.toFixed(4)}
                <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--text-muted)' }}>tokens</span>
              </p>
            </div>
            <motion.button
              className="btn-primary shrink-0"
              onClick={() => handleClaim(pos.baseMint)}
              disabled={!!claiming}
              whileHover={{ scale: claiming ? 1 : 1.05 }}
              whileTap={{ scale: claiming ? 1 : 0.95 }}
            >
              {claiming === pos.baseMint ? 'Claiming…' : 'Claim'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
