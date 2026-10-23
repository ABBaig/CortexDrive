'use client';
import BackButton from '@/components/BackButton';
import AuthPanel from '@/components/auth/AuthPanel';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';

export default function SignUpPage(){
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const locale = useLocale();

  useEffect(()=>{
    // The dashboard page is the single role dispatcher: it reads the user's
    // role server-side and renders the learner/instructor/admin/vendor
    // dashboard. So every successful sign-in goes there — never to
    // role-specific routes (those pages do not exist).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.push(`/${locale}/dashboard`);
      }
    });
    return () => subscription.unsubscribe();
  },[locale, router, supabase]);

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
      <AuthPanel mode="signup" />
    </div>
  );
}