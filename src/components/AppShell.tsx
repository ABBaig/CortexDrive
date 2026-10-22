import React from 'react';
import LanguageSelector from './LanguageSelector';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }:{ children:React.ReactNode }){
  const supabase = getSupabaseBrowserClient();

  const router = useRouter();
  async function signOut(){
    await supabase.auth.signOut();
    router.push('/signin');
  }
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className="text-2xl font-bold" style={{color:'var(--cd-primary)'}}>CortexDrive</div>
        <div className="flex items-center gap-4">
          <LanguageSelector/>
          <button onClick={signOut} className="px-3 py-1 rounded bg-slate-800">Sign out</button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
