import Image from 'next/image';

export default function FuelIcon({ className = 'h-5 w-5' }: { className?: string }){
  return <Image src="/assets/icons/fuel.svg" alt="fuel" width={20} height={20} className={className} />;
}
