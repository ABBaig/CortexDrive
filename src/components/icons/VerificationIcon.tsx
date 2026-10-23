import Image from 'next/image';

export default function VerificationIcon({ className = 'h-5 w-5' }: { className?: string }){
  return <Image src="/assets/icons/verification.svg" alt="verification" width={20} height={20} className={className} />;
}
