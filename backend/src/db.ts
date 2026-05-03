import BetterSqlite3 from 'better-sqlite3';
import type { Course, Task, Completion } from './types.js';

export type DB = InstanceType<typeof BetterSqlite3>;

export function initDb(path = './chainachieve.db'): DB {
  const db = new BetterSqlite3(path);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      teacher_wallet TEXT NOT NULL,
      mint_address TEXT,
      metadata_url TEXT,
      config_key TEXT,
      launch_signature TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      token_reward INTEGER NOT NULL DEFAULT 100,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      student_wallet TEXT NOT NULL,
      tx_signature TEXT,
      completed_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
      UNIQUE(task_id, student_wallet)
    );
  `);
  try { db.exec(`ALTER TABLE courses ADD COLUMN image_url TEXT NOT NULL DEFAULT ''`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE completions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed'))`); } catch { /* exists */ }
  return db;
}

const COURSE_SELECT = `
  SELECT id, name, symbol, description, image_url as imageUrl,
         teacher_wallet as teacherWallet,
         mint_address as mintAddress,
         metadata_url as metadataUrl,
         config_key as configKey,
         launch_signature as launchSignature,
         created_at as createdAt
  FROM courses
`;

export function getCourses(db: DB, search?: string): Course[] {
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    return db.prepare(`${COURSE_SELECT} WHERE name LIKE ? OR symbol LIKE ? OR description LIKE ? ORDER BY created_at DESC`)
      .all(q, q, q) as Course[];
  }
  return db.prepare(`${COURSE_SELECT} ORDER BY created_at DESC`).all() as Course[];
}

export function getCourse(db: DB, id: string): Course | undefined {
  return db.prepare(`${COURSE_SELECT} WHERE id = ?`).get(id) as Course | undefined;
}

export function getTeacherCourses(db: DB, teacherWallet: string): Course[] {
  return db.prepare(`${COURSE_SELECT} WHERE teacher_wallet = ? ORDER BY created_at DESC`)
    .all(teacherWallet) as Course[];
}

export function getCourseStats(db: DB, courseId: string): {
  totalTasks: number;
  studentCount: number;
  totalCompletions: number;
  earnedStudents: number;
} {
  const totalTasks = (db.prepare('SELECT COUNT(*) as n FROM tasks WHERE course_id = ?').get(courseId) as { n: number }).n;
  const totalCompletions = (db.prepare(
    `SELECT COUNT(*) as n FROM completions c
     JOIN tasks t ON t.id = c.task_id
     WHERE t.course_id = ? AND c.status = 'completed'`
  ).get(courseId) as { n: number }).n;
  const studentCount = (db.prepare(
    `SELECT COUNT(DISTINCT c.student_wallet) as n FROM completions c
     JOIN tasks t ON t.id = c.task_id
     WHERE t.course_id = ? AND c.status = 'completed'`
  ).get(courseId) as { n: number }).n;
  // Students who completed ALL tasks
  const earnedStudents = totalTasks === 0 ? 0 : (db.prepare(`
    SELECT COUNT(*) as n FROM (
      SELECT c.student_wallet FROM completions c
      JOIN tasks t ON t.id = c.task_id
      WHERE t.course_id = ? AND c.status = 'completed'
      GROUP BY c.student_wallet
      HAVING COUNT(*) = ?
    )
  `).get(courseId, totalTasks) as { n: number }).n;
  return { totalTasks, studentCount, totalCompletions, earnedStudents };
}

export function getLeaderboard(db: DB, limit = 20): Array<{
  studentWallet: string;
  completionCount: number;
  courseCount: number;
  latestAt: number;
}> {
  return db.prepare(`
    SELECT c.student_wallet as studentWallet,
           COUNT(*) as completionCount,
           COUNT(DISTINCT t.course_id) as courseCount,
           MAX(c.completed_at) as latestAt
    FROM completions c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.status = 'completed'
    GROUP BY c.student_wallet
    ORDER BY completionCount DESC, latestAt ASC
    LIMIT ?
  `).all(limit) as Array<{ studentWallet: string; completionCount: number; courseCount: number; latestAt: number }>;
}

export function insertCourse(db: DB, c: Course): void {
  db.prepare(`
    INSERT INTO courses (id, name, symbol, description, image_url, teacher_wallet,
      mint_address, metadata_url, config_key, launch_signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c.id, c.name, c.symbol, c.description, c.imageUrl, c.teacherWallet,
         c.mintAddress, c.metadataUrl, c.configKey, c.launchSignature, c.createdAt);
}

export function updateCourse(db: DB, id: string, patch: Partial<Pick<Course, 'mintAddress' | 'metadataUrl' | 'configKey' | 'launchSignature'>>): void {
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (patch.mintAddress !== undefined) { sets.push('mint_address = ?'); vals.push(patch.mintAddress); }
  if (patch.metadataUrl !== undefined) { sets.push('metadata_url = ?'); vals.push(patch.metadataUrl); }
  if (patch.configKey !== undefined) { sets.push('config_key = ?'); vals.push(patch.configKey); }
  if (patch.launchSignature !== undefined) { sets.push('launch_signature = ?'); vals.push(patch.launchSignature); }
  if (sets.length === 0) return;
  db.prepare(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
}

export function getTasks(db: DB, courseId: string): Task[] {
  return db.prepare(`
    SELECT id, course_id as courseId, title, description,
           token_reward as tokenReward, sort_order as sortOrder
    FROM tasks WHERE course_id = ? ORDER BY sort_order
  `).all(courseId) as Task[];
}

export function insertTask(db: DB, t: Task): void {
  db.prepare(`
    INSERT INTO tasks (id, course_id, title, description, token_reward, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(t.id, t.courseId, t.title, t.description, t.tokenReward, t.sortOrder);
}

export type DeleteTaskResult = 'deleted' | 'not_found' | 'has_completions';

export function deleteTask(db: DB, taskId: string, courseId: string): DeleteTaskResult {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND course_id = ?').get(taskId, courseId);
  if (!task) return 'not_found';

  const completionCount = (db.prepare('SELECT COUNT(*) as n FROM completions WHERE task_id = ?')
    .get(taskId) as { n: number }).n;
  if (completionCount > 0) return 'has_completions';

  const info = db.prepare('DELETE FROM tasks WHERE id = ? AND course_id = ?').run(taskId, courseId);
  return info.changes > 0 ? 'deleted' : 'not_found';
}

export function getCompletions(db: DB, taskId: string): Completion[] {
  return db.prepare(`
    SELECT id, task_id as taskId, student_wallet as studentWallet,
           tx_signature as txSignature, completed_at as completedAt,
           status
    FROM completions WHERE task_id = ?
  `).all(taskId) as Completion[];
}

export function getStudentCompletions(db: DB, studentWallet: string): Array<Completion & { courseName: string; taskTitle: string; courseId: string }> {
  return db.prepare(`
    SELECT comp.id, comp.task_id as taskId, comp.student_wallet as studentWallet,
           comp.tx_signature as txSignature, comp.completed_at as completedAt,
           t.title as taskTitle, c.name as courseName, c.id as courseId
    FROM completions comp
    JOIN tasks t ON t.id = comp.task_id
    JOIN courses c ON c.id = t.course_id
    WHERE comp.student_wallet = ? AND comp.status = 'completed'
    ORDER BY comp.completed_at DESC
  `).all(studentWallet) as Array<Completion & { courseName: string; taskTitle: string; courseId: string }>;
}

export function insertCompletion(db: DB, c: Completion): void {
  db.prepare(`
    INSERT INTO completions (id, task_id, student_wallet, tx_signature, completed_at, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(c.id, c.taskId, c.studentWallet, c.txSignature, c.completedAt, c.status ?? 'completed');
}

export function reserveCompletion(db: DB, c: Pick<Completion, 'id' | 'taskId' | 'studentWallet' | 'completedAt'>): Completion {
  db.prepare(`
    INSERT INTO completions (id, task_id, student_wallet, tx_signature, completed_at, status)
    VALUES (?, ?, ?, NULL, ?, 'pending')
  `).run(c.id, c.taskId, c.studentWallet, c.completedAt);

  return {
    id: c.id,
    taskId: c.taskId,
    studentWallet: c.studentWallet,
    txSignature: null,
    completedAt: c.completedAt,
    status: 'pending',
  };
}

export function getCompletionByTaskAndStudent(db: DB, taskId: string, studentWallet: string): Completion | undefined {
  return db.prepare(`
    SELECT id, task_id as taskId, student_wallet as studentWallet,
           tx_signature as txSignature, completed_at as completedAt,
           status
    FROM completions
    WHERE task_id = ? AND student_wallet = ?
  `).get(taskId, studentWallet) as Completion | undefined;
}

export function markCompletionTransferred(db: DB, id: string, txSignature: string): void {
  db.prepare(`
    UPDATE completions
    SET tx_signature = ?, status = 'completed'
    WHERE id = ? AND status = 'pending'
  `).run(txSignature, id);
}

export function markCompletionFailed(db: DB, id: string): void {
  db.prepare(`
    UPDATE completions
    SET status = 'failed'
    WHERE id = ? AND status = 'pending'
  `).run(id);
}
