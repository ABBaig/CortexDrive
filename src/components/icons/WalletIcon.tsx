import Image from 'next/image';

export default function WalletIcon({ className = 'h-5 w-5' }: { className?: string }){
  // Use inline SVG asset for consistent visuals instead of base64.
  return (
    <Image src="/assets/icons/wallet.svg" alt="wallet" width={20} height={20} className={className} />
  );
}
