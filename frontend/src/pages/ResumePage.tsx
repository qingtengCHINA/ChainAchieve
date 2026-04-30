import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api, ResumeData } from '../lib/api';

export default function ResumePage() {
  const { publicKey } = useWallet();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    api.getResume(publicKey.toBase58())
      .then(setResume)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [publicKey]);

  function downloadJson() {
    if (!resume) return;
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainachieve-resume-${resume.wallet.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!publicKey) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Connect your wallet to view your on-chain resume.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My On-Chain Resume</h1>
        {resume && resume.achievements.length > 0 && (
          <button
            onClick={downloadJson}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Export JSON
          </button>
        )}
      </div>

      <div className="mb-6 bg-gray-50 rounded-xl border px-4 py-3">
        <p className="text-xs text-gray-500 mb-0.5">Wallet</p>
        <p className="font-mono text-sm text-gray-800 break-all">{publicKey.toBase58()}</p>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading achievements…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {resume && (
        <div className="space-y-3">
          {resume.achievements.length === 0 ? (
            <p className="text-gray-400 text-sm">No achievements yet. Complete tasks to build your on-chain resume.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">{resume.achievements.length} achievement{resume.achievements.length !== 1 ? 's' : ''}</p>
              {resume.achievements.map((a, i) => (
                <div key={i} className="border rounded-xl p-4 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{a.taskTitle}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">{a.courseName}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(a.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {a.txSignature && (
                    <p className="text-xs font-mono text-gray-400 mt-2 truncate">
                      tx: {a.txSignature}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
