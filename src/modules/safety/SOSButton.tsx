import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SOSButton({ bookingId }:{ bookingId?:string }){
  const supabase = createClientComponentClient();
  const [state, setState] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  async function send(){
    setState('sending');
    if (!navigator.geolocation) { setState('error'); return; }
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat = pos.coords.latitude; const lng = pos.coords.longitude;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState('error'); return; }
      const { error } = await supabase.from('sos_alerts').insert([{ user_id: user.id, lat, lng, booking_id: bookingId||null }]);
      if (error) { setState('error'); return; }
      setState('sent');
    }, ()=> setState('error'));
  }
  return (
    <div>
      <button onClick={send} disabled={state==='sending' || state==='sent'} style={{background:'red',color:'white',padding:10}}>{state==='sent' ? 'Alert sent' : 'SOS'}</button>
      {state==='sent' && <div>Alert sent — admin notified</div>}
      {state==='error' && <div>Failed to send alert</div>}
    </div>
  );
}
