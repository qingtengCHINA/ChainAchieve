import { Router } from 'express';
import type { DB } from '../db.js';
import {
  getCourses, getCourse, getTasks, getStudentCompletions,
  getTeacherCourses, getCourseStats, getLeaderboard, deleteTask,
} from '../db.js';
import { requireWallet } from '../auth.js';

export function coursesRouter(db: DB): Router {
  const router = Router();

  // List courses — supports ?q= search
  router.get('/courses', (req, res) => {
    const q = req.query.q as string | undefined;
    res.json(getCourses(db, q));
  });

  router.get('/courses/:id', (req, res) => {
    const course = getCourse(db, req.params.id);
    if (!course) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(course);
  });

  router.get('/courses/:id/tasks', (req, res) => {
    res.json(getTasks(db, req.params.id));
  });

  // Per-course stats (student count, completion rate, earned count)
  router.get('/courses/:id/stats', (req, res) => {
    const course = getCourse(db, req.params.id);
    if (!course) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(getCourseStats(db, req.params.id));
  });

  // Teacher-scoped course list (with per-course stats)
  router.get('/teacher/courses', (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    const courses = getTeacherCourses(db, wallet);
    const withStats = courses.map(c => ({
      ...c,
      stats: getCourseStats(db, c.id),
    }));
    res.json(withStats);
  });

  // Delete a task — only the course's teacher wallet should call this
  router.delete('/courses/:courseId/tasks/:taskId', (req, res) => {
    const { courseId, taskId } = req.params;
    const course = getCourse(db, courseId);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

    const auth = requireWallet(req, course.teacherWallet);
    if (!auth.ok) { res.status(auth.status).json({ error: auth.error }); return; }

    const result = deleteTask(db, taskId, courseId);
    if (result === 'not_found') { res.status(404).json({ error: 'Task not found' }); return; }
    if (result === 'has_completions') {
      res.status(409).json({ error: 'Cannot delete a task that already has completions' });
      return;
    }
    res.json({ ok: true });
  });

  // Global leaderboard
  router.get('/leaderboard', (req, res) => {
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 20;
    res.json(getLeaderboard(db, limit));
  });

  // Student completions
  router.get('/student/completions', (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    res.json(getStudentCompletions(db, wallet));
  });

  return router;
}
