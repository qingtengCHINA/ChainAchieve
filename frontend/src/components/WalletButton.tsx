import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletButton() {
  const { publicKey } = useWallet();
  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton
        style={{
          background: '#9fe870',
          color: '#163300',
          borderRadius: '9999px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          padding: '0 16px',
          height: '36px',
          lineHeight: '1',
          border: 'none',
          transition: 'transform 0.15s ease',
        }}
      />
      {publicKey && (
        <span className="hidden lg:block text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
      )}
    </div>
  );
}
