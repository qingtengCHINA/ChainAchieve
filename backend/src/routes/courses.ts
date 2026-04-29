import { Router } from 'express';
import type { DB } from '../db.js';
import { getCourses, getCourse, getTasks, getStudentCompletions } from '../db.js';

export function coursesRouter(db: DB): Router {
  const router = Router();

  router.get('/courses', (_req, res) => {
    res.json(getCourses(db));
  });

  router.get('/courses/:id', (req, res) => {
    const course = getCourse(db, req.params.id);
    if (!course) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(course);
  });

  router.get('/courses/:id/tasks', (req, res) => {
    res.json(getTasks(db, req.params.id));
  });

  router.get('/student/completions', (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    res.json(getStudentCompletions(db, wallet));
  });

  return router;
}
