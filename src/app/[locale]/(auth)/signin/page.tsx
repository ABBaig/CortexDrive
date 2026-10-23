'use client';
import BackButton from '@/components/BackButton';
import AuthPanel from '@/components/auth/AuthPanel';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import Image from 'next/image';

export default function SignInPage(){
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  useEffect(()=>{
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
          const role = profile?.role || 'learner';
          if (role === 'admin') router.push('/en/admin');
          else if (role === 'vendor') router.push('/en/vendor');
          else if (role === 'instructor') router.push('/en/instructor');
          else router.push('/en/learner');
        } catch {
          router.push('/en/dashboard');
        }
      }
    });
    return () => subscription.unsubscribe();
  },[]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <BackButton />
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
      <AuthPanel />
    </div>
  );
}