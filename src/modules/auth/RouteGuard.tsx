"use client";

import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RouteGuard({ children }: { children: React.ReactNode }){
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.push('/signin'); return; }
      // fetch profile role
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setRole(profile?.role || null);
      setLoading(false);
    })();
  },[]);

  if (loading) return <div className="p-4 text-slate-200">Loading...</div>;

  return <div>{children}</div>;
}
