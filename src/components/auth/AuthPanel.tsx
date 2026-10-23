"use client";

import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';

type Mode = 'signin' | 'signup';
type AuthRole = 'learner' | 'instructor' | 'vendor';

/** Coerce any error value into a readable string (fixes red `{}` in UI). */
function toErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.msg === 'string' && e.msg) return e.msg;
    if (typeof e.error === 'string' && e.error) return e.error;
    try { return JSON.stringify(e); } catch { return 'An unexpected error occurred.'; }
  }
  return 'An unexpected error occurred.';
}

export default function AuthPanel({
  mode = 'signin',
  admin = false,
}: {
  mode?: Mode;
  admin?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const locale = useLocale();

  const [activeMode, setActiveMode] = useState<Mode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AuthRole>('learner');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // OTP verification step
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    if (activeMode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setBusy(true);
    try {
      if (activeMode === 'signup') {
        // The DB trigger handle_new_user creates the public.users profile row.
        // With email confirmation enabled in Supabase, this sends an OTP email.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim(), role } },
        });

        // If the user already exists, Supabase returns a fake "session" with no
        // identities — surface a friendly message instead of proceeding.
        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            setError('An account with this email already exists. Please sign in instead.');
            setActiveMode('signin');
            return;
          }
          setError(toErrorMessage(signUpError));
          return;
        }

        // Email confirmation required: redirect user to the OTP step.
        if (!data.session) {
          setAwaitingOtp(true);
          setInfo('A confirmation email with a 6-digit code has been sent to your email. Enter it below to verify your account.');
          return;
        }

        // Session granted immediately (email confirmation disabled): go to dashboard.
        router.push(`/${locale}/dashboard`);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.session) {
        setError(toErrorMessage(signInError) || 'Invalid email or password.');
        return;
      }
      if (admin) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', data.session.user.id)
          .maybeSingle();
        if (!adminRow) {
          await supabase.auth.signOut();
          setEmail('This account is not an admin.');
          return;
        }
        router.push(`/${locale}/admin`);
        return;
      }
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'signup',
      });
      if (verifyError) {
        setError(toErrorMessage(verifyError));
        return;
      }
      // OTP verified — user can now sign in with credentials.
      setAwaitingOtp(false);
      setOtp('');
      setActiveMode('signin');
      setInfo('Your email has been verified! Please sign in with your email and password.');
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900 text-slate-100 rounded border border-slate-800">
      <h2 className="text-2xl mb-4" style={{ color: 'var(--cd-primary)' }}>
        {admin ? 'Admin Login' : awaitingOtp ? 'Verify your email' : activeMode === 'signin' ? 'Sign in' : 'Create account'}
      </h2>

      {!admin && !awaitingOtp && (
        <div className="flex mb-4 rounded overflow-hidden border border-slate-700">
          <button
            type="button"
            onClick={() => { setActiveMode('signin'); setError(null); setInfo(null); }}
            className={`flex-1 px-4 py-2 text-sm ${activeMode === 'signin' ? 'bg-electric-cyan text-dark-slate' : 'bg-slate-800 text-slate-300'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('signup'); setError(null); setInfo(null); }}
            className={`flex-1 px-4 py-2 text-sm ${activeMode === 'signup' ? 'bg-electric-cyan text-dark-slate' : 'bg-slate-800 text-slate-300'}`}
          >
            Create account
          </button>
        </div>
      )}

      {error && <div className="mb-3 text-red-400 text-sm" role="alert">{error}</div>}
      {info && !error && <div className="mb-3 text-emerald-400 text-sm" role="status">{info}</div>}

      {awaitingOtp ? (
        <form onSubmit={handleVerifyOtp}>
          <label className="block mb-2 text-sm">Enter the 6-digit code sent to {email}
            <input
              className="w-full p-2 mt-1 rounded bg-slate-800 tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
          <button className="w-full p-2 mt-4 rounded bg-electric-cyan text-dark-slate disabled:opacity-50" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify code'}
          </button>
          <button
            type="button"
            className="w-full p-2 mt-2 rounded bg-slate-800 text-slate-300"
            onClick={() => { setAwaitingOtp(false); setInfo(null); setError(null); }}
          >
            Back
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
        {activeMode === 'signup' && (
          <>
            <label className="block mb-2 text-sm">Full name
              <input className="w-full p-2 mt-1 rounded bg-slate-800" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="block mb-2 text-sm">I am a
              <select className="w-full p-2 mt-1 rounded bg-slate-800" value={role} onChange={(e) => setRole(e.target.value as AuthRole)}>
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="vendor">Vendor</option>
              </select>
            </label>
          </>
        )}
        <label className="block mb-2 text-sm">Email
          <input className="w-full p-2 mt-1 rounded bg-slate-800" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block mb-2 text-sm">Password
          <input type="password" className="w-full p-2 mt-1 rounded bg-slate-800" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={activeMode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        <button className="w-full p-2 mt-4 rounded bg-electric-cyan text-dark-slate disabled:opacity-50" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : activeMode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      )}

      {!admin && !awaitingOtp && activeMode === 'signin' && (
        <p className="mt-4 text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <button type="button" className="underline" style={{ color: 'var(--cd-primary)' }} onClick={() => { setActiveMode('signup'); setError(null); setInfo(null); }}>
            Sign up
          </button>
        </p>
      )}
      {admin && (
        <p className="mt-4 text-sm text-slate-400">
          <Link className="underline" style={{ color: 'var(--cd-primary)' }} href={`/${locale}/signin`}>Back to user sign in</Link>
        </p>
      )}
    </div>
  );
}