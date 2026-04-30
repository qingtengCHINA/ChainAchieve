import { Router } from 'express';
import type { DB } from '../db.js';
import { getStudentCompletions } from '../db.js';

export function resumeRouter(db: DB): Router {
  const router = Router();

  // GET /api/resume?wallet=<address>
  // Returns a portable on-chain resume JSON for the given student wallet.
  router.get('/resume', (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) {
      return res.status(400).json({ error: 'wallet query param required' });
    }
    const completions = getStudentCompletions(db, wallet);
    const resume = {
      wallet,
      generatedAt: Date.now(),
      achievements: completions.map(c => ({
        courseId: c.courseId,
        courseName: c.courseName,
        taskId: c.taskId,
        taskTitle: c.taskTitle,
        completedAt: c.completedAt,
        txSignature: c.txSignature,
      })),
    };
    res.json(resume);
  });

  return router;
}
