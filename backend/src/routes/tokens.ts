import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getSDK, getConnection } from '../sdk.js';
import { getPlatformKeypair } from '../keypair.js';
import { insertCourse, updateCourse } from '../db.js';
import type { DB } from '../db.js';

const TokenInfoSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().min(1).max(200),
  imageUrl: z.string().url(),
  teacherWallet: z.string().min(32),
  telegram: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
});

const LaunchSchema = z.object({
  courseId: z.string().uuid(),
  configKey: z.string().min(32),
  initialBuyLamports: z.number().int().min(0).default(0),
});

export function tokensRouter(db: DB): Router {
  const router = Router();

  router.post('/info', async (req, res) => {
    const parsed = TokenInfoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { name, symbol, description, imageUrl, teacherWallet, telegram, twitter, website } = parsed.data;
    try {
      const sdk = getSDK();
      const result = await sdk.tokenLaunch.createTokenInfoAndMetadata({
        name,
        symbol,
        description,
        imageUrl,
        ...(telegram && { telegram }),
        ...(twitter && { twitter }),
        ...(website && { website }),
      });
      const courseId = randomUUID();
      insertCourse(db, {
        id: courseId,
        name,
        symbol,
        description,
        teacherWallet,
        mintAddress: result.tokenMint,
        metadataUrl: result.tokenMetadata,
        configKey: null,
        launchSignature: null,
        createdAt: Date.now(),
      });
      res.json({ courseId, tokenMint: result.tokenMint, metadataUrl: result.tokenMetadata });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/launch', async (req, res) => {
    const parsed = LaunchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { courseId, configKey, initialBuyLamports } = parsed.data;
    try {
      const sdk = getSDK();
      const connection = getConnection();
      const keypair = getPlatformKeypair();
      const row = db.prepare('SELECT mint_address, metadata_url FROM courses WHERE id = ?').get(courseId) as
        | { mint_address: string; metadata_url: string }
        | undefined;
      if (!row?.mint_address || !row?.metadata_url) {
        res.status(404).json({ error: 'Course not found or missing token info' });
        return;
      }
      const tx = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: row.metadata_url,
        tokenMint: new PublicKey(row.mint_address),
        launchWallet: keypair.publicKey,
        initialBuyLamports,
        configKey: new PublicKey(configKey),
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;
      tx.sign([keypair]);
      const signature = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
      updateCourse(db, courseId, { configKey, launchSignature: signature });
      res.json({ signature, courseId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
