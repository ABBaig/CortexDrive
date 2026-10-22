'use client';

import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SOSButton({ bookingId }:{ bookingId?:string }){
  const supabase = getSupabaseBrowserClient();
  const [state, setState] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function send(){
    setState('sending');
    setMsg(null);
    let lat: number | null = null;
    let lng: number | null = null;

    // attempt to get geo with short timeout but do not block the SOS insert
    const geoController = new AbortController();
    const geoPromise = new Promise<void>((resolve)=>{
      if (!navigator.geolocation) return resolve();
      const timer = setTimeout(()=>{ try{ geoController.abort(); }catch{}; resolve(); }, 4500);
      navigator.geolocation.getCurrentPosition((pos)=>{
        clearTimeout(timer);
        lat = pos.coords.latitude; lng = pos.coords.longitude; resolve();
      }, (_err)=>{ clearTimeout(timer); resolve(); }, { maximumAge: 0, timeout: 4500 });
    });

    try{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in');

      // insert immediately with null location so SOS is recorded without blocking
      const insertRes = await supabase.from('sos_logs').insert([{ user_id: user.id, lat: null, lng: null, note: 'SOS - initial', booking_id: bookingId || null }]);
      if (insertRes.error) throw insertRes.error;

      // when geo resolves within timeout, update the same row if possible by inserting another row with location
      geoPromise.then(async ()=>{
        if (lat != null && lng != null) {
          try{
            await supabase.from('sos_logs').insert([{ user_id: user.id, lat, lng, note: 'SOS - with location', booking_id: bookingId || null }]);
          }catch(e){ console.warn('Failed to insert location sos log', e); }
        }
      });

      setState('sent');
      setMsg('SOS sent');
    }catch(e:any){
      setState('error');
      setMsg(e.message || String(e));
    }
  }

  return (
    <div>
      <button onClick={send} disabled={state==='sending' || state==='sent'} className="w-full text-white bg-red-600 hover:bg-red-700 px-4 py-3 rounded font-bold">
        {state==='sent' ? 'EMERGENCY SOS SENT' : state==='sending' ? 'Sending...' : 'EMERGENCY SOS'}
      </button>
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </div>
  );
}
