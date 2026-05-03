import { motion } from 'framer-motion';
import { Course } from '../lib/api';

interface Props {
  courses: Course[];
  completedCourseIds: Set<string>;
}

export function AchievementGrid({ courses, completedCourseIds }: Props) {
  const completed = courses.filter(c => completedCourseIds.has(c.id));

  if (completed.length === 0) {
    return (
      <div className="card text-center py-14">
        <div className="text-5xl mb-4">🏆</div>
        <p className="font-black text-lg mb-2" style={{ color: 'var(--text)' }}>No achievements yet</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Complete all tasks in a course to earn its achievement token.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
        {completed.length} Achievement{completed.length !== 1 ? 's' : ''} Earned
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {completed.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
            className="card flex flex-col items-center text-center p-5 cursor-default"
            style={{ background: 'rgba(159,232,112,0.07)', borderColor: 'rgba(159,232,112,0.25)' }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            {course.imageUrl ? (
              <div className="relative mb-3">
                <img
                  src={course.imageUrl}
                  alt={course.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 3px var(--brand-green)' }}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--brand-green)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="relative mb-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black"
                  style={{
                    background: 'var(--brand-green)',
                    color: '#163300',
                    boxShadow: '0 0 0 3px rgba(159,232,112,0.4)',
                  }}
                >
                  {course.symbol.slice(0, 2)}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--brand-green)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            )}

            <p className="text-sm font-bold leading-tight mb-1" style={{ color: 'var(--text)' }}>{course.name}</p>
            <p className="text-xs font-black tracking-wider" style={{ color: 'var(--brand-green)' }}>{course.symbol}</p>
            <span className="badge mt-2 text-[10px]">Earned ✓</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
