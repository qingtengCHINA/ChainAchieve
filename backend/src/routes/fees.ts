import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSDK } from '../sdk.js';

const ClaimTxsSchema = z.object({
  wallet: z.string().min(32),
  tokenMint: z.string().min(32),
});

export function feesRouter(): Router {
  const router = Router();

  router.get('/positions', async (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    try {
      const sdk = getSDK();
      const positions = await sdk.fee.getAllClaimablePositions(new PublicKey(wallet));
      res.json(positions);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/claim-txs', async (req, res) => {
    const parsed = ClaimTxsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const sdk = getSDK();
      const txs = await sdk.fee.getClaimTransactions(
        new PublicKey(parsed.data.wallet),
        new PublicKey(parsed.data.tokenMint)
      );
      const base64Txs = txs.map(tx =>
        Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64')
      );
      res.json({ transactions: base64Txs });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
