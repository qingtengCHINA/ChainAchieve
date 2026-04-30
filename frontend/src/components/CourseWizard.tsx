import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  teacherWallet: string;
  onComplete: (courseId: string, mintAddress: string) => void;
}

interface Step1Data { name: string; symbol: string; description: string; imageUrl: string; }
interface TaskDraft { title: string; description: string; tokenReward: number; }

export function CourseWizard({ teacherWallet, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Step1Data>({ name: '', symbol: '', description: '', imageUrl: '' });
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [newTask, setNewTask] = useState<TaskDraft>({ title: '', description: '', tokenReward: 100 });
  const [courseId, setCourseId] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await api.createTokenInfo({ ...form, teacherWallet });
      setCourseId(result.courseId);
      setMintAddress(result.tokenMint);
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
        await api.addTask(courseId, task);
      }
      setStep(3);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === 3 && courseId && mintAddress) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Token Created!</h3>
        <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Mint:</span> {mintAddress}</p>
        <p className="text-sm text-gray-600 mb-4"><span className="font-medium">Course ID:</span> {courseId}</p>
        <p className="text-sm text-gray-500">
          Next: configure fee sharing on the Bags developer console, then use the config key to complete the launch.
        </p>
        <button
          onClick={() => onComplete(courseId, mintAddress)}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <div className="flex gap-2 mb-6">
        {([1, 2, 3] as const).map(n => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1 — Course Info</h2>
          <label className="block text-sm font-medium text-gray-700">
            Course Name
            <input
              aria-label="Course Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Symbol
            <input
              aria-label="Symbol"
              value={form.symbol}
              onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
              required
              maxLength={10}
              className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              aria-label="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              rows={3}
              className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Image URL
            <input
              aria-label="Image URL"
              type="url"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              required
              className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Next →'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Add Tasks</h2>
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm">
              <span>{t.title}</span>
              <span className="text-indigo-600">{t.tokenReward} tokens</span>
            </div>
          ))}
          <div className="border rounded-lg p-3 space-y-2">
            <input
              placeholder="Task title"
              value={newTask.title}
              onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
              className="block w-full border rounded px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Description"
              value={newTask.description}
              onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))}
              className="block w-full border rounded px-3 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={newTask.tokenReward}
                onChange={e => setNewTask(n => ({ ...n, tokenReward: Number(e.target.value) }))}
                className="w-28 border rounded px-3 py-1.5 text-sm"
              />
              <button
                onClick={addTaskDraft}
                type="button"
                className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded text-sm hover:bg-gray-200"
              >
                + Add Task
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} type="button" className="flex-1 border text-gray-600 py-2 rounded-lg text-sm">
              ← Back
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={loading || tasks.length === 0}
              type="button"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
