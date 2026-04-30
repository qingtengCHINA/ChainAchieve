import { Course } from '../lib/api';

interface Props {
  courses: Course[];
  completedCourseIds: Set<string>;
}

export function AchievementGrid({ courses, completedCourseIds }: Props) {
  const completed = courses.filter(c => completedCourseIds.has(c.id));

  if (completed.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Complete all tasks in a course to earn its achievement token.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {completed.map(course => (
        <div
          key={course.id}
          className="flex flex-col items-center bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 text-center"
        >
          {course.imageUrl ? (
            <img src={course.imageUrl} alt={course.name} className="w-16 h-16 rounded-full object-cover mb-2" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-200 flex items-center justify-center mb-2">
              <span className="text-xl font-bold text-indigo-600">{course.symbol.slice(0, 2)}</span>
            </div>
          )}
          <p className="text-sm font-semibold text-gray-800">{course.name}</p>
          <p className="text-xs text-indigo-600 font-mono mt-1">{course.symbol}</p>
          <span className="mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Earned</span>
        </div>
      ))}
    </div>
  );
}
