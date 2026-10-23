import Image from 'next/image';
import AuthPanel from '@/components/auth/AuthPanel';

export default function AdminLoginPage(){
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="flex flex-col items-center gap-3 mb-6">
        <Image
          src="/logo.png"
          alt="CortexDrive"
          width={64}
          height={64}
          className="w-16 h-16 rounded-full object-cover ring-1 ring-slate-700"
        />
        <div className="text-2xl font-bold text-white">CortexDrive</div>
      </div>
      <AuthPanel admin />
    </div>
  );
}