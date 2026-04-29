import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

let _keypair: Keypair | null = null;

export function getPlatformKeypair(): Keypair {
  if (_keypair) return _keypair;
  const raw = process.env.PLATFORM_PRIVATE_KEY;
  if (!raw) throw new Error('PLATFORM_PRIVATE_KEY env var not set');
  _keypair = Keypair.fromSecretKey(bs58.decode(raw));
  return _keypair;
}
