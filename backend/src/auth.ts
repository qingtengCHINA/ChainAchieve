import type { Request } from 'express';
import { createPublicKey, verify } from 'crypto';
import bs58 from 'bs58';

const AUTH_WINDOW_MS = 5 * 60 * 1000;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

type AuthResult =
  | { ok: true; wallet: string }
  | { ok: false; status: 401 | 403; error: string };

export function verifyWalletAuth(req: Request): AuthResult {
  const wallet = req.header('x-wallet');
  const signature = req.header('x-signature');
  const message = req.header('x-message');

  if (!wallet || !signature || !message) {
    return { ok: false, status: 401, error: 'wallet signature required' };
  }

  const fields = parseAuthMessage(message);
  const requestPath = new URL(req.originalUrl, 'http://chainachieve.local').pathname;
  const timestamp = Number(fields.timestamp);

  if (
    fields.domain !== 'ChainAchieve' ||
    fields.wallet !== wallet ||
    fields.method !== req.method ||
    fields.path !== requestPath ||
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > AUTH_WINDOW_MS
  ) {
    return { ok: false, status: 401, error: 'invalid wallet auth message' };
  }

  try {
    const publicKeyBytes = bs58.decode(wallet);
    const signatureBytes = bs58.decode(signature);
    if (publicKeyBytes.length !== 32) {
      return { ok: false, status: 401, error: 'invalid wallet public key' };
    }

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: 'der',
      type: 'spki',
    });
    const verified = verify(null, Buffer.from(message, 'utf8'), publicKey, Buffer.from(signatureBytes));
    if (!verified) {
      return { ok: false, status: 401, error: 'invalid wallet signature' };
    }
  } catch {
    return { ok: false, status: 401, error: 'invalid wallet signature' };
  }

  return { ok: true, wallet };
}

export function requireWallet(req: Request, expectedWallet?: string): AuthResult {
  const auth = verifyWalletAuth(req);
  if (!auth.ok) return auth;
  if (expectedWallet && auth.wallet !== expectedWallet) {
    return { ok: false, status: 403, error: 'Not your course' };
  }
  return auth;
}

function parseAuthMessage(message: string): Record<string, string> {
  try {
    const parsed = JSON.parse(message) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)])
    );
  } catch {
    // Fall through to the legacy line format for old clients during rollout.
  }

  const fields: Record<string, string> = {};
  for (const line of message.split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    fields[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return fields;
}
