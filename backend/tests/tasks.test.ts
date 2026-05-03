import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bs58 from 'bs58';
import { generateKeyPairSync, sign } from 'crypto';
import { transfer } from '@solana/spl-token';
import { createApp } from '../src/index.js';
import { initDb, insertCompletion, insertCourse, insertTask } from '../src/db.js';

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({})),
  getConnection: vi.fn(() => ({})),
}));
vi.mock('../src/keypair.js', () => ({
  getPlatformKeypair: vi.fn(() => ({ publicKey: 'platformPubkey' })),
}));
vi.mock('@solana/spl-token', () => ({
  getOrCreateAssociatedTokenAccount: vi.fn(async () => ({ address: 'fakeAta' })),
  transfer: vi.fn(async () => 'fakeTxSig'),
}));
vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn(function (key: string) { return { toString: () => key }; }),
}));

const db = initDb(':memory:');
const app = createApp(db);
const teacherKeypair = generateKeyPairSync('ed25519');
const teacherWallet = bs58.encode(
  Buffer.from(teacherKeypair.publicKey.export({ format: 'der', type: 'spki' })).subarray(-32)
);

afterAll(() => db.close());

beforeEach(() => {
  db.exec('DELETE FROM completions; DELETE FROM tasks; DELETE FROM courses;');
  vi.mocked(transfer).mockReset();
  vi.mocked(transfer).mockResolvedValue('fakeTxSig');
  insertCourse(db, {
    id: 'course-1', name: 'Solidity 101', symbol: 'SLD',
    description: 'Learn Solidity', imageUrl: 'https://example.com/img.png',
    teacherWallet,
    mintAddress: 'So11111111111111111111111111111111111111112',
    metadataUrl: 'https://meta.json', configKey: 'cfg1', launchSignature: 'sig1',
    createdAt: 1000,
  });
  insertTask(db, { id: 'task-1', courseId: 'course-1', title: 'Watch Intro', description: 'Watch the intro video', tokenReward: 100, sortOrder: 0 });
});

describe('GET /api/courses', () => {
  it('lists all courses', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Solidity 101');
  });
});

describe('GET /api/courses/:id/tasks', () => {
  it('returns tasks for a course', async () => {
    const res = await request(app).get('/api/courses/course-1/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Watch Intro');
  });
});

describe('POST /api/courses/:id/tasks', () => {
  it('adds a task to a course', async () => {
    const path = '/api/courses/course-1/tasks';
    const res = await request(app)
      .post(path)
      .set(authHeaders('POST', path))
      .send({
        title: 'Quiz 1',
        description: 'Pass the first quiz',
        tokenReward: 200,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Quiz 1');
    const listRes = await request(app).get('/api/courses/course-1/tasks');
    expect(listRes.body).toHaveLength(2);
  });

  it('rejects unauthenticated task creation', async () => {
    const res = await request(app).post('/api/courses/course-1/tasks').send({
      title: 'Quiz 1',
      description: 'Pass the first quiz',
      tokenReward: 200,
    });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/courses/:courseId/tasks/:taskId', () => {
  it('rejects a spoofed wallet query parameter without a wallet signature', async () => {
    const res = await request(app)
      .delete(`/api/courses/course-1/tasks/task-1?wallet=${encodeURIComponent(teacherWallet)}`);
    expect(res.status).toBe(401);
  });

  it('deletes a task with a valid teacher wallet signature', async () => {
    const path = '/api/courses/course-1/tasks/task-1';
    const res = await request(app)
      .delete(path)
      .set(authHeaders('DELETE', path));
    expect(res.status).toBe(200);

    const listRes = await request(app).get('/api/courses/course-1/tasks');
    expect(listRes.body).toHaveLength(0);
  });

  it('returns 409 instead of deleting a task that already has completions', async () => {
    insertCompletion(db, {
      id: 'comp-1',
      taskId: 'task-1',
      studentWallet: 'Student111111111111111111111111111111111111',
      txSignature: 'sig1',
      completedAt: 2000,
    });

    const path = '/api/courses/course-1/tasks/task-1';
    const res = await request(app)
      .delete(path)
      .set(authHeaders('DELETE', path));
    expect(res.status).toBe(409);

    const listRes = await request(app).get('/api/courses/course-1/tasks');
    expect(listRes.body).toHaveLength(1);
  });
});

describe('GET /api/leaderboard', () => {
  it('normalizes a negative limit to the default cap', async () => {
    for (let i = 0; i < 25; i += 1) {
      insertCompletion(db, {
        id: `comp-${i}`,
        taskId: 'task-1',
        studentWallet: `Student${String(i).padStart(2, '0')}111111111111111111111111111111`,
        txSignature: `sig-${i}`,
        completedAt: 2000 + i,
      });
    }

    const res = await request(app).get('/api/leaderboard?limit=-1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
  });
});

describe('POST /api/tasks/:id/complete', () => {
  it('returns 409 on duplicate completion attempt', async () => {
    await request(app).post('/api/tasks/task-1/complete').send({ studentWallet: 'Student111111111111111111111111111111111111' });
    const res2 = await request(app).post('/api/tasks/task-1/complete').send({ studentWallet: 'Student111111111111111111111111111111111111' });
    expect(res2.status).toBe(409);
  });

  it('reserves completion before transfer so concurrent requests cannot pay twice', async () => {
    let releaseTransfer!: () => void;
    vi.mocked(transfer).mockImplementationOnce(async () => {
      await new Promise<void>(resolve => {
        releaseTransfer = resolve;
      });
      return 'slowTxSig';
    });

    const first = request(app)
      .post('/api/tasks/task-1/complete')
      .send({ studentWallet: 'Student111111111111111111111111111111111111' })
      .then(res => res);

    await vi.waitFor(() => expect(transfer).toHaveBeenCalledTimes(1));

    const second = await request(app)
      .post('/api/tasks/task-1/complete')
      .send({ studentWallet: 'Student111111111111111111111111111111111111' });
    expect(second.status).toBe(409);
    expect(transfer).toHaveBeenCalledTimes(1);

    releaseTransfer();
    const firstRes = await first;
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.txSignature).toBe('slowTxSig');
  });

  it('returns 400 when studentWallet is missing', async () => {
    const res = await request(app).post('/api/tasks/task-1/complete').send({});
    expect(res.status).toBe(400);
  });
});

function authHeaders(method: string, path: string) {
  const message = JSON.stringify({
    domain: 'ChainAchieve',
    method,
    path,
    wallet: teacherWallet,
    timestamp: Date.now(),
    nonce: 'test-nonce',
  });

  return {
    'x-wallet': teacherWallet,
    'x-message': message,
    'x-signature': bs58.encode(sign(null, Buffer.from(message, 'utf8'), teacherKeypair.privateKey)),
  };
}
