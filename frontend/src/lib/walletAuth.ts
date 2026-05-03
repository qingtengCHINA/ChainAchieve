export type SignMessage = (message: Uint8Array) => Promise<Uint8Array>;

const encoder = new TextEncoder();
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export interface WalletAuth {
  wallet: string;
  signMessage?: SignMessage;
}

export async function createWalletAuthHeaders(
  auth: WalletAuth,
  method: string,
  path: string
): Promise<Record<string, string>> {
  if (!auth.signMessage) {
    throw new Error('Wallet message signing is required for this action.');
  }

  const message = JSON.stringify({
    domain: 'ChainAchieve',
    method: method.toUpperCase(),
    path,
    wallet: auth.wallet,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  });
  const signature = await auth.signMessage(encoder.encode(message));

  return {
    'x-wallet': auth.wallet,
    'x-message': message,
    'x-signature': encodeBase58(signature),
  };
}

function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  for (const byte of bytes) {
    if (byte !== 0) break;
    digits.push(0);
  }

  return digits.reverse().map(digit => BASE58_ALPHABET[digit]).join('');
}
