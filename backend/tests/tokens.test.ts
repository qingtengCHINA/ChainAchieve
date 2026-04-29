import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({
    tokenLaunch: {
      createTokenInfoAndMetadata: vi.fn(async () => ({
        tokenMint: 'Mint1111111111111111111111111111111111111111',
        tokenMetadata: 'https://arweave.net/mock-meta',
        tokenLaunch: { status: 'PRE_LAUNCH' },
      })),
      createLaunchTransaction: vi.fn(async () => ({
        serialize: () => new Uint8Array(100).fill(1),
        message: { recentBlockhash: '' },
        sign: vi.fn(),
      })),
    },
  })),
  getConnection: vi.fn(() => ({
    getLatestBlockhash: vi.fn(async () => ({ blockhash: 'hash123', lastValidBlockHeight: 999 })),
    sendRawTransaction: vi.fn(async () => 'sig_launch_123'),
    confirmTransaction: vi.fn(async () => ({})),
  })),
}));

vi.mock('../src/keypair.js', () => ({
  getPlatformKeypair: vi.fn(() => ({
    publicKey: { toBase58: () => '11111111111111111111111111111111' },
    secretKey: new Uint8Array(64),
  })),
}));

vi.mock('../src/db.js', () => ({
  initDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ get: vi.fn(() => ({ mint_address: 'Mint1111111111111111111111111111111111111111', metadata_url: 'https://meta.json' })) })),
  })),
  insertCourse: vi.fn(),
  updateCourse: vi.fn(),
  getCourses: vi.fn(() => []),
  getCourse: vi.fn(() => undefined),
  getTasks: vi.fn(() => []),
  insertTask: vi.fn(),
  insertCompletion: vi.fn(),
  getCompletions: vi.fn(() => []),
  getStudentCompletions: vi.fn(() => []),
}));

describe('POST /api/tokens/info', () => {
  it('returns courseId, tokenMint and metadataUrl', async () => {
    const app = createApp();
    const res = await request(app).post('/api/tokens/info').send({
      name: 'Solidity 101',
      symbol: 'SLD101',
      description: 'Learn Solidity basics',
      imageUrl: 'https://example.com/img.png',
      teacherWallet: 'Teacher111111111111111111111111111111111111',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      courseId: expect.any(String),
      tokenMint: expect.any(String),
      metadataUrl: expect.any(String),
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app).post('/api/tokens/info').send({ name: 'Missing fields' });
    expect(res.status).toBe(400);
  });
});
