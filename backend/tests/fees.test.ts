import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { initDb } from '../src/db.js';

vi.mock('../src/keypair.js', () => ({ getPlatformKeypair: vi.fn() }));

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({
    fee: {
      getAllClaimablePositions: vi.fn(async () => [
        {
          isCustomFeeVault: false,
          baseMint: 'So11111111111111111111111111111111111111112',
          claimableDisplayAmount: 0.05,
          totalClaimableLamportsUserShare: 50000000,
          virtualPool: 'Pool1111',
          virtualPoolAddress: 'PoolAddr1',
          isMigrated: false,
          virtualPoolClaimableAmount: 50000000,
        },
      ]),
      getClaimTransactions: vi.fn(async () => [
        { serialize: (_opts?: unknown) => Buffer.from('mocktx') },
      ]),
    },
  })),
  getConnection: vi.fn(() => ({})),
}));

const db = initDb(':memory:');
const app = createApp(db);
afterAll(() => db.close());

describe('GET /api/fees/positions', () => {
  it('returns claimable positions for a wallet', async () => {
    const res = await request(app)
      .get('/api/fees/positions')
      .query({ wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].claimableDisplayAmount).toBe(0.05);
  });

  it('returns 400 when wallet param is missing', async () => {
    const res = await request(app).get('/api/fees/positions');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/fees/claim-txs', () => {
  it('returns base64-encoded transactions to sign', async () => {
    const res = await request(app).post('/api/fees/claim-txs').send({
      wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      tokenMint: 'So11111111111111111111111111111111111111112',
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    expect(typeof res.body.transactions[0]).toBe('string');
  });
});
