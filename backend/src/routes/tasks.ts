import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { DB } from '../db.js';
import { insertTask, getTasks, insertCompletion } from '../db.js';

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

    const course = db.prepare('SELECT mint_address FROM courses WHERE id = ?')
      .get(task.course_id) as { mint_address: string | null } | undefined;
    if (!course?.mint_address) {
      res.status(400).json({ error: 'Course token not yet launched' });
      return;
    }

    try {
      const completion = {
        id: randomUUID(),
        taskId: req.params.id,
        studentWallet: parsed.data.studentWallet,
        txSignature: null as string | null,
        completedAt: Date.now(),
      };
      insertCompletion(db, completion);

      // Fire-and-forget SPL distribution (updates tx_signature asynchronously)
      distributeTokens(course.mint_address, parsed.data.studentWallet, task.token_reward)
        .then(sig => {
          db.prepare('UPDATE completions SET tx_signature = ? WHERE id = ?').run(sig, completion.id);
        })
        .catch(console.error);

      res.status(201).json({ ...completion, tokenReward: task.token_reward });
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Already completed' });
      } else {
        res.status(500).json({ error: msg });
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
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const { getOrCreateAssociatedTokenAccount, transfer } = await import('@solana/spl-token');
  const { getPlatformKeypair } = await import('../keypair.js');
  const keypair = getPlatformKeypair();
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  const connection = new Connection(rpcUrl, 'confirmed');
  const mint = new PublicKey(mintAddress);
  const student = new PublicKey(studentWallet);
  const platformAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const studentAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, student);
  const sig = await transfer(connection, keypair, platformAta.address, studentAta.address, keypair, BigInt(amount));
  return sig;
}
