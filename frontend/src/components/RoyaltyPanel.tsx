import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
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
    return <p className="text-sm text-gray-500">Connect your wallet to view royalties.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800">Claimable Royalties</h3>

      {loading && <p className="text-sm text-gray-400">Fetching positions…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {claimSig && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          Claimed! Tx: <span className="font-mono text-xs">{claimSig.slice(0, 20)}…</span>
        </div>
      )}

      {!loading && positions.length === 0 && (
        <p className="text-sm text-gray-400">No claimable royalties at the moment.</p>
      )}

      {positions.map(pos => (
        <div key={pos.baseMint} className="border rounded-xl p-4 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-mono text-gray-500 truncate w-48">{pos.baseMint}</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">
              {pos.claimableDisplayAmount.toFixed(4)} <span className="text-sm font-normal text-gray-500">tokens</span>
            </p>
          </div>
          <button
            onClick={() => handleClaim(pos.baseMint)}
            disabled={!!claiming}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {claiming === pos.baseMint ? 'Claiming…' : 'Claim'}
          </button>
        </div>
      ))}
    </div>
  );
}
