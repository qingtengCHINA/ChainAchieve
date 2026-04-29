import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection } from '@solana/web3.js';

let _sdk: BagsSDK | null = null;
let _connection: Connection | null = null;

export function getSDK(): BagsSDK {
  if (_sdk) return _sdk;
  const apiKey = process.env.BAGS_API_KEY;
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('BAGS_API_KEY env var not set');
  if (!heliusKey) throw new Error('HELIUS_API_KEY env var not set');
  _connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
    'confirmed'
  );
  _sdk = new BagsSDK(apiKey, _connection, 'processed');
  return _sdk;
}

export function getConnection(): Connection {
  getSDK();
  return _connection!;
}

export function resetSDK(): void {
  _sdk = null;
  _connection = null;
}
