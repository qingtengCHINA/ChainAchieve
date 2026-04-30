import { useState } from 'react';
import { api, Task } from '../lib/api';

interface Props {
  tasks: Task[];
  studentWallet: string;
  completedTaskIds: Set<string>;
  onComplete: (taskId: string) => void;
}

export function TaskList({ tasks, studentWallet, completedTaskIds, onComplete }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(taskId: string) {
    setLoading(taskId); setError(null);
    try {
      await api.completeTask(taskId, studentWallet);
      onComplete(taskId);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(null);
    }
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400">No tasks yet.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {tasks.map(task => {
        const done = completedTaskIds.has(task.id);
        return (
          <div
            key={task.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              done ? 'bg-green-50 border-green-200' : 'bg-white'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-3 shrink-0">
              <span className="text-xs font-semibold text-indigo-600">{task.tokenReward} tokens</span>
              {done ? (
                <span className="text-xs text-green-600 font-medium">Done ✓</span>
              ) : (
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={loading === task.id}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading === task.id ? '…' : 'Complete'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
