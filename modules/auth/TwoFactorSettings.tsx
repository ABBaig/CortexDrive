"use client";

import React, { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

export default function TwoFactorSettings(){
  const supabase = createBrowserSupabaseClient();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function enroll(){
    const res = await supabase.auth.mfa.generateTOTP();
    if (res.error) { setMessage(res.error.message); return; }
    setQr(res.data?.qr_code || null);
    setSecret(res.data?.secret || null);
  }

  async function verify(){
    const res = await supabase.auth.mfa.totp.verify({ code });
    if (res.error) { setMessage(res.error.message); return; }
    setMessage('TOTP verified and enrolled');
  }

  async function listFactors(){
    const res = await supabase.auth.mfa.listFactors();
    if (res.error) { setMessage(res.error.message); return; }
    setMessage('Factors: ' + JSON.stringify(res.data));
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 rounded">
      <h3 className="text-xl" style={{color:'#22d3ee'}}>Two-Factor (TOTP)</h3>
      <div className="mt-2">
        <button className="p-2 rounded bg-teal-500 text-slate-900" onClick={enroll}>Enroll</button>
        <button className="p-2 rounded bg-slate-700 text-slate-100 ml-2" onClick={listFactors}>List factors</button>
      </div>
      {qr && <div className="mt-2"><img src={qr} alt="qr" /></div>}
      {secret && <div className="mt-2">Secret: {secret}</div>}
      <label className="block mt-2">Code
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={code} onChange={e=>setCode(e.target.value)} />
      </label>
      <button className="w-full p-2 mt-2 rounded bg-teal-500 text-slate-900" onClick={verify}>Verify</button>
      {message && <div className="mt-2 text-sm text-slate-200">{message}</div>}
    </div>
  );
}
