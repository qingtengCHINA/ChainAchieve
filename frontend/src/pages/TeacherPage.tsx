import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CourseWizard } from '../components/CourseWizard';
import { RoyaltyPanel } from '../components/RoyaltyPanel';

type Tab = 'create' | 'courses' | 'royalties';

interface CreatedCourse { courseId: string; mintAddress: string; }

export default function TeacherPage() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>('create');
  const [created, setCreated] = useState<CreatedCourse[]>([]);

  if (!publicKey) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Connect your wallet to access the Teacher Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard</h1>

      <div className="flex gap-1 mb-6 border-b">
        {(['create', 'courses', 'royalties'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            {t === 'create' ? 'Create Course' : t === 'courses' ? 'My Courses' : 'Royalties'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <CourseWizard
          teacherWallet={publicKey.toBase58()}
          onComplete={(courseId, mintAddress) => {
            setCreated(prev => [...prev, { courseId, mintAddress }]);
            setTab('courses');
          }}
        />
      )}

      {tab === 'courses' && (
        <div className="space-y-3">
          {created.length === 0 ? (
            <p className="text-gray-500 text-sm">No courses yet — create one above.</p>
          ) : (
            created.map(c => (
              <div key={c.courseId} className="border rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-800">Course ID: {c.courseId}</p>
                <p className="text-gray-500 mt-1">Mint: {c.mintAddress}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'royalties' && <RoyaltyPanel />}
    </div>
  );
}
