import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletButton() {
  const { publicKey } = useWallet();
  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className="!bg-indigo-600 !rounded-lg !text-sm !py-2 !px-4" />
      {publicKey && (
        <span className="text-xs text-gray-500">
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
      )}
    </div>
  );
}
