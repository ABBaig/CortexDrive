"use client";

import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { useRouter } from 'next/navigation';

export default function SignInForm() {
  const supabase = getSupabaseBrowserClient();

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 rounded">
      <h2 className="text-2xl mb-4" style={{color:'var(--cd-primary)'}}>Sign in</h2>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      <label className="block mb-2">Email
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={email} onChange={e=>setEmail(e.target.value)} />
      </label>
      <label className="block mb-2">Password
        <input type="password" className="w-full p-2 mt-1 rounded bg-slate-800" value={password} onChange={e=>setPassword(e.target.value)} />
      </label>
      <button className="w-full p-2 mt-4 rounded bg-electric-cyan text-dark-slate" type="submit">Sign in</button>
    </form>
  );
}
