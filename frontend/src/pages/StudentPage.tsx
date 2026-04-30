import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api, Course, Task } from '../lib/api';
import { TaskList } from '../components/TaskList';
import { AchievementGrid } from '../components/AchievementGrid';

type Tab = 'courses' | 'achievements';

export default function StudentPage() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCourses().then(setCourses).catch(() => {});
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

  useEffect(() => {
    if (completedTaskIds.size === 0 || courses.length === 0) return;
    const earned = new Set<string>();
    Promise.all(courses.map(course =>
      api.getCourseTasks(course.id).then(courseTasks => {
        if (courseTasks.length > 0 && courseTasks.every(t => completedTaskIds.has(t.id))) {
          earned.add(course.id);
        }
      }).catch(() => {})
    )).then(() => setCompletedCourseIds(new Set(earned)));
  }, [completedTaskIds, courses]);

  async function selectCourse(course: Course) {
    setSelectedCourse(course);
    setLoading(true); setError(null);
    try {
      setTasks(await api.getCourseTasks(course.id));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Courses</h1>

      <div className="flex gap-1 mb-6 border-b">
        {(['courses', 'achievements'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedCourse(null); }}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            {t === 'courses' ? 'Browse Courses' : 'Achievements'}
          </button>
        ))}
      </div>

      {tab === 'achievements' && (
        <AchievementGrid courses={courses} completedCourseIds={completedCourseIds} />
      )}

      {tab === 'courses' && !selectedCourse && (
        <div className="space-y-3">
          {courses.length === 0 && (
            <p className="text-gray-400 text-sm">No courses available yet.</p>
          )}
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => selectCourse(course)}
              className="flex items-center gap-4 p-4 border rounded-xl bg-white hover:shadow-md cursor-pointer transition-shadow"
            >
              {course.imageUrl ? (
                <img src={course.imageUrl} alt={course.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-indigo-600">{course.symbol.slice(0, 2)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{course.name}</p>
                <p className="text-xs text-gray-500 truncate">{course.description}</p>
              </div>
              <span className="text-xs font-mono text-indigo-600 shrink-0">{course.symbol}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'courses' && selectedCourse && (
        <div>
          <button
            onClick={() => setSelectedCourse(null)}
            className="text-sm text-gray-500 hover:text-gray-800 mb-4"
          >
            ← Back to courses
          </button>
          <h2 className="text-lg font-semibold mb-1">{selectedCourse.name}</h2>
          <p className="text-sm text-gray-500 mb-4">{selectedCourse.description}</p>

          {!publicKey && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Connect your wallet to complete tasks and earn tokens.
            </p>
          )}

          {loading && <p className="text-sm text-gray-400">Loading tasks…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && (
            <TaskList
              tasks={tasks}
              studentWallet={publicKey?.toBase58() ?? ''}
              completedTaskIds={completedTaskIds}
              onComplete={taskId => setCompletedTaskIds(prev => new Set([...prev, taskId]))}
            />
          )}
        </div>
      )}
    </div>
  );
}
