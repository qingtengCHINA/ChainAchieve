import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { initDb, insertCourse, insertTask } from '../src/db.js';

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({})),
  getConnection: vi.fn(() => ({})),
}));
vi.mock('../src/keypair.js', () => ({ getPlatformKeypair: vi.fn() }));

const db = initDb(':memory:');
const app = createApp(db);

afterAll(() => db.close());

beforeEach(() => {
  db.exec('DELETE FROM completions; DELETE FROM tasks; DELETE FROM courses;');
  insertCourse(db, {
    id: 'course-1', name: 'Solidity 101', symbol: 'SLD',
    description: 'Learn Solidity', imageUrl: 'https://example.com/img.png',
    teacherWallet: 'T1',
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
    const res = await request(app).post('/api/courses/course-1/tasks').send({
      title: 'Quiz 1',
      description: 'Pass the first quiz',
      tokenReward: 200,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Quiz 1');
    const listRes = await request(app).get('/api/courses/course-1/tasks');
    expect(listRes.body).toHaveLength(2);
  });
});

describe('POST /api/tasks/:id/complete', () => {
  it('returns 409 on duplicate completion attempt', async () => {
    await request(app).post('/api/tasks/task-1/complete').send({ studentWallet: 'Student111111111111111111111111111111111111' });
    const res2 = await request(app).post('/api/tasks/task-1/complete').send({ studentWallet: 'Student111111111111111111111111111111111111' });
    expect(res2.status).toBe(409);
  });

  it('returns 400 when studentWallet is missing', async () => {
    const res = await request(app).post('/api/tasks/task-1/complete').send({});
    expect(res.status).toBe(400);
  });
});
