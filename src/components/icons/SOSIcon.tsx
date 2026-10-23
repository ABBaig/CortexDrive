import Image from 'next/image';

export default function SOSIcon({ className = 'h-5 w-5' }: { className?: string }){
  return <Image src="/assets/icons/sos.svg" alt="sos" width={20} height={20} className={className} />;
}
