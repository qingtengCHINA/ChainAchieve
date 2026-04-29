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
      UNIQUE(task_id, student_wallet)
    );
  `);
  return db;
}

export function getCourses(db: DB): Course[] {
  return db.prepare(`
    SELECT id, name, symbol, description,
           teacher_wallet as teacherWallet,
           mint_address as mintAddress,
           metadata_url as metadataUrl,
           config_key as configKey,
           launch_signature as launchSignature,
           created_at as createdAt
    FROM courses ORDER BY created_at DESC
  `).all() as Course[];
}

export function getCourse(db: DB, id: string): Course | undefined {
  return db.prepare(`
    SELECT id, name, symbol, description,
           teacher_wallet as teacherWallet,
           mint_address as mintAddress,
           metadata_url as metadataUrl,
           config_key as configKey,
           launch_signature as launchSignature,
           created_at as createdAt
    FROM courses WHERE id = ?
  `).get(id) as Course | undefined;
}

export function insertCourse(db: DB, c: Course): void {
  db.prepare(`
    INSERT INTO courses (id, name, symbol, description, teacher_wallet,
      mint_address, metadata_url, config_key, launch_signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c.id, c.name, c.symbol, c.description, c.teacherWallet,
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

export function getCompletions(db: DB, taskId: string): Completion[] {
  return db.prepare(`
    SELECT id, task_id as taskId, student_wallet as studentWallet,
           tx_signature as txSignature, completed_at as completedAt
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
    WHERE comp.student_wallet = ?
    ORDER BY comp.completed_at DESC
  `).all(studentWallet) as Array<Completion & { courseName: string; taskTitle: string; courseId: string }>;
}

export function insertCompletion(db: DB, c: Completion): void {
  db.prepare(`
    INSERT INTO completions (id, task_id, student_wallet, tx_signature, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(c.id, c.taskId, c.studentWallet, c.txSignature, c.completedAt);
}
