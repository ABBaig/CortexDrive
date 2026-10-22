'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocale } from 'next-intl';

export default function SOSPage(){
  const supabase = getSupabaseBrowserClient();
  const locale = useLocale();
  const [sending,setSending]=useState(false);
  const [events,setEvents]=useState<any[]>([]);

  useEffect(()=>{
    let sub: any;
    async function init(){
      // subscribe to realtime sos_logs
      sub = supabase.channel('public:sos_logs').on('postgres_changes',{event:'INSERT',schema:'public',table:'sos_logs'},payload=>{
        setEvents(e=>[payload.new,...e]);
      }).subscribe();
    }
    init();
    return ()=>{ if (sub) supabase.removeChannel(sub); }
  },[]);

  async function sendSOS(){
    setSending(true);
    try{
      const loc = await getLocation();
      const { data, error } = await supabase.from('sos_logs').insert([{ user_id: (await supabase.auth.getUser()).data.user?.id, lat: loc?.lat, lng: loc?.lng, note: 'SOS triggered from app' }]);
      if (error) throw error;
      alert('SOS sent');
    }catch(e:any){
      alert('Failed to send SOS: '+(e.message||String(e)));
    }finally{ setSending(false); }
  }

  function getLocation(): Promise<{lat:number,lng:number}|null>{
    return new Promise((res)=>{
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),()=>res(null),{timeout:5000});
    });
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">SOS</h1>
        <div className="mb-6">
          <button onClick={sendSOS} disabled={sending} className="w-full py-6 text-lg font-bold bg-red-600 text-white rounded shadow-lg hover:bg-red-700">
            {sending? 'Sending...' : 'EMERGENCY: Send SOS'}
          </button>
          <p className="text-sm text-neutral-400 mt-2">This will notify nearby instructors and admins in real-time.</p>
        </div>

        <div>
          <h2 className="text-xl mb-2">Recent SOS events</h2>
          <ul className="space-y-2">
            {events.map((ev,i)=> (
              <li key={i} className="p-3 bg-slate-800 rounded">
                <div className="text-sm text-neutral-400">User: {ev.user_id}</div>
                <div>Note: {ev.note}</div>
                <div className="text-sm text-neutral-400">At: {new Date(ev.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
