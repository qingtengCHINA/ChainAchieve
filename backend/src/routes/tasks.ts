import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { DB } from '../db.js';
import {
  insertTask, getTasks, getCourse, reserveCompletion, getCompletionByTaskAndStudent,
  markCompletionTransferred, markCompletionFailed,
} from '../db.js';
import { getConnection } from '../sdk.js';
import { requireWallet } from '../auth.js';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tokenReward: z.number().int().min(1).default(100),
});

const CompleteTaskSchema = z.object({
  studentWallet: z.string().min(32),
});

export function tasksRouter(db: DB): Router {
  const router = Router();

  router.post('/courses/:courseId/tasks', (req, res) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const course = getCourse(db, req.params.courseId);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    const auth = requireWallet(req, course.teacherWallet);
    if (!auth.ok) { res.status(auth.status).json({ error: auth.error }); return; }

    const existing = getTasks(db, req.params.courseId);
    const task = {
      id: randomUUID(),
      courseId: req.params.courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      tokenReward: parsed.data.tokenReward,
      sortOrder: existing.length,
    };
    insertTask(db, task);
    res.status(201).json(task);
  });

  router.post('/tasks/:id/complete', async (req, res) => {
    const parsed = CompleteTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const task = db.prepare('SELECT token_reward, course_id FROM tasks WHERE id = ?')
      .get(req.params.id) as { token_reward: number; course_id: string } | undefined;
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    // Require both mint_address AND launch_signature — mint is stored pre-launch,
    // but tokens can only be distributed after the on-chain launch is confirmed.
    const course = db.prepare('SELECT mint_address, launch_signature FROM courses WHERE id = ?')
      .get(task.course_id) as { mint_address: string | null; launch_signature: string | null } | undefined;
    if (!course?.mint_address || !course?.launch_signature) {
      res.status(400).json({ error: 'Course token not yet launched' });
      return;
    }

    // Atomically reserve the unique completion before any irreversible transfer.
    const existing = getCompletionByTaskAndStudent(db, req.params.id, parsed.data.studentWallet);
    if (existing) {
      res.status(409).json({ error: 'Already completed' });
      return;
    }

    let completion: {
      id: string;
      taskId: string;
      studentWallet: string;
      txSignature: string | null;
      completedAt: number;
      status?: 'pending' | 'completed' | 'failed';
    } | undefined;
    try {
      completion = reserveCompletion(db, {
        id: randomUUID(),
        taskId: req.params.id,
        studentWallet: parsed.data.studentWallet,
        completedAt: Date.now(),
      });

      const sig = await distributeTokens(
        course.mint_address,
        parsed.data.studentWallet,
        task.token_reward
      );

      markCompletionTransferred(db, completion.id, sig);
      res.status(201).json({ ...completion, txSignature: sig, status: 'completed', tokenReward: task.token_reward });
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Already completed' });
      } else {
        if (completion) markCompletionFailed(db, completion.id);
        // Don't expose raw error internals; log server-side
        console.error('[complete task]', err);
        res.status(500).json({ error: 'Token distribution failed. Please try again.' });
      }
    }
  });

  return router;
}

async function distributeTokens(
  mintAddress: string,
  studentWallet: string,
  amount: number
): Promise<string> {
  const { PublicKey } = await import('@solana/web3.js');
  const { getOrCreateAssociatedTokenAccount, transfer } = await import('@solana/spl-token');
  const { getPlatformKeypair } = await import('../keypair.js');
  const keypair = getPlatformKeypair();
  // Reuse the shared connection (devnet) instead of building a new mainnet connection
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);
  const student = new PublicKey(studentWallet);
  const platformAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const studentAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, student);
  const sig = await transfer(connection, keypair, platformAta.address, studentAta.address, keypair, BigInt(amount));
  return sig;
}
